// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Ops-Key",
};

interface AlertItem {
  type: "rate_limit_spike" | "failure_spike";
  value: number;
  threshold: number;
  message: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function parseEnvInt(name: string, fallback: number): number {
  const value = Deno.env.get(name);
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const opsKey = Deno.env.get("OPS_MAINTENANCE_KEY") || "";
  const providedKey = req.headers.get("X-Ops-Key") || "";
  if (!opsKey || providedKey !== opsKey) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const retentionDays = parseEnvInt("ACCESS_LOG_RETENTION_DAYS", 90);
    const rateLimitSpikeThreshold = parseEnvInt("RATE_LIMIT_SPIKE_THRESHOLD", 50);
    const failureSpikeThreshold = parseEnvInt("FAILURE_SPIKE_THRESHOLD", 100);
    const warnings: string[] = [];

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const retentionCutoffIso = new Date(now - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const oneHourAgoIso = new Date(now - 60 * 60 * 1000).toISOString();

    const { data: expiredFiles, error: expiredFilesError } = await supabase
      .from("files")
      .select("id, stored_path")
      .not("expires_at", "is", null)
      .lte("expires_at", nowIso)
      .limit(500);

    if (expiredFilesError) {
      throw expiredFilesError;
    }

    const expiredFileIds = (expiredFiles || []).map((item) => item.id);
    const expiredPaths = (expiredFiles || [])
      .map((item) => item.stored_path)
      .filter((path) => Boolean(path));

    if (expiredPaths.length > 0) {
      await supabase.storage.from("files").remove(expiredPaths);
    }

    if (expiredFileIds.length > 0) {
      await supabase.from("access_logs").delete().in("file_id", expiredFileIds).throwOnError();
      await supabase.from("files").delete().in("id", expiredFileIds).throwOnError();
    }

    const { error: retentionError } = await supabase
      .from("access_logs")
      .delete()
      .lt("created_at", retentionCutoffIso);

    if (retentionError) {
      throw retentionError;
    }

    const { count: recentRateLimitedCount, error: recentRateLimitedError } = await supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .in("reason", ["rate_limited", "password_rate_limited"])
      .gte("created_at", oneHourAgoIso);

    if (recentRateLimitedError) {
      warnings.push("rate_limited_count_unavailable");
    }

    const { count: recentFailuresCount, error: recentFailuresError } = await supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", oneHourAgoIso);

    if (recentFailuresError) {
      warnings.push("failed_count_unavailable");
    }

    const rateLimitedCount = recentRateLimitedError ? 0 : (recentRateLimitedCount ?? 0);
    const failedCount = recentFailuresError ? 0 : (recentFailuresCount ?? 0);

    const alerts: AlertItem[] = [];
    if (rateLimitedCount >= rateLimitSpikeThreshold) {
      alerts.push({
        type: "rate_limit_spike",
        value: rateLimitedCount,
        threshold: rateLimitSpikeThreshold,
        message: "Rate-limited attempts exceeded threshold in last hour",
      });
    }

    if (failedCount >= failureSpikeThreshold) {
      alerts.push({
        type: "failure_spike",
        value: failedCount,
        threshold: failureSpikeThreshold,
        message: "Failed attempts exceeded threshold in last hour",
      });
    }

    return jsonResponse({
      success: true,
      summary: {
        expiredFilesDeleted: expiredFileIds.length,
        retentionCutoffIso,
        alerts,
        warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});

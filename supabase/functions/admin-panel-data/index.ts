// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AdminPanelRequest {
  tokenFilter?: string;
  userFilter?: string;
  ipFilter?: string;
  reasonFilter?: string;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function unauthorized(message = "Unauthorized") {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAdminUserIds(): string[] {
  const raw = Deno.env.get("ADMIN_USER_IDS") || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized("Missing authorization");
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return unauthorized();
    }

    const adminUserIds = getAdminUserIds();
    if (adminUserIds.length === 0 || !adminUserIds.includes(user.id)) {
      return unauthorized("Admin access not configured for this user");
    }

    const body = (await req.json()) as AdminPanelRequest;
    const tokenFilter = body.tokenFilter?.trim() || "";
    const userFilter = body.userFilter?.trim() || "";
    const ipFilter = body.ipFilter?.trim() || "";
    const reasonFilter = body.reasonFilter?.trim() || "";

    const { data: files, error: filesError } = await supabase
      .from("files")
      .select("id, user_id, original_name, token, expires_at, max_downloads, download_count, is_revoked, created_at, stored_path")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filesError) {
      throw filesError;
    }

    const fileTokenById: Record<string, string> = {};
    const fileUserById: Record<string, string> = {};
    const fileNameById: Record<string, string> = {};

    for (const row of files || []) {
      fileTokenById[row.id] = row.token;
      fileUserById[row.id] = row.user_id;
      fileNameById[row.id] = row.original_name;
    }

    const now = Date.now();
    const totalFiles = (files || []).length;
    const totalUsers = new Set((files || []).map((item) => item.user_id)).size;
    const totalDownloads = (files || []).reduce((sum, item) => sum + (item.download_count || 0), 0);

    const activeShares = (files || []).filter((item) => {
      if (item.is_revoked) return false;
      if (item.expires_at && new Date(item.expires_at).getTime() <= now) return false;
      if (item.max_downloads && item.download_count >= item.max_downloads) return false;
      return true;
    }).length;

    const expiredLinks = (files || []).filter((item) => {
      if (item.expires_at && new Date(item.expires_at).getTime() <= now) return true;
      if (item.max_downloads && item.download_count >= item.max_downloads) return true;
      return false;
    }).length;

    const revokedLinks = (files || []).filter((item) => item.is_revoked).length;

    const { data: logs, error: logsError } = await supabase
      .from("access_logs")
      .select("id, created_at, file_id, status, reason, ip_address")
      .order("created_at", { ascending: false })
      .limit(500);

    if (logsError) {
      throw logsError;
    }

    const enrichedLogs = (logs || []).map((entry) => ({
      ...entry,
      timestamp: entry.created_at,
      token: fileTokenById[entry.file_id] || "",
      user_id: fileUserById[entry.file_id] || "",
      original_name: fileNameById[entry.file_id] || "Unknown",
    }));

    const filteredFiles = (files || []).filter((item) => {
      const tokenMatch = !tokenFilter || item.token.toLowerCase().includes(tokenFilter.toLowerCase());
      const userMatch = !userFilter || item.user_id.toLowerCase().includes(userFilter.toLowerCase());
      return tokenMatch && userMatch;
    });

    const filteredLogs = enrichedLogs.filter((entry) => {
      const tokenMatch = !tokenFilter || entry.token.toLowerCase().includes(tokenFilter.toLowerCase());
      const userMatch = !userFilter || entry.user_id.toLowerCase().includes(userFilter.toLowerCase());
      const ipMatch = !ipFilter || (entry.ip_address || "").toLowerCase().includes(ipFilter.toLowerCase());
      const reasonMatch = !reasonFilter || (entry.reason || "").toLowerCase().includes(reasonFilter.toLowerCase());
      return tokenMatch && userMatch && ipMatch && reasonMatch;
    });

    const failedAttempts = enrichedLogs.filter((entry) => entry.status === "failed").length;
    const rateLimitedAttempts = enrichedLogs.filter(
      (entry) => entry.reason === "rate_limited" || entry.reason === "password_rate_limited",
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        metrics: {
          totalUsers,
          totalFiles,
          totalDownloads,
          failedAttempts,
          rateLimitedAttempts,
          activeShares,
          expiredLinks,
          revokedLinks,
        },
        files: filteredFiles,
        logs: filteredLogs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = normalizeErrorMessage(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

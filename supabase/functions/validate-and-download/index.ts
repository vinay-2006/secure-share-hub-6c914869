// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface ValidateDownloadRequest {
  fileId: string;
}

interface DownloadResponse {
  success: boolean;
  signedUrl?: string;
  error?: string;
  retryAfterSeconds?: number;
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_FAILED_ATTEMPTS = 5;

const COUNTRY_HEADER_KEYS = [
  "cf-ipcountry",
  "x-country-code",
  "x-geo-country",
] as const;

// Get IP from request context
function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

function normalizeCountryCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === "XX" || normalized === "UNKNOWN") {
    return null;
  }

  return normalized;
}

function readCountryFromHeaders(req: Request): string | null {
  for (const key of COUNTRY_HEADER_KEYS) {
    const value = normalizeCountryCode(req.headers.get(key));
    if (value) {
      return value;
    }
  }

  return null;
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "unknown" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("127.") ||
    ip.startsWith("::1")
  );
}

async function resolveCountryCode(req: Request, clientIp: string): Promise<string | null> {
  const fromHeaders = readCountryFromHeaders(req);
  if (fromHeaders) {
    return fromHeaders;
  }

  if (isPrivateIp(clientIp)) {
    return null;
  }

  try {
    const timeout = AbortSignal.timeout(700);
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(clientIp)}/country/`, {
      signal: timeout,
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    return normalizeCountryCode(text);
  } catch {
    return null;
  }
}

function getWindowStartIso(now: number): string {
  return new Date(now - RATE_LIMIT_WINDOW_MS).toISOString();
}

function getRetryAfterSeconds(oldestFailureAt: string, now: number): number {
  const elapsed = now - new Date(oldestFailureAt).getTime();
  const remaining = Math.max(1000, RATE_LIMIT_WINDOW_MS - elapsed);
  return Math.ceil(remaining / 1000);
}

function jsonResponse(payload: DownloadResponse, status: number, retryAfterSeconds?: number): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  if (retryAfterSeconds) {
    headers["Retry-After"] = String(retryAfterSeconds);
  }

  return new Response(JSON.stringify(payload), { status, headers });
}

async function isRateLimited(
  supabase: ReturnType<typeof createClient>,
  clientIp: string,
): Promise<{ limited: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();
  const windowStart = getWindowStartIso(now);

  const { data, error } = await supabase
    .from("access_logs")
    .select("created_at")
    .eq("status", "failed")
    .eq("ip_address", clientIp)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .limit(RATE_LIMIT_MAX_FAILED_ATTEMPTS);

  if (error) {
    throw error;
  }

  if (!data || data.length < RATE_LIMIT_MAX_FAILED_ATTEMPTS) {
    return { limited: false };
  }

  return {
    limited: true,
    retryAfterSeconds: getRetryAfterSeconds(data[0].created_at as string, now),
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as ValidateDownloadRequest;
    const { fileId } = body;

    if (!fileId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fileId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role (can bypass RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const clientIp = getClientIp(req);
    const geoCountry = await resolveCountryCode(req, clientIp);

    const rateLimit = await isRateLimited(supabase, clientIp);
    if (rateLimit.limited) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "rate_limited",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse(
        {
          success: false,
          error: "Too many failed attempts. Try again later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        429,
        rateLimit.retryAfterSeconds,
      );
    }

    // 1. Fetch file record
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("id, user_id, stored_path, is_revoked, expires_at, max_downloads, download_count")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      // Log failed access attempt
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "file_not_found",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse({ success: false, error: "File not found" }, 404);
    }

    // 2. Validate revocation status
    if (file.is_revoked) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "file_revoked",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse({ success: false, error: "File has been revoked" }, 403);
    }

    // 3. Validate expiry
    if (file.expires_at && new Date(file.expires_at).getTime() <= Date.now()) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "link_expired",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse({ success: false, error: "Share link has expired" }, 403);
    }

    // 4. Validate download limit
    if (
      file.max_downloads &&
      file.download_count &&
      file.download_count >= file.max_downloads
    ) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "download_limit_exceeded",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse({ success: false, error: "Download limit exceeded" }, 403);
    }

    // 5. Atomically increment download count and get signed URL
    // Use RPC call for transaction safety, or do it in two steps with optimistic locking
    const { data: updatedRows, error: updateError } = await supabase
      .from("files")
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq("id", fileId)
      // Optimistic lock: only update if download_count hasn't changed
      // This prevents race conditions where two concurrent requests both pass validation
      .eq("download_count", file.download_count || 0)
      .select("id");

    if (updateError || !updatedRows || updatedRows.length === 0) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "concurrent_download_detected",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      // Return conflict error; client should retry
      return jsonResponse({ success: false, error: "Concurrent download detected; please retry" }, 409);
    }

    // 6. Generate signed URL (60 second expiry)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from("files")
      .createSignedUrl(file.stored_path, 60); // 60 second expiry

    if (urlError || !signedUrl) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: fileId,
          status: "failed",
          reason: "url_generation_failed",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse({ success: false, error: "Failed to generate download URL" }, 500);
    }

    // 7. Log successful access
    await supabase
      .from("access_logs")
      .insert({
        file_id: fileId,
        status: "success",
        reason: "download_initiated",
        ip_address: clientIp,
        geo_country: geoCountry,
      })
      .throwOnError();

    // Return signed URL to client
    return jsonResponse(
      {
        success: true,
        signedUrl: signedUrl.signedUrl,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return jsonResponse({ success: false, error: message }, 500);
  }
});

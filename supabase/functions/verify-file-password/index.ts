// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { compare, hash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface VerifyPasswordRequest {
  fileId: string;
  password: string;
}

interface VerifyPasswordResponse {
  success: boolean;
  valid: boolean;
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

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

function jsonResponse(payload: VerifyPasswordResponse, status: number, retryAfterSeconds?: number): Response {
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
    .select("timestamp")
    .eq("status", "failed")
    .eq("ip_address", clientIp)
    .gte("timestamp", windowStart)
    .order("timestamp", { ascending: true })
    .limit(RATE_LIMIT_MAX_FAILED_ATTEMPTS);

  if (error) {
    throw error;
  }

  if (!data || data.length < RATE_LIMIT_MAX_FAILED_ATTEMPTS) {
    return { limited: false };
  }

  return {
    limited: true,
    retryAfterSeconds: getRetryAfterSeconds(data[0].timestamp as string, now),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, valid: false }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = (await req.json()) as VerifyPasswordRequest;
    const { fileId, password } = body;

    if (!fileId || !password) {
      return jsonResponse({ success: false, valid: false, error: "Missing fileId or password" }, 400);
    }

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
          reason: "password_rate_limited",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();

      return jsonResponse(
        {
          success: false,
          valid: false,
          error: "Too many failed attempts. Try again later.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        429,
        rateLimit.retryAfterSeconds,
      );
    }

    // Fetch file's password hash (if any)
    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("id, password_hash, hash_version")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      return jsonResponse({ success: false, valid: false, error: "File not found" }, 404);
    }

    // No password protection on this file
    if (!file.password_hash) {
      return jsonResponse({ success: true, valid: true }, 200);
    }

    const hashVersion = file.hash_version || "sha256";
    let isValid = false;

    if (hashVersion === "bcrypt") {
      isValid = await compare(password, file.password_hash);
    } else {
      const inputHash = await sha256(password);
      isValid = constantTimeEquals(inputHash, file.password_hash);

      if (isValid) {
        const migratedHash = await hash(password);
        await supabase
          .from("files")
          .update({
            password_hash: migratedHash,
            hash_version: "bcrypt",
          })
          .eq("id", file.id)
          .throwOnError();
      }
    }

    if (!isValid) {
      await supabase
        .from("access_logs")
        .insert({
          file_id: file.id,
          status: "failed",
          reason: "wrong_password",
          ip_address: clientIp,
          geo_country: geoCountry,
        })
        .throwOnError();
    }

    return jsonResponse(
      {
        success: true,
        valid: isValid,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, valid: false, error: message }, 500);
  }
});

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateShareMetadataRequest {
  originalName: string;
  storedPath: string;
  token: string;
  expiresAt: string | null;
  maxDownloads: number | null;
  password: string | null;
  encryptionEnabled?: boolean;
  encryptionIv?: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as CreateShareMetadataRequest;

    if (!body.originalName || !body.storedPath || !body.token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasPassword = Boolean(body.password && body.password.trim().length > 0);
    const passwordHash = hasPassword ? await bcrypt.hash(body.password as string, 10) : null;
    const encryptionEnabled = Boolean(body.encryptionEnabled);

    const { error: insertError } = await supabase
      .from("files")
      .insert({
        user_id: user.id,
        original_name: body.originalName,
        stored_path: body.storedPath,
        token: body.token,
        expires_at: body.expiresAt,
        max_downloads: body.maxDownloads,
        password_hash: passwordHash,
        hash_version: hasPassword ? "bcrypt" : null,
        encryption_enabled: encryptionEnabled,
        encryption_iv: encryptionEnabled ? body.encryptionIv || null : null,
        download_count: 0,
        is_revoked: false,
      })
      .throwOnError();

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: "Unable to save metadata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

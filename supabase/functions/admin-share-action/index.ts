// @ts-nocheck
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface AdminShareActionRequest {
  fileId: string;
  action: "revoke" | "extend" | "reset_download_count" | "delete";
  extendDays?: number;
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

    const body = (await req.json()) as AdminShareActionRequest;

    if (!body.fileId || !body.action) {
      return new Response(JSON.stringify({ success: false, error: "Missing fileId or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("id, expires_at, stored_path")
      .eq("id", body.fileId)
      .single();

    if (fileError || !file) {
      return new Response(JSON.stringify({ success: false, error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "revoke") {
      await supabase.from("files").update({ is_revoked: true }).eq("id", body.fileId).throwOnError();
    }

    if (body.action === "extend") {
      const extendDays = body.extendDays && body.extendDays > 0 ? body.extendDays : 7;
      const baseTime = file.expires_at ? new Date(file.expires_at).getTime() : Date.now();
      const newExpiry = new Date(Math.max(baseTime, Date.now()));
      newExpiry.setDate(newExpiry.getDate() + extendDays);

      await supabase
        .from("files")
        .update({ expires_at: newExpiry.toISOString() })
        .eq("id", body.fileId)
        .throwOnError();
    }

    if (body.action === "reset_download_count") {
      await supabase
        .from("files")
        .update({ download_count: 0 })
        .eq("id", body.fileId)
        .throwOnError();
    }

    if (body.action === "delete") {
      if (file.stored_path) {
        await supabase.storage.from("files").remove([file.stored_path]);
      }
      await supabase.from("files").delete().eq("id", body.fileId).throwOnError();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

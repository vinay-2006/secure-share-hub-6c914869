import { supabase } from "@/lib/supabase";

export async function logAccess(
  fileId: string,
  status: string,
  reason: string
) {
  try {
    await supabase.from("access_logs").insert({
      file_id: fileId,
      status,
      reason,
      ip_address: null, // Can improve later with edge functions
    });
  } catch (err) {
    console.error("Logging failed:", err);
  }
}

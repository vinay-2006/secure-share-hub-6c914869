import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

interface FileRecord {
  id: string;
  original_name: string;
  token: string;
  is_revoked: boolean;
}

export default function ShareResult() {
  const { token } = useParams();

  const [fileData, setFileData] = useState<FileRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");

  const link = `${window.location.origin}/download/${token}`;

  useEffect(() => {
    const fetchFile = async () => {
      if (!token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("files")
        .select("id, original_name, token, is_revoked")
        .eq("token", token)
        .single();

      if (fetchError || !data) {
        setError("Share not found or not accessible");
        setLoading(false);
        return;
      }

      setFileData(data);
      setLoading(false);
    };

    fetchFile();
  }, [token]);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!fileData || revoking) return;

    setRevoking(true);
    setError("");

    const { error: revokeError } = await supabase
      .from("files")
      .update({ is_revoked: true })
      .eq("id", fileData.id)
      .eq("is_revoked", false);

    if (revokeError) {
      setError("Unable to revoke link");
      setRevoking(false);
      return;
    }

    setFileData({ ...fileData, is_revoked: true });
    setRevoking(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!fileData || error) {
    return <div className="p-8 text-center">{error || "File not found"}</div>;
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {fileData.original_name}
          </h2>
          <StatusBadge
            status={fileData.is_revoked ? "revoked" : "active"}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Secure Link
          </label>
          <div className="flex gap-2">
            <Input value={link} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!fileData.is_revoked && (
          <Button
            variant="outline"
            className="w-full border-destructive/30 text-destructive"
            onClick={handleRevoke}
            disabled={revoking}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {revoking ? "Revoking..." : "Revoke Link"}
          </Button>
        )}
      </div>
    </div>
  );
}

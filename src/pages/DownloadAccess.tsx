import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionMock";

interface FileRecord {
  id: string;
  original_name: string;
  stored_path: string;
  token: string;
  expires_at: string | null;
  max_downloads: number | null;
  download_count: number;
  password_hash: string | null;
  is_revoked: boolean;
  encryption_enabled: boolean;
  encryption_iv: string | null;
}

interface EdgeFunctionResponse {
  success: boolean;
  valid?: boolean;
  signedUrl?: string;
  error?: string;
  retryAfterSeconds?: number;
}

const MAX_CONFLICT_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function downloadAndDecryptFile(
  signedUrl: string,
  originalName: string,
  secret: string,
  ivBase64: string,
): Promise<void> {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error("Unable to fetch encrypted file");
  }

  const encryptedData = await response.arrayBuffer();
  const key = await deriveAesKey(secret);
  const iv = fromBase64(ivBase64);

  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData,
  );

  const blob = new Blob([decryptedData], { type: "application/octet-stream" });
  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = originalName;
  anchor.click();

  URL.revokeObjectURL(blobUrl);
}

type AccessState = {
  status: "active" | "expired" | "revoked";
};

function evaluateAccess(file: FileRecord): AccessState {
  if (file.is_revoked) {
    return { status: "revoked" };
  }

  if (file.expires_at && new Date(file.expires_at).getTime() <= Date.now()) {
    return { status: "expired" };
  }

  if (file.max_downloads && file.download_count >= file.max_downloads) {
    return { status: "expired" };
  }

  return { status: "active" };
}

export default function DownloadAccess() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fileData, setFileData] = useState<FileRecord | null>(null);
  const [password, setPassword] = useState("");
  const [decryptionKey, setDecryptionKey] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"active" | "expired" | "revoked">("active");
  const [downloaded, setDownloaded] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const requiresPassword = useMemo(() => Boolean(fileData?.password_hash), [fileData]);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownRemaining((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldownRemaining]);

  useEffect(() => {
    let cancelled = false;

    const fetchFileByToken = async () => {
      if (!token) {
        if (!cancelled) {
          setError("Invalid or expired link");
          setLoading(false);
        }
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("files")
        .select("id, original_name, token, expires_at, max_downloads, download_count, password_hash, is_revoked, stored_path, encryption_enabled, encryption_iv")
        .eq("token", token)
        .single();

      if (cancelled) return;

      if (fetchError || !data) {
        setError("Invalid or expired link");
        setLoading(false);
        return;
      }

      const validated = evaluateAccess(data);
      setFileData(data);
      setStatus(validated.status);
      setLoading(false);
    };

    fetchFileByToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleDownload = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fileData) return;
    if (cooldownRemaining > 0) return;

    setSubmitting(true);
    setError("");

    try {
      // 1. Verify password if required
      if (fileData.password_hash) {
        if (!password) {
          setError("Password required");
          setSubmitting(false);
          return;
        }

        const verifyRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-file-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileId: fileData.id,
              password,
            }),
          }
        );

        if (!verifyRes.ok && verifyRes.status !== 429) {
          // Handle Edge Function not deployed
          if (verifyRes.status === 404 || verifyRes.status === 0) {
            setError(getEdgeFunctionErrorMessage('verify-file-password'));
          } else {
            setError(`Server error: ${verifyRes.status}. Please try again later.`);
          }
          setSubmitting(false);
          return;
        }

        const verifyData = (await verifyRes.json()) as EdgeFunctionResponse;

        if (verifyRes.status === 429) {
          const wait = verifyData.retryAfterSeconds ?? 60;
          setCooldownRemaining(wait);
          setError(`Too many attempts. Try again in ${wait} seconds.`);
          setSubmitting(false);
          return;
        }

        if (!verifyData.success || !verifyData.valid) {
          setError("Incorrect password");
          setSubmitting(false);
          return;
        }
      }

      if (fileData.encryption_enabled) {
        if (!decryptionKey.trim()) {
          setError("Decryption key required");
          setSubmitting(false);
          return;
        }

        if (!fileData.encryption_iv) {
          setError("Encryption metadata is missing");
          setSubmitting(false);
          return;
        }
      }

      // 2. Call Edge Function to atomically validate and get signed URL
      let validateRes: Response | null = null;
      for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt += 1) {
        try {
          validateRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-and-download`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileId: fileData.id }),
            }
          );
        } catch (fetchErr: unknown) {
          // Handle network errors
          const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Network error';
          if (attempt === MAX_CONFLICT_RETRIES) {
            setError(`Network error: ${errMsg}. ${getEdgeFunctionErrorMessage('validate-and-download')}`);
            setSubmitting(false);
            return;
          }
        }

        if (validateRes && validateRes.status !== 409 && validateRes.status !== 0) {
          break;
        }

        if (attempt === MAX_CONFLICT_RETRIES) {
          if (validateRes?.status === 0 || !validateRes) {
            setError(getEdgeFunctionErrorMessage('validate-and-download'));
          } else {
            setError("Please retry download");
          }
          setSubmitting(false);
          return;
        }

        const jitterMs = Math.floor(Math.random() * 100);
        const backoffMs = RETRY_BASE_DELAY_MS * 2 ** attempt + jitterMs;
        await sleep(backoffMs);
      }

      if (!validateRes) {
        setError("Unable to download file");
        setSubmitting(false);
        return;
      }

      if (validateRes.status === 429) {
        const limitedData = (await validateRes.json()) as EdgeFunctionResponse;
        const wait = limitedData.retryAfterSeconds ?? 60;
        setCooldownRemaining(wait);
        setError(`Too many attempts. Try again in ${wait} seconds.`);
        setSubmitting(false);
        return;
      }

      const downloadData = (await validateRes.json()) as EdgeFunctionResponse;

      if (!downloadData.success || !downloadData.signedUrl) {
        setError(downloadData.error || "Unable to download file");
        setSubmitting(false);
        return;
      }

      // 3. Redirect to signed URL (or decrypt locally if encrypted)
      setDownloaded(true);
      if (!fileData.encryption_enabled) {
        window.location.href = downloadData.signedUrl;
      } else {
        await downloadAndDecryptFile(
          downloadData.signedUrl,
          fileData.original_name,
          decryptionKey,
          fileData.encryption_iv as string,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed";
      
      // Provide helpful error messages for common issues
      if (message.includes('Failed to fetch') || message.includes('404')) {
        setError(getEdgeFunctionErrorMessage('validate-and-download'));
      } else if (message.includes('Network') || message.includes('CORS')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(message);
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!fileData) {
    return <div className="p-8 text-center">{error || "Invalid or expired link"}</div>;
  }

  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold">{fileData.original_name}</h1>
          <StatusBadge status={status} />
        </div>

        <p className="text-sm text-muted-foreground">
          Secure download validated server-side with atomic download counting.
        </p>

        <form onSubmit={handleDownload} className="space-y-4">
          {requiresPassword && status === "active" && (
            <div className="space-y-2">
              <Label htmlFor="download-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="download-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
            </div>
          )}

          {fileData.encryption_enabled && status === "active" && (
            <div className="space-y-2">
              <Label htmlFor="decryption-key" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Decryption Key
              </Label>
              <Input
                id="decryption-key"
                type="password"
                value={decryptionKey}
                onChange={(event) => setDecryptionKey(event.target.value)}
                placeholder="Enter decryption key"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {cooldownRemaining > 0 && (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              Rate limit active. You can retry in {cooldownRemaining}s.
            </div>
          )}

          {downloaded && !error && (
            <div className="rounded-md border border-green-300/30 bg-green-100/10 px-3 py-2 text-sm text-green-600">
              Download started.
            </div>
          )}

          <Button
            type="submit"
            disabled={status !== "active" || submitting || cooldownRemaining > 0}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {submitting
              ? "Preparing download..."
              : cooldownRemaining > 0
                ? `Retry in ${cooldownRemaining}s`
                : "Download File"}
          </Button>
        </form>
      </div>
    </div>
  );
}
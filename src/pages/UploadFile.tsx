import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionMock";

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

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

async function encryptFileContent(file: File, secret: string): Promise<{ encryptedFile: File; ivBase64: string }> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer,
  );

  const encryptedFile = new File([encrypted], `${file.name}.enc`, {
    type: "application/octet-stream",
  });

  return {
    encryptedFile,
    ivBase64: toBase64(iv),
  };
}

function calculateExpiry(value: string): string | null {
  if (!value) return null;

  const now = new Date();

  switch (value) {
    case "1h":
      now.setHours(now.getHours() + 1);
      break;
    case "24h":
      now.setHours(now.getHours() + 24);
      break;
    case "3d":
      now.setDate(now.getDate() + 3);
      break;
    case "7d":
      now.setDate(now.getDate() + 7);
      break;
    default:
      return null;
  }

  return now.toISOString();
}

export default function UploadFile() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState("");
  const [downloadLimit, setDownloadLimit] = useState("10");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [encrypted, setEncrypted] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert("No file selected");
      return;
    }

    if (encrypted && !encryptionKey.trim()) {
      alert("Encryption key is required when encryption is enabled");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Not authenticated");
        setLoading(false);
        return;
      }

      // Secure token generation
      const token = crypto.randomUUID();

      let fileToUpload: File = file;
      let encryptionIv: string | null = null;

      if (encrypted) {
        const encryptedPayload = await encryptFileContent(file, encryptionKey);
        fileToUpload = encryptedPayload.encryptedFile;
        encryptionIv = encryptedPayload.ivBase64;
      }

      // Organize storage by user folder
      const storedPath = `${user.id}/${token}-${fileToUpload.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(storedPath, fileToUpload);

      if (uploadError) {
        alert(uploadError.message);
        setLoading(false);
        return;
      }

      // Calculate expiry timestamp
      const expiresAt = calculateExpiry(expiry);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        alert("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      // Insert metadata through server-side edge function (bcrypt hashing happens server-side)
      const metadataRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-share-metadata`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            originalName: file.name,
            storedPath,
            token,
            expiresAt,
            maxDownloads: Number.isNaN(parseInt(downloadLimit, 10)) ? null : parseInt(downloadLimit, 10),
            password: passwordProtected ? password : null,
            encryptionEnabled: encrypted,
            encryptionIv,
          }),
        }
      );

      const metadataResult = (await metadataRes.json()) as { success: boolean; error?: string };

      if (!metadataRes.ok || !metadataResult.success) {
        const errorMsg = metadataResult.error || "Unable to save file metadata";
        
        // Check if this is an Edge Function deployment issue
        if (metadataRes.status === 404 || errorMsg.toLowerCase().includes('not found')) {
          alert(getEdgeFunctionErrorMessage('create-share-metadata'));
        } else {
          alert(errorMsg);
        }
        setLoading(false);
        return;
      }

      // Redirect to share page
      navigate(`/share-result/${token}`);

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      
      // Provide helpful error messages for common issues
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('404')) {
        alert(getEdgeFunctionErrorMessage('create-share-metadata'));
      } else if (errorMsg.includes('auth') || errorMsg.includes('unauthorized')) {
        alert('Authentication error. Please login again.');
      } else if (errorMsg.includes('Network') || errorMsg.includes('CORS')) {
        alert('Network error. Please check your internet connection and try again.');
      } else {
        alert(`Upload failed: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Choose File</Label>
          <Input type="file" onChange={handleFileInput} required />
        </div>

        <div className="space-y-2">
          <Label>Link Expiry</Label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger>
              <SelectValue placeholder="Select expiry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="3d">3 Days</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Download Limit</Label>
          <Input
            type="number"
            min="1"
            value={downloadLimit}
            onChange={(e) => setDownloadLimit(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Password Protection</Label>
          <Switch
            checked={passwordProtected}
            onCheckedChange={setPasswordProtected}
          />
        </div>

        {passwordProtected && (
          <Input
            type="password"
            placeholder="Set password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        <div className="flex items-center justify-between">
          <Label>Client-Side Encryption</Label>
          <Switch checked={encrypted} onCheckedChange={setEncrypted} />
        </div>

        {encrypted && (
          <Input
            type="password"
            placeholder="Encryption key (not stored on server)"
            value={encryptionKey}
            onChange={(e) => setEncryptionKey(e.target.value)}
          />
        )}

        <Button type="submit" disabled={!file || loading}>
          <Upload className="mr-2 h-4 w-4" />
          {loading ? "Uploading..." : "Upload & Generate Link"}
        </Button>
      </form>
    </div>
  );
}

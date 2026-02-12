import { useState } from "react";
import { Download, Lock, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function DownloadAccess() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const isPasswordProtected = true;
  const isEncrypted = true;
  const fileName = "Q4-Financial-Report.pdf";

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPasswordProtected && !password) {
      setError("Password is required to access this file");
      return;
    }
    setError("");
    setDownloaded(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Lock className="h-5 w-5 text-accent-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Secure File Access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You've been sent a secure file
            </p>
          </div>

          {/* File info */}
          <div className="mb-6 rounded-md bg-muted p-4">
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">2.4 MB · Shared Feb 10, 2026</p>
          </div>

          {isEncrypted && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-accent/50 p-3">
              <Shield className="mt-0.5 h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-foreground">
                This file is encrypted. It will be decrypted in your browser after download.
              </p>
            </div>
          )}

          {downloaded ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm font-medium text-foreground">Download started</p>
              <p className="text-xs text-muted-foreground">File is being decrypted and downloaded</p>
            </div>
          ) : (
            <form onSubmit={handleDownload} className="space-y-4">
              {isPasswordProtected && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Enter Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by VaultLink · Secure File Exchange
        </p>
      </div>
    </div>
  );
}

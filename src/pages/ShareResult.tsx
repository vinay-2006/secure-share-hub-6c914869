import { useState } from "react";
import { Copy, Check, Calendar, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

export default function ShareResult() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"active" | "revoked">("active");
  const link = "https://vault.link/s/aB3kX9mN";

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Share Link Generated</h1>
        <p className="page-description">Your file is ready to share securely</p>
      </div>

      <div className="mx-auto max-w-lg">
        <div className="rounded-lg border border-border bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Q4-Financial-Report.pdf</h2>
            <StatusBadge status={status} />
          </div>

          {/* Link field */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Secure Link</label>
            <div className="flex gap-2">
              <Input value={link} readOnly className="bg-muted font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Expires
              </div>
              <p className="text-sm font-medium text-foreground">Feb 13, 2026 2:30 PM</p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Download className="h-3 w-3" />
                Download Limit
              </div>
              <p className="text-sm font-medium text-foreground">3 / 10</p>
            </div>
          </div>

          {/* Revoke */}
          {status === "active" && (
            <Button
              variant="outline"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setStatus("revoked")}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Revoke Link
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

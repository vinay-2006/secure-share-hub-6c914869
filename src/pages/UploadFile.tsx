import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Clock, Download, Lock, Shield, FileUp } from "lucide-react";
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

export default function UploadFile() {
  const navigate = useNavigate();
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [encrypted, setEncrypted] = useState(false);
  const [fileName, setFileName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [downloadLimit, setDownloadLimit] = useState("10");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/share-result");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload File</h1>
        <p className="page-description">Share files securely with expiry controls and encryption</p>
      </div>

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drop zone */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragActive
                ? "border-primary bg-accent"
                : "border-border hover:border-muted-foreground/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileInput}
            />
            <FileUp className="mb-3 h-8 w-8 text-muted-foreground" />
            {fileName ? (
              <p className="text-sm font-medium text-foreground">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Drop your file here, or{" "}
                  <span className="text-primary">browse</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum file size: 100 MB
                </p>
              </>
            )}
          </div>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Link Expiry
              </Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Select expiry" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                Download Limit
              </Label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={downloadLimit}
                onChange={(e) => setDownloadLimit(e.target.value)}
                className="bg-card"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Password Protection</p>
                  <p className="text-xs text-muted-foreground">Require a password to download</p>
                </div>
              </div>
              <Switch checked={passwordProtected} onCheckedChange={setPasswordProtected} />
            </div>

            {passwordProtected && (
              <div className="pl-7">
                <Input type="password" placeholder="Set a password" className="max-w-xs bg-background" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Client-Side Encryption</p>
                  <p className="text-xs text-muted-foreground">Encrypt file before upload</p>
                </div>
              </div>
              <Switch checked={encrypted} onCheckedChange={setEncrypted} />
            </div>
          </div>

          {/* Policy preview */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Policy Summary</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Expires: {expiry || "Not set"}</li>
              <li>• Max downloads: {downloadLimit}</li>
              <li>• Password: {passwordProtected ? "Enabled" : "Disabled"}</li>
              <li>• Encryption: {encrypted ? "Enabled" : "Disabled"}</li>
            </ul>
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={!fileName}>
            <Upload className="mr-2 h-4 w-4" />
            Upload & Generate Link
          </Button>
        </form>
      </div>
    </div>
  );
}

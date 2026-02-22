import { useEffect, useMemo, useState } from "react";
import { Search, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";

interface AccessLog {
  id: string;
  timestamp: string;
  file_id: string;
  status: "success" | "failed";
  reason: string | null;
  ip_address: string | null;
  geo_country: string | null;
  files?: { original_name: string } | Array<{ original_name: string }> | null;
}

type ReasonFilter = "all" | "rate_limited" | "password_rate_limited" | "other";
type SuspiciousFilter = "all" | "suspicious" | "normal";

function isSuspiciousBehavior(log: AccessLog): boolean {
  return (
    log.reason === "rate_limited" ||
    log.reason === "password_rate_limited" ||
    log.reason === "wrong_password"
  );
}

function getFileName(files: AccessLog["files"]): string {
  if (!files) {
    return "Unknown";
  }

  if (Array.isArray(files)) {
    return files[0]?.original_name || "Unknown";
  }

  return files.original_name || "Unknown";
}

function getReasonLabel(reason: string | null): string {
  if (!reason) {
    return "—";
  }

  const labels: Record<string, string> = {
    rate_limited: "Rate limited",
    password_rate_limited: "Password rate limited",
    wrong_password: "Wrong password",
    file_revoked: "Revoked",
    link_expired: "Expired",
    download_limit_exceeded: "Limit exceeded",
    concurrent_download_detected: "Concurrent download",
    download_initiated: "Download started",
  };

  return labels[reason] || reason.split("_").join(" ");
}

export default function AccessLogs() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("all");
  const [suspiciousFilter, setSuspiciousFilter] = useState<SuspiciousFilter>("all");
  const [fileFilter, setFileFilter] = useState("");
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Unable to load logs. Please log in again.");
        setLoading(false);
        return;
      }

      const { data, error: logsError } = await supabase
        .from("access_logs")
        .select(`id, timestamp, file_id, status, reason, ip_address, geo_country, files(original_name)`)
        .order("timestamp", { ascending: false })
        .limit(100);

      if (logsError) {
        setError("Unable to load access logs.");
        setLoading(false);
        return;
      }

      setLogs((data || []) as AccessLog[]);
      setLoading(false);
    };

    loadLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchStatus = statusFilter === "all" || log.status === statusFilter;
      const fileName = getFileName(log.files);
      const matchFile = fileName.toLowerCase().includes(fileFilter.toLowerCase());

      const isRateLimitedReason =
        log.reason === "rate_limited" || log.reason === "password_rate_limited";

      const matchReason =
        reasonFilter === "all" ||
        (reasonFilter === "rate_limited" && log.reason === "rate_limited") ||
        (reasonFilter === "password_rate_limited" && log.reason === "password_rate_limited") ||
        (reasonFilter === "other" && !isRateLimitedReason);

      const isSuspicious = isSuspiciousBehavior(log);
      const matchSuspicious =
        suspiciousFilter === "all" ||
        (suspiciousFilter === "suspicious" && isSuspicious) ||
        (suspiciousFilter === "normal" && !isSuspicious);

      return matchStatus && matchFile && matchReason && matchSuspicious;
    });
  }, [statusFilter, reasonFilter, suspiciousFilter, fileFilter, logs]);

  const formatTimestamp = (t: string) =>
    new Date(t).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Access Logs</h1>
        <p className="page-description">Monitor all file access attempts</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by file..."
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reasonFilter} onValueChange={(value: ReasonFilter) => setReasonFilter(value)}>
          <SelectTrigger className="w-52 bg-card">
            <SelectValue placeholder="Reason" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All reasons</SelectItem>
            <SelectItem value="rate_limited">Rate limited</SelectItem>
            <SelectItem value="password_rate_limited">Password rate limited</SelectItem>
            <SelectItem value="other">Other reasons</SelectItem>
          </SelectContent>
        </Select>

        <Select value={suspiciousFilter} onValueChange={(value: SuspiciousFilter) => setSuspiciousFilter(value)}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Behavior" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All behavior</SelectItem>
            <SelectItem value="suspicious">Suspicious</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>File Name</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Geo</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground">
                  Loading logs...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground">
                  No access logs found.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((log) => {
                const fileName = getFileName(log.files);
                const reasonLabel = getReasonLabel(log.reason);
                const isRateLimitedReason =
                  log.reason === "rate_limited" || log.reason === "password_rate_limited";

                return (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="font-medium">{fileName}</td>
                    <td className="font-mono text-xs">{log.ip_address || "—"}</td>
                    <td>
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="text-xs text-muted-foreground">
                      <span className={isRateLimitedReason ? "font-medium" : undefined}>
                        {reasonLabel}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {log.geo_country || "—"}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            1
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

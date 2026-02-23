import { useEffect, useMemo, useState } from "react";
import { Share2, AlertTriangle, XCircle, ShieldAlert, Download, Clock, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionMock";

type ShareStatus = "active" | "expired" | "revoked";

interface AdminFileRow {
  id: string;
  user_id: string;
  original_name: string;
  token: string;
  expires_at: string | null;
  max_downloads: number | null;
  download_count: number;
  is_revoked: boolean;
  created_at: string;
}

interface AdminLogRow {
  id: string;
  timestamp: string;
  file_id: string;
  status: "success" | "failed";
  reason: string | null;
  ip_address: string | null;
  token: string;
  user_id: string;
  original_name: string;
}

interface AdminMetrics {
  totalUsers: number;
  totalFiles: number;
  totalDownloads: number;
  failedAttempts: number;
  rateLimitedAttempts: number;
  activeShares: number;
  expiredLinks: number;
  revokedLinks: number;
}

const defaultMetrics: AdminMetrics = {
  totalUsers: 0,
  totalFiles: 0,
  totalDownloads: 0,
  failedAttempts: 0,
  rateLimitedAttempts: 0,
  activeShares: 0,
  expiredLinks: 0,
  revokedLinks: 0,
};

function getShareStatus(row: AdminFileRow): ShareStatus {
  if (row.is_revoked) return "revoked";
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return "expired";
  if (row.max_downloads && row.download_count >= row.max_downloads) return "expired";
  return "active";
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<AdminMetrics>(defaultMetrics);
  const [files, setFiles] = useState<AdminFileRow[]>([]);
  const [logs, setLogs] = useState<AdminLogRow[]>([]);

  const [tokenFilter, setTokenFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const loadAdminData = async () => {
    setLoading(true);
    setError("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setError("Session expired. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-panel-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tokenFilter, userFilter, ipFilter, reasonFilter }),
      });

      if (!response.ok && response.status === 404) {
        setError(getEdgeFunctionErrorMessage('admin-panel-data'));
        setLoading(false);
        return;
      }

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        message?: string;
        metrics?: AdminMetrics;
        files?: AdminFileRow[];
        logs?: AdminLogRow[];
      };

      if (!response.ok || !result.success) {
        const backendError = result.error || result.message;
        if (backendError) {
          setError(backendError);
        } else {
          setError(`Unable to load admin data (HTTP ${response.status})`);
        }
        setLoading(false);
        return;
      }

      setMetrics(result.metrics || defaultMetrics);
      setFiles(result.files || []);
      setLogs(result.logs || []);
      setLoading(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      if (errMsg.includes('Failed to fetch')) {
        setError(getEdgeFunctionErrorMessage('admin-panel-data'));
      } else {
        setError(`Error loading admin data: ${errMsg}`);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metricCards = useMemo(
    () => [
      { label: "Total Users", value: metrics.totalUsers, icon: Share2, color: "text-success" },
      { label: "Total Files", value: metrics.totalFiles, icon: Clock, color: "text-warning" },
      { label: "Failed Attempts", value: metrics.failedAttempts, icon: ShieldAlert, color: "text-destructive" },
      { label: "Rate Limited", value: metrics.rateLimitedAttempts, icon: XCircle, color: "text-destructive" },
    ],
    [metrics]
  );

  const handleAdminAction = async (
    fileId: string,
    action: "revoke" | "extend" | "reset_download_count" | "delete"
  ) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setError("Session expired. Please login again.");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-share-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ fileId, action }),
      });

      if (!response.ok && response.status === 404) {
        setError(getEdgeFunctionErrorMessage('admin-share-action'));
        return;
      }

      const result = (await response.json()) as { success: boolean; error?: string; message?: string };
      if (!response.ok || !result.success) {
        const backendError = result.error || result.message;
        if (backendError) {
          setError(backendError);
        } else {
          setError(`Action failed (HTTP ${response.status})`);
        }
        return;
      }

      await loadAdminData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Action failed';
      if (errMsg.includes('Failed to fetch')) {
        setError(getEdgeFunctionErrorMessage('admin-share-action'));
      } else {
        setError(`Error: ${errMsg}`);
      }
    }
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-description">System-wide overview and management</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-3.5 w-3.5" />
          Export Logs
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4 mb-6">
        <Input
          placeholder="Filter token"
          value={tokenFilter}
          onChange={(event) => setTokenFilter(event.target.value)}
        />
        <Input
          placeholder="Filter user"
          value={userFilter}
          onChange={(event) => setUserFilter(event.target.value)}
        />
        <Input
          placeholder="Filter IP"
          value={ipFilter}
          onChange={(event) => setIpFilter(event.target.value)}
        />
        <Input
          placeholder="Filter reason"
          value={reasonFilter}
          onChange={(event) => setReasonFilter(event.target.value)}
        />
      </div>

      <div className="mb-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={loadAdminData} disabled={loading}>
          {loading ? "Loading..." : "Apply Filters"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metricCards.map((m) => (
          <div key={m.label} className="metric-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-secondary ${m.color}`}>
                <m.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground tracking-tight">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">All Files</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Created</th>
                <th>Downloads</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.original_name}</td>
                  <td>{formatDate(s.created_at)}</td>
                  <td>
                    {s.download_count}/{s.max_downloads ?? "∞"}
                  </td>
                  <td><StatusBadge status={getShareStatus(s)} /></td>
                  <td>
                    <div className="flex gap-1">
                      {getShareStatus(s) === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleAdminAction(s.id, "revoke")}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleAdminAction(s.id, "extend")}>
                        <Clock className="h-3.5 w-3.5 mr-1" /> Extend
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleAdminAction(s.id, "reset_download_count")}>
                        <RefreshCcw className="h-3.5 w-3.5 mr-1" /> Reset
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleAdminAction(s.id, "delete")}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card mt-8">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Audit Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>File</th>
                <th>Token</th>
                <th>User</th>
                <th>IP</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.timestamp)}</td>
                  <td>{entry.original_name}</td>
                  <td className="font-mono text-xs">{entry.token || "—"}</td>
                  <td className="font-mono text-xs">{entry.user_id || "—"}</td>
                  <td className="font-mono text-xs">{entry.ip_address || "—"}</td>
                  <td><StatusBadge status={entry.status} /></td>
                  <td>{entry.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

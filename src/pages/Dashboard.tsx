import { useEffect, useState } from "react";
import {
  Upload,
  Share2,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";

interface MetricData {
  activeShares: number;
  expiredLinks: number;
  revokedLinks: number;
  failedAttempts: number;
  totalUploads: number;
  rateLimitedAttempts: number;
  failedPasswordAttempts: number;
  suspiciousIPs: number;
}

interface RecentShare {
  id: string;
  original_name: string;
  status: "active" | "expired" | "revoked";
  download_count: number;
  max_downloads: number | null;
  is_revoked: boolean;
  expires_at: string | null;
}

interface RecentLog {
  id: string;
  status: "success" | "failed";
  reason: string | null;
  timestamp: string;
  file_id: string;
  geo_country: string | null;
  files: { original_name: string } | Array<{ original_name: string }> | null;
  ip_address: string | null;
}

function getRecentLogFileName(files: RecentLog["files"]): string {
  if (!files) return "Unknown";
  if (Array.isArray(files)) return files[0]?.original_name || "Unknown";
  return files.original_name || "Unknown";
}

function computeSuspiciousIpCount(logs: RecentLog[]): number {
  const windowMs = 2 * 60 * 60 * 1000;
  const now = Date.now();

  const grouped: Record<string, Set<string>> = {};

  for (const log of logs) {
    if (!log.ip_address || !log.geo_country) {
      continue;
    }

    const timestampMs = new Date(log.timestamp).getTime();
    if (Number.isNaN(timestampMs) || now - timestampMs > windowMs) {
      continue;
    }

    if (!grouped[log.ip_address]) {
      grouped[log.ip_address] = new Set();
    }

    grouped[log.ip_address].add(log.geo_country);
  }

  return Object.values(grouped).filter((countrySet) => countrySet.size > 1).length;
}

function getShareStatus(share: RecentShare): "active" | "expired" | "revoked" {
  if (share.is_revoked) return "revoked";
  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    return "expired";
  }
  if (share.max_downloads && share.download_count >= share.max_downloads) {
    return "expired";
  }
  return "active";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [recentShares, setRecentShares] = useState<RecentShare[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: shares } = await supabase
        .from("files")
        .select(
          "id, original_name, download_count, max_downloads, is_revoked, expires_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: logs } = await supabase
        .from("access_logs")
        .select(`id, status, reason, timestamp, file_id, geo_country, files(original_name), ip_address`)
        .order("timestamp", { ascending: false })
        .limit(200);

      if (shares && logs) {
        const active = (shares || []).filter((s) => {
          if (s.is_revoked) return false;
          if (s.expires_at && new Date(s.expires_at).getTime() <= Date.now())
            return false;
          if (s.max_downloads && s.download_count >= s.max_downloads)
            return false;
          return true;
        }).length;

        const expired = (shares || []).filter(
          (s) =>
            !s.is_revoked &&
            ((s.expires_at && new Date(s.expires_at).getTime() <= Date.now()) ||
              (s.max_downloads && s.download_count >= s.max_downloads))
        ).length;

        const revoked = (shares || []).filter((s) => s.is_revoked).length;
        const typedLogs = (logs || []) as RecentLog[];

        const failed = typedLogs.filter(
          (l) => l.status === "failed"
        ).length;

        const rateLimitedAttempts = typedLogs.filter(
          (l) => l.reason === "rate_limited" || l.reason === "password_rate_limited"
        ).length;

        const failedPasswordAttempts = typedLogs.filter(
          (l) => l.reason === "wrong_password"
        ).length;

        const suspiciousIPs = computeSuspiciousIpCount(typedLogs);

        setMetrics({
          activeShares: active,
          expiredLinks: expired,
          revokedLinks: revoked,
          failedAttempts: failed,
          totalUploads: shares?.length || 0,
          rateLimitedAttempts,
          failedPasswordAttempts,
          suspiciousIPs,
        });

        setRecentShares(shares as RecentShare[]);
        setRecentLogs(typedLogs);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const metricCards = metrics
    ? [
        {
          label: "Active Shares",
          value: metrics.activeShares,
          icon: Share2,
          color: "text-success",
          trend: "+12%",
          up: true,
        },
        {
          label: "Expired Links",
          value: metrics.expiredLinks,
          icon: AlertTriangle,
          color: "text-warning",
          trend: "-3%",
          up: false,
        },
        {
          label: "Total Uploads",
          value: metrics.totalUploads,
          icon: Upload,
          color: "text-primary",
          trend: "+8%",
          up: true,
        },
        {
          label: "Failed Attempts",
          value: metrics.failedAttempts,
          icon: Shield,
          color: "text-destructive",
          trend: "+2%",
          up: true,
        },
        {
          label: "Rate Limited",
          value: metrics.rateLimitedAttempts,
          icon: AlertTriangle,
          color: "text-warning",
          trend: "+1%",
          up: true,
        },
        {
          label: "Failed Passwords",
          value: metrics.failedPasswordAttempts,
          icon: Shield,
          color: "text-destructive",
          trend: "+1%",
          up: true,
        },
        {
          label: "Suspicious IPs",
          value: metrics.suspiciousIPs,
          icon: AlertTriangle,
          color: "text-destructive",
          trend: "multi-country/2h",
          up: true,
        },
      ]
    : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of your file sharing activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {loading
          ? [1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="metric-card h-32 animate-pulse bg-secondary" />
            ))
          : metricCards.map((m) => (
              <div key={m.label} className="metric-card">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {m.label}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-md bg-secondary ${m.color}`}
                  >
                    <m.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-3xl font-bold text-foreground tracking-tight">
                  {m.value}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {m.up ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-warning" />
                  )}
                  <span className={m.up ? "text-success" : "text-warning"}>
                    {m.trend}
                  </span>
                  <span className="text-muted-foreground">vs last week</span>
                </div>
              </div>
            ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Recent Shares</h2>
            <button onClick={() => navigate("/shares")} className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {!loading && recentShares.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      No uploads yet
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading &&
                  recentShares.slice(0, 4).map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.original_name}</td>
                      <td>
                        <StatusBadge status={getShareStatus(s)} />
                      </td>
                      <td>
                        {s.download_count}/{s.max_downloads ?? "∞"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <button onClick={() => navigate("/logs")} className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {!loading && recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      No activity yet
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                )}

                {!loading &&
                  recentLogs.slice(0, 4).map((l) => {
                    const fileName = getRecentLogFileName(l.files);

                    return (
                      <tr key={l.id}>
                        <td className="font-medium">{fileName}</td>
                        <td>
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="font-mono text-xs">
                          {l.ip_address || "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

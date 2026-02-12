import { Upload, Share2, Shield, AlertTriangle, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockShares, mockAccessLogs, mockAdminMetrics } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";

const metrics = [
  { label: "Active Shares", value: mockAdminMetrics.activeShares, icon: Share2, color: "text-success" },
  { label: "Expired Links", value: mockAdminMetrics.expiredLinks, icon: AlertTriangle, color: "text-warning" },
  { label: "Total Uploads", value: 192, icon: Upload, color: "text-primary" },
  { label: "Failed Attempts", value: mockAdminMetrics.failedAttempts, icon: Shield, color: "text-destructive" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of your file sharing activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="metric-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{m.label}</span>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </div>
            <p className="mt-2 text-3xl font-semibold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
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
                {mockShares.slice(0, 4).map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.fileName}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>{s.downloadCount}/{s.downloadLimit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
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
                {mockAccessLogs.slice(0, 4).map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium">{l.fileName}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td className="font-mono text-xs">{l.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Upload, Share2, Shield, AlertTriangle, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockShares, mockAccessLogs, mockAdminMetrics } from "@/data/mockData";
import { StatusBadge } from "@/components/StatusBadge";

const metrics = [
  { label: "Active Shares", value: mockAdminMetrics.activeShares, icon: Share2, color: "text-success", trend: "+12%", up: true },
  { label: "Expired Links", value: mockAdminMetrics.expiredLinks, icon: AlertTriangle, color: "text-warning", trend: "-3%", up: false },
  { label: "Total Uploads", value: 192, icon: Upload, color: "text-primary", trend: "+8%", up: true },
  { label: "Failed Attempts", value: mockAdminMetrics.failedAttempts, icon: Shield, color: "text-destructive", trend: "+2%", up: true },
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
              <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-secondary ${m.color}`}>
                <m.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground tracking-tight">{m.value}</p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {m.up ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-warning" />}
              <span className={m.up ? "text-success" : "text-warning"}>{m.trend}</span>
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

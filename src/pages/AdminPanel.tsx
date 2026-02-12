import { Share2, AlertTriangle, XCircle, ShieldAlert, Download, Clock, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { mockShares, mockAdminMetrics } from "@/data/mockData";

const metrics = [
  { label: "Active Shares", value: mockAdminMetrics.activeShares, icon: Share2, color: "text-success", trend: "+12%", up: true },
  { label: "Expired Links", value: mockAdminMetrics.expiredLinks, icon: Clock, color: "text-warning", trend: "-5%", up: false },
  { label: "Revoked Links", value: mockAdminMetrics.revokedLinks, icon: XCircle, color: "text-destructive", trend: "+1", up: true },
  { label: "Failed Attempts", value: mockAdminMetrics.failedAttempts, icon: ShieldAlert, color: "text-destructive", trend: "+2%", up: true },
];

export default function AdminPanel() {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
              {mockShares.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.fileName}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>{s.downloadCount}/{s.downloadLimit}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {s.status === "active" && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      )}
                      {s.status !== "revoked" && (
                        <Button variant="ghost" size="sm">
                          <Clock className="h-3.5 w-3.5 mr-1" /> Extend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

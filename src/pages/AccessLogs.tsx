import { useState } from "react";
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
import { mockAccessLogs } from "@/data/mockData";

export default function AccessLogs() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [fileFilter, setFileFilter] = useState("");

  const filtered = mockAccessLogs.filter((l) => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchFile = l.fileName.toLowerCase().includes(fileFilter.toLowerCase());
    return matchStatus && matchFile;
  });

  const formatTimestamp = (t: string) =>
    new Date(t).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Access Logs</h1>
        <p className="page-description">Monitor all file access attempts</p>
      </div>

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
            {filtered.map((l) => (
              <tr key={l.id}>
                <td className="text-xs whitespace-nowrap">{formatTimestamp(l.timestamp)}</td>
                <td className="font-medium">{l.fileName}</td>
                <td className="font-mono text-xs">{l.ipAddress}</td>
                <td><StatusBadge status={l.status} /></td>
                <td className="text-xs text-muted-foreground">{l.failureReason || "—"}</td>
                <td>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {l.geo}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}

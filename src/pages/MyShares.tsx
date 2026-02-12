import { useState } from "react";
import { Search, Eye, AlertTriangle } from "lucide-react";
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
import { mockShares } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function MyShares() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = mockShares.filter((s) => {
    const matchSearch = s.fileName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getCountdown = (d: string) => {
    const diff = new Date(d).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h remaining`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Shares</h1>
        <p className="page-description">Manage your shared files and links</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Created</th>
              <th>Expiry</th>
              <th>Downloads</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.fileName}</td>
                <td>{formatDate(s.createdAt)}</td>
                <td className="text-xs">{getCountdown(s.expiresAt)}</td>
                <td>{s.downloadCount}/{s.downloadLimit}</td>
                <td><StatusBadge status={s.status} /></td>
                <td>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/logs")}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Logs
                    </Button>
                    {s.status === "active" && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">{filtered.length} results</p>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">1</Button>
          <Button variant="outline" size="sm">2</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}

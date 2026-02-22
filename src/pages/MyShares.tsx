import { useEffect, useMemo, useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type ShareStatus = "active" | "expired" | "revoked";

interface ShareRow {
  id: string;
  token: string;
  original_name: string;
  created_at: string;
  expires_at: string | null;
  download_count: number;
  max_downloads: number | null;
  is_revoked: boolean;
}

function getShareStatus(share: ShareRow): ShareStatus {
  if (share.is_revoked) return "revoked";

  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    return "expired";
  }

  if (share.max_downloads && share.download_count >= share.max_downloads) {
    return "expired";
  }

  return "active";
}

export default function MyShares() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    const loadShares = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Unable to load your shares. Please log in again.");
        setLoading(false);
        return;
      }

      const { data, error: sharesError } = await supabase
        .from("files")
        .select(
          "id, token, original_name, created_at, expires_at, download_count, max_downloads, is_revoked"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (sharesError) {
        setError("Unable to load shares right now.");
        setLoading(false);
        return;
      }

      setShares((data || []) as ShareRow[]);
      setLoading(false);
    };

    loadShares();
  }, []);

  const filtered = useMemo(() => {
    return shares.filter((share) => {
      const status = getShareStatus(share);
      const matchSearch = share.original_name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchFilter = filter === "all" || status === filter;
      return matchSearch && matchFilter;
    });
  }, [filter, search, shares]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getCountdown = (d: string | null) => {
    if (!d) return "Never expires";

    const diff = new Date(d).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h remaining`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  };

  const handleRevoke = async (shareId: string) => {
    if (revokingId) return;

    setRevokingId(shareId);
    setError("");

    const { error: revokeError } = await supabase
      .from("files")
      .update({ is_revoked: true })
      .eq("id", shareId)
      .eq("is_revoked", false);

    if (revokeError) {
      setError("Unable to revoke link.");
      setRevokingId(null);
      return;
    }

    setShares((prev) =>
      prev.map((share) =>
        share.id === shareId ? { ...share, is_revoked: true } : share
      )
    );
    setRevokingId(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Shares</h1>
        <p className="page-description">Manage your shared files and links</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

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
            {loading && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground">
                  Loading shares...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground">
                  No shares found.
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((share) => {
                const status = getShareStatus(share);

                return (
                  <tr key={share.id}>
                    <td className="font-medium">{share.original_name}</td>
                    <td>{formatDate(share.created_at)}</td>
                    <td className="text-xs">{getCountdown(share.expires_at)}</td>
                    <td>
                      {share.download_count}/
                      {share.max_downloads ?? "∞"}
                    </td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/logs")}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> Logs
                        </Button>

                        {status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRevoke(share.id)}
                            disabled={revokingId === share.id}
                          >
                            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                            {revokingId === share.id ? "Revoking..." : "Revoke"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-muted-foreground">{filtered.length} results</p>
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

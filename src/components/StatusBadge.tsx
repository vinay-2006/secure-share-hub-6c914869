import { cn } from "@/lib/utils";

type StatusType = "active" | "expired" | "revoked" | "success" | "failed";

const statusStyles: Record<StatusType, string> = {
  active: "bg-success/15 text-success",
  success: "bg-success/15 text-success",
  expired: "bg-warning/15 text-warning",
  revoked: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

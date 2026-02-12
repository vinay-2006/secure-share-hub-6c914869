import { cn } from "@/lib/utils";

type StatusType = "active" | "expired" | "revoked" | "success" | "failed";

const statusStyles: Record<StatusType, string> = {
  active: "bg-success/10 text-success",
  success: "bg-success/10 text-success",
  expired: "bg-warning/10 text-warning",
  revoked: "bg-destructive/10 text-destructive",
  failed: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

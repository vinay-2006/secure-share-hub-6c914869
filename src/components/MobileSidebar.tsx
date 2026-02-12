import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Upload, Share2, FileText, Shield, LogOut, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Upload File", path: "/upload", icon: Upload },
  { label: "My Shares", path: "/shares", icon: Share2 },
  { label: "Access Logs", path: "/logs", icon: FileText },
];

const adminItems = [
  { label: "Admin Panel", path: "/admin", icon: Shield },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();

  if (!open) return null;

  const linkClass = (path: string) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      location.pathname === path
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col lg:hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">VaultLink</span>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <RouterNavLink key={item.path} to={item.path} className={linkClass(item.path)} onClick={onClose}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </RouterNavLink>
          ))}
          <div className="pt-6 pb-2">
            <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Administration</span>
          </div>
          {adminItems.map((item) => (
            <RouterNavLink key={item.path} to={item.path} className={linkClass(item.path)} onClick={onClose}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </RouterNavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <RouterNavLink to="/login" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={onClose}>
            <LogOut className="h-4 w-4" />
            Logout
          </RouterNavLink>
        </div>
      </div>
    </>
  );
}

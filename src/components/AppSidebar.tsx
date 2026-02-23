import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Share2,
  FileText,
  Shield,
  LogOut,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Upload File", path: "/upload", icon: Upload },
  { label: "My Shares", path: "/shares", icon: Share2 },
  { label: "Access Logs", path: "/logs", icon: FileText },
];

const adminItems = [
  { label: "Admin Panel", path: "/admin", icon: Shield },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const linkClass = (path: string) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
      location.pathname === path
        ? "bg-primary/10 text-foreground border-l-2 border-primary pl-[10px]"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground/80"
    );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
        <Lock className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold text-foreground">VaultLink</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <RouterNavLink key={item.path} to={item.path} className={linkClass(item.path)}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </RouterNavLink>
        ))}

        <div className="pt-6 pb-2">
          <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Administration
          </span>
        </div>
        {adminItems.map((item) => (
          <RouterNavLink key={item.path} to={item.path} className={linkClass(item.path)}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </RouterNavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground/80 transition-colors"
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

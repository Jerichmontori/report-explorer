import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  FileText,
  Tags,
  Users,
  SlidersHorizontal,
  LogOut,
  Landmark,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { LABEL_PERAN, type Peran } from "../lib/types";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Peran[]; // bila kosong, semua peran
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transaksi", label: "Transaksi", icon: Receipt },
  { to: "/approval", label: "Persetujuan", icon: CheckSquare, roles: ["bendahara", "ketua"] },
  { to: "/laporan", label: "Laporan", icon: FileText },
  { to: "/kategori", label: "Kategori", icon: Tags, roles: ["admin"] },
  { to: "/aturan", label: "Aturan Approval", icon: SlidersHorizontal, roles: ["admin"] },
  { to: "/pengguna", label: "Pengguna", icon: Users, roles: ["admin"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((n) => !n.roles || (user?.peran && n.roles.includes(user.peran)));

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Laporan FKUB</p>
            <p className="text-xs text-muted-foreground">Dana Hibah</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            {user?.peran && (
              <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {LABEL_PERAN[user.peran]}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Laporan FKUB</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <div className="md:pl-64">
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function AuthenticatedOutlet() {
  return <Outlet />;
}

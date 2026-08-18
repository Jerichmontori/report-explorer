import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Landmark, ShieldCheck } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { bootstrapAdmin } from "../../lib/data";
import { AppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  // Rute hanya dirender di klien: sesi InsForge ada di memori browser
  // dan hidrasi auth bersifat asinkron (hindari redirect saat SSR).
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const { user, loading, refresh } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.peran) {
    return <NoRole onAssigned={refresh} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function NoRole({ onAssigned }: { onAssigned: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();

  async function handleBootstrap() {
    setBusy(true);
    try {
      await bootstrapAdmin();
      await refresh();
      await onAssigned();
      toast.success("Anda kini menjadi administrator.");
    } catch (e) {
      toast.error(
        "Tidak dapat menetapkan admin. Kemungkinan admin sudah ada — hubungi administrator.",
      );
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Akun belum memiliki peran</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun Anda (<span className="font-medium">{useAuth().user?.email}</span>) belum diberi
          peran. Hubungi administrator untuk menetapkan peran (kasir, bendahara, ketua, atau admin).
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Jika belum ada administrator sama sekali di sistem ini, Anda dapat menetapkan diri Anda
          sebagai admin pertama (sekali saja).
        </p>
        <Button className="mt-5 w-full" onClick={handleBootstrap} disabled={busy}>
          <Landmark className="h-4 w-4" />
          {busy ? "Memproses…" : "Jadikan Saya Admin Pertama"}
        </Button>
      </div>
    </div>
  );
}

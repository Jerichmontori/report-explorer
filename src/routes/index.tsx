import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Landmark, LogIn, ShieldCheck, FileText, CheckSquare } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Laporan FKUB — Pengelolaan Dana Hibah" },
      {
        name: "description",
        content:
          "Aplikasi pengelolaan dana hibah FKUB dengan pencatatan transaksi, alur persetujuan berjenjang, dan laporan tercetak.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Landmark className="h-8 w-8" />
        </div>
        <h1 className="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Laporan Dana Hibah FKUB
        </h1>
        <p className="mt-3 max-w-2xl text-center text-muted-foreground">
          Pencatatan pemasukan dan pengeluaran, alur persetujuan kasir–bendahara–ketua,
          serta laporan keuangan tercetak dalam satu aplikasi.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">
              <LogIn className="h-4 w-4" />
              Masuk Aplikasi
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login" search={{ mode: "daftar" }}>Daftar Akun Baru</Link>
          </Button>
        </div>

        <div className="mt-12 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={FileText}
            title="Pencatatan Transaksi"
            desc="Kasir mencatat pemasukan & pengeluaran dengan kategori dan pagu anggaran."
          />
          <FeatureCard
            icon={CheckSquare}
            title="Persetujuan Berjenjang"
            desc="Alur ketua saja, atau bendahara lalu ketua, sesuai ambang nominal."
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Laporan Tercetak"
            desc="Ringkasan realisasi dan buku kas umum siap cetak sesuai format laporan."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

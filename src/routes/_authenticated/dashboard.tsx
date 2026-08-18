import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  CheckSquare,
  FileText,
  Plus,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { getRingkasan, listTransaksi } from "../lib/data";
import { formatRupiah, formatTanggalID } from "../lib/format";
import { LABEL_PERAN, type Peran, type StatusTransaksi, type Transaksi } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Laporan FKUB" },
      { name: "description", content: "Ringkasan keuangan dan aktivitas persetujuan." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof getRingkasan>> | null>(null);
  const [recent, setRecent] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ringkasan, transaksi] = await Promise.all([
          getRingkasan(),
          listTransaksi({ limit: 6 }),
        ]);
        if (!active) return;
        setData(ringkasan);
        setRecent(transaksi);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const peran = user?.peran as Peran | undefined;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Selamat datang, {user?.name}. Anda masuk sebagai{" "}
            <span className="font-medium text-primary">
              {peran ? LABEL_PERAN[peran] : "tanpa peran"}
            </span>
            .
          </p>
        </div>
        <div className="flex gap-2">
          {peran === "kasir" && (
            <Button asChild>
              <Link to="/transaksi?aksi=tambah">
                <Plus className="h-4 w-4" />
                Tambah Transaksi
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/laporan">
              <FileText className="h-4 w-4" />
              Lihat Laporan
            </Link>
          </Button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Saldo Berjalan"
          value={formatRupiah(data.totalPemasukan - data.totalPengeluaran)}
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Pemasukan"
          value={formatRupiah(data.totalPemasukan)}
          tone="success"
        />
        <StatCard
          icon={TrendingDown}
          label="Total Pengeluaran"
          value={formatRupiah(data.totalPengeluaran)}
          tone="danger"
        />
        <StatCard
          icon={Clock}
          label="Menunggu Persetujuan"
          value={String(data.menungguApproval)}
          tone="warning"
        />
      </div>

      {/* Role-specific panel */}
      {peran && <RolePanel peran={peran} counts={data} />}

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaksi Terbaru</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/transaksi">Lihat semua →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada transaksi.{" "}
              {peran === "kasir" && "Mulai catat transaksi pertama Anda."}
            </p>
          ) : (
            <div className="divide-y">
              {recent.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.keterangan || t.kategoriNama}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTanggalID(t.tanggal)} · {t.kategoriNama}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        t.jenis === "pemasukan" ? "text-emerald-600" : "text-foreground",
                      )}
                    >
                      {t.jenis === "pemasukan" ? "+" : "−"}
                      {formatRupiah(t.nominal)}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RolePanel({
  peran,
  counts,
}: {
  peran: Peran;
  counts: Awaited<ReturnType<typeof getRingkasan>>;
}) {
  if (peran === "kasir") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tugas Kasir</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <MiniStat icon={Receipt} label="Draft (belum diajukan)" value={counts.draft} />
          <MiniStat icon={Clock} label="Menunggu persetujuan" value={counts.menungguApproval} />
          <MiniStat icon={CheckCircle2} label="Disetujui" value={counts.disetujui} />
        </CardContent>
      </Card>
    );
  }
  if (peran === "bendahara") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Antrean Persetujuan Bendahara</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/approval">
              <CheckSquare className="h-4 w-4" />
              Proses
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <MiniStat icon={Clock} label="Menunggu Bendahara" value={counts.menungguBendahara} />
          <MiniStat icon={CheckCircle2} label="Sudah Anda setujui" value={counts.disetujui} />
        </CardContent>
      </Card>
    );
  }
  if (peran === "ketua") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Antrean Persetujuan Ketua</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/approval">
              <CheckSquare className="h-4 w-4" />
              Proses
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <MiniStat icon={Clock} label="Menunggu Ketua" value={counts.menungguKetua} />
          <MiniStat icon={CheckCircle2} label="Disetujui" value={counts.disetujui} />
          <MiniStat icon={XCircle} label="Ditolak" value={counts.ditolak} />
        </CardContent>
      </Card>
    );
  }
  // admin
  return (
    <Card>
      <CardHeader>
        <CardTitle>Administrasi Sistem</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/kategori">Kelola Kategori</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/aturan">Aturan Approval</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pengguna">
            <Users className="h-4 w-4" />
            Kelola Pengguna
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "primary" | "success" | "danger" | "warning";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    danger: "bg-rose-500/10 text-rose-600",
    warning: "bg-amber-500/10 text-amber-600",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: StatusTransaksi }) {
  const map: Record<StatusTransaksi, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    menunggu_bendahara: { label: "Menunggu Bendahara", cls: "bg-amber-500/10 text-amber-700" },
    menunggu_ketua: { label: "Menunggu Ketua", cls: "bg-blue-500/10 text-blue-700" },
    disetujui: { label: "Disetujui", cls: "bg-emerald-500/10 text-emerald-700" },
    ditolak: { label: "Ditolak", cls: "bg-rose-500/10 text-rose-700" },
  };
  const s = map[status];
  return <Badge variant="secondary" className={cn("font-medium", s.cls)}>{s.label}</Badge>;
}

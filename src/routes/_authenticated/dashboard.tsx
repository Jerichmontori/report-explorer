import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Clock,
  Receipt,
  CheckSquare,
  FileText,
  Plus,
  Users,
  Target,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { getRingkasan, listTransaksi, type Ringkasan } from "../../lib/data";
import { formatRupiah, formatTanggal } from "../../lib/format";
import { LABEL_PERAN, LABEL_STATUS, type Peran, type StatusTransaksi, type Transaksi } from "../../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Laporan FKUB" },
      { name: "description", content: "Ringkasan keuangan dan aktivitas persetujuan." },
    ],
  }),
  component: DashboardPage,
});

function countOf(ringkasan: Ringkasan | null, status: StatusTransaksi): number {
  if (!ringkasan) return 0;
  return ringkasan.perStatus.find((s) => s.status === status)?.jumlah ?? 0;
}

function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Ringkasan | null>(null);
  const [recent, setRecent] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ringkasan, transaksi] = await Promise.all([
          getRingkasan(),
          listTransaksi({}),
        ]);
        if (!active) return;
        setData(ringkasan);
        setRecent(transaksi.slice(0, 6));
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
  const draft = countOf(data, "draft");
  const menungguBendahara = countOf(data, "menunggu_bendahara");
  const menungguKetua = countOf(data, "menunggu_ketua");
  const disetujui = countOf(data, "disetujui");
  const ditolak = countOf(data, "ditolak");

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Saldo Berjalan"
          value={formatRupiah(data.saldo)}
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
          value={formatRupiah(data.realisasi)}
          tone="danger"
        />
        <StatCard
          icon={Clock}
          label="Menunggu Persetujuan"
          value={String(data.menungguApproval)}
          tone="warning"
        />
      </div>

      {/* Pagu progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Realisasi terhadap Pagu Anggaran</p>
            </div>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatRupiah(data.realisasi)} / {formatRupiah(data.pagu)}
            </p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, data.persenRealisasi)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.persenRealisasi.toFixed(1)}% terrealisasi · sisa {formatRupiah(data.sisaPagu)}
          </p>
        </CardContent>
      </Card>

      {peran && <RolePanel peran={peran} draft={draft} menungguBendahara={menungguBendahara} menungguKetua={menungguKetua} disetujui={disetujui} ditolak={ditolak} />}

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
                    <p className="truncate text-sm font-medium">{t.uraian || t.kategori?.nama || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTanggal(t.tanggal)} · {t.kategori?.nama ?? "Tanpa kategori"}
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
                      {formatRupiah(t.jumlah)}
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
  draft,
  menungguBendahara,
  menungguKetua,
  disetujui,
  ditolak,
}: {
  peran: Peran;
  draft: number;
  menungguBendahara: number;
  menungguKetua: number;
  disetujui: number;
  ditolak: number;
}) {
  if (peran === "kasir") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tugas Kasir</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <MiniStat icon={Receipt} label="Draft (belum diajukan)" value={draft} />
          <MiniStat icon={Clock} label="Menunggu persetujuan" value={menungguBendahara + menungguKetua} />
          <MiniStat icon={CheckSquare} label="Disetujui" value={disetujui} />
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
          <MiniStat icon={Clock} label="Menunggu Bendahara" value={menungguBendahara} />
          <MiniStat icon={CheckSquare} label="Disetujui" value={disetujui} />
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
          <MiniStat icon={Clock} label="Menunggu Ketua" value={menungguKetua} />
          <MiniStat icon={CheckSquare} label="Disetujui" value={disetujui} />
          <MiniStat icon={Clock} label="Ditolak" value={ditolak} />
        </CardContent>
      </Card>
    );
  }
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
  const tones: Partial<Record<StatusTransaksi, string>> = {
    draft: "bg-muted text-muted-foreground",
    diajukan: "bg-slate-500/10 text-slate-700",
    menunggu_bendahara: "bg-amber-500/10 text-amber-700",
    disetujui_bendahara: "bg-amber-500/10 text-amber-700",
    menunggu_ketua: "bg-blue-500/10 text-blue-700",
    disetujui: "bg-emerald-500/10 text-emerald-700",
    ditolak: "bg-rose-500/10 text-rose-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", tones[status])}>
      {LABEL_STATUS[status]}
    </span>
  );
}

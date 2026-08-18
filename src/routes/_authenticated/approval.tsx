import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { useAuth } from "../../lib/auth";
import {
  listTransaksi,
  setujuiTransaksi,
  tolakTransaksi,
  listApprovalLog,
} from "../../lib/data";
import { formatRupiah, formatTanggal, formatWaktu } from "../../lib/format";
import { LABEL_PERAN, LABEL_STATUS, type ApprovalLog, type Peran, type StatusTransaksi, type Transaksi } from "../../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/approval")({
  head: () => ({
    meta: [
      { title: "Persetujuan — Laporan FKUB" },
      { name: "description", content: "Antrean persetujuan transaksi." },
    ],
  }),
  component: ApprovalPage,
});

function targetStatus(peran: Peran): StatusTransaksi | null {
  if (peran === "bendahara") return "menunggu_bendahara";
  if (peran === "ketua") return "menunggu_ketua";
  return null;
}

function ApprovalPage() {
  const { user } = useAuth();
  const peran = user?.peran as Peran | undefined;
  const target = peran ? targetStatus(peran) : null;

  const [items, setItems] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Record<string, ApprovalLog[]>>({});

  const reload = async () => {
    setLoading(true);
    try {
      let all = await listTransaksi({});
      if (target) all = all.filter((t) => t.status === target);
      setItems(all);
      const logMap: Record<string, ApprovalLog[]> = {};
      await Promise.all(
        all.map(async (t) => {
          logMap[t.id] = await listApprovalLog(t.id);
        }),
      );
      setLogs(logMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (target) reload();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  async function handleApprove(t: Transaksi) {
    try {
      await setujuiTransaksi(t.id, note[t.id] ?? "", peran!);
      toast.success("Transaksi disetujui");
      setNote((n) => ({ ...n, [t.id]: "" }));
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyetujui");
    }
  }

  async function handleReject(t: Transaksi) {
    const alasan = note[t.id]?.trim();
    if (!alasan) {
      toast.error("Berikan alasan penolakan pada kolom catatan");
      return;
    }
    if (!confirm("Tolak transaksi ini?")) return;
    try {
      await tolakTransaksi(t.id, alasan, peran!);
      toast.success("Transaksi ditolak");
      setNote((n) => ({ ...n, [t.id]: "" }));
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menolak");
    }
  }

  if (!peran || (peran !== "bendahara" && peran !== "ketua")) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Halaman ini hanya untuk Bendahara dan Ketua.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Persetujuan</h1>
        <p className="text-sm text-muted-foreground">
          Antrean transaksi yang menunggu persetujuan Anda sebagai{" "}
          <span className="font-medium text-primary">{peran ? LABEL_PERAN[peran] : ""}</span>.
        </p>
      </header>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            Tidak ada transaksi yang menunggu persetujuan Anda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{t.uraian}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTanggal(t.tanggal)} · {t.kategori?.nama ?? "Tanpa kategori"}
                      {t.pihak && ` · ${t.pihak}`}
                    </p>
                    {t.jalur === "bendahara_ketua" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Jalur: Bendahara → Ketua
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums">{formatRupiah(t.jumlah)}</p>
                    <StatusBadge status={t.status} />
                  </div>
                </div>

                {(t.volume !== 1 || t.satuan) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.volume} {t.satuan ?? ""} × {formatRupiah(t.harga_satuan)}
                  </p>
                )}

                {/* Approval log */}
                {logs[t.id] && logs[t.id]!.length > 0 && (
                  <div className="mt-4 rounded-md border bg-muted/30 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Riwayat persetujuan
                    </p>
                    <ul className="space-y-1.5">
                      {logs[t.id]!.map((l) => (
                        <li key={l.id} className="flex items-start gap-2 text-xs">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
                              l.aksi === "setujui" && "bg-emerald-500/10 text-emerald-700",
                              l.aksi === "tolak" && "bg-rose-500/10 text-rose-700",
                              l.aksi === "diajukan" && "bg-slate-500/10 text-slate-600",
                            )}
                          >
                            {LABEL_PERAN[l.peran]} · {l.aksi}
                          </span>
                          <span className="text-muted-foreground">{formatWaktu(l.waktu)}</span>
                          {l.catatan && <span>— {l.catatan}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`note-${t.id}`}>Catatan / Alasan</Label>
                    <Textarea
                      id={`note-${t.id}`}
                      value={note[t.id] ?? ""}
                      onChange={(e) => setNote((n) => ({ ...n, [t.id]: e.target.value }))}
                      rows={2}
                      placeholder="Catatan untuk penyetujuan atau alasan penolakan"
                    />
                  </div>
                  <Button onClick={() => handleApprove(t)} className="sm:w-32">
                    <CheckCircle2 className="h-4 w-4" />
                    Setujui
                  </Button>
                  <Button onClick={() => handleReject(t)} variant="destructive" className="sm:w-32">
                    <XCircle className="h-4 w-4" />
                    Tolak
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Receipt, ArrowLeft, Trash2, Send } from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  listTransaksi,
  listKategori,
  createTransaksi,
  deleteTransaksi,
  ajukanTransaksi,
} from "../lib/data";
import { formatRupiah, formatTanggalID } from "../lib/format";
import {
  type Kategori,
  type Transaksi,
  type JenisTransaksi,
  type StatusTransaksi,
} from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/transaksi")({
  head: () => ({
    meta: [
      { title: "Transaksi — Laporan FKUB" },
      { name: "description", content: "Daftar transaksi pemasukan dan pengeluaran." },
    ],
  }),
  component: TransaksiPage,
});

type FilterStatus = StatusTransaksi | "semua";

function TransaksiPage() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as { aksi?: string };
  const isKasir = user?.peran === "kasir";
  const showForm = search.aksi === "tambah";

  const [items, setItems] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterJenis, setFilterJenis] = useState<JenisTransaksi | "semua">("semua");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, k] = await Promise.all([listTransaksi(), listKategori()]);
      setItems(t);
      setKategori(k);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((t) => {
      if (filterJenis !== "semua" && t.jenis !== filterJenis) return false;
      if (filterStatus !== "semua" && t.status !== filterStatus) return false;
      if (term) {
        const hay = `${t.keterangan} ${t.kategoriNama}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [items, q, filterJenis, filterStatus]);

  async function handleDelete(t: Transaksi) {
    if (!confirm(`Hapus transaksi "${t.keterangan || t.kategoriNama}"?`)) return;
    try {
      await deleteTransaksi(t.id);
      toast.success("Transaksi dihapus");
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menghapus");
    }
  }

  async function handleAjukan(t: Transaksi) {
    if (!confirm(`Ajukan transaksi ini untuk persetujuan?`)) return;
    try {
      await ajukanTransaksi(t.id);
      toast.success("Transaksi diajukan");
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengajukan");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaksi</h1>
          <p className="text-sm text-muted-foreground">
            {isKasir
              ? "Catat pemasukan & pengeluaran dan ajukan untuk persetujuan."
              : "Daftar seluruh transaksi."}
          </p>
        </div>
        {isKasir && (
          <Button asChild>
            <Link to="/transaksi?aksi=tambah">
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Link>
          </Button>
        )}
      </header>

      {showForm && isKasir ? (
        <NewTransaksiForm kategori={kategori} onDone={reload} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari keterangan…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Jenis</SelectItem>
                <SelectItem value="pemasukan">Pemasukan</SelectItem>
                <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="menunggu_bendahara">Menunggu Bendahara</SelectItem>
                <SelectItem value="menunggu_ketua">Menunggu Ketua</SelectItem>
                <SelectItem value="disetujui">Disetujui</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Tidak ada transaksi yang cocok.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tanggal</th>
                        <th className="px-4 py-3 font-medium">Keterangan</th>
                        <th className="px-4 py-3 font-medium">Kategori</th>
                        <th className="px-4 py-3 text-right font-medium">Nominal</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        {isKasir && <th className="px-4 py-3 text-right font-medium">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatTanggalID(t.tanggal)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{t.keterangan || "—"}</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{t.kategoriNama}</td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums",
                              t.jenis === "pemasukan" ? "text-emerald-600" : "text-foreground",
                            )}
                          >
                            {t.jenis === "pemasukan" ? "+" : "−"}
                            {formatRupiah(t.nominal)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={t.status} />
                          </td>
                          {isKasir && (
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                {t.status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAjukan(t)}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Ajukan
                                  </Button>
                                )}
                                {t.status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(t)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function NewTransaksiForm({ kategori, onDone }: { kategori: Kategori[]; onDone: () => void }) {
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [jenis, setJenis] = useState<JenisTransaksi>("pengeluaran");
  const [kategoriId, setKategoriId] = useState<string>("");
  const [nominal, setNominal] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");
  const [busy, setBusy] = useState(false);

  const kategoriTersedia = kategori.filter((k) => k.jenis === jenis);

  useEffect(() => {
    if (kategoriTersedia.length > 0 && !kategoriTersedia.find((k) => k.id === kategoriId)) {
      setKategoriId(kategoriTersedia[0].id);
    } else if (kategoriTersedia.length === 0) {
      setKategoriId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenis]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nominalNum = Number(nominal.replace(/[^\d]/g, ""));
    if (!kategoriId) return toast.error("Pilih kategori terlebih dahulu");
    if (!nominalNum || nominalNum <= 0) return toast.error("Nominal harus lebih dari 0");
    setBusy(true);
    try {
      await createTransaksi({
        tanggal,
        jenis,
        kategoriId,
        nominal: nominalNum,
        keterangan: keterangan.trim(),
      });
      toast.success("Transaksi berhasil dibuat sebagai draft");
      onDone();
      setNominal("");
      setKeterangan("");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuat transaksi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Tambah Transaksi
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/transaksi">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Jenis Transaksi</Label>
            <Select value={jenis} onValueChange={(v) => setJenis(v as JenisTransaksi)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                <SelectItem value="pemasukan">Pemasukan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={kategoriId} onValueChange={setKategoriId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {kategoriTersedia.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kategoriTersedia.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada kategori untuk jenis ini. Minta admin menambahkannya.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nominal">Nominal (Rp)</Label>
            <Input
              id="nominal"
              inputMode="numeric"
              value={nominal ? Number(nominal.replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
              onChange={(e) => setNominal(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Deskripsi transaksi (mis. Honorarium Ketua bulan Agustus)"
              rows={2}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button asChild variant="outline">
              <Link to="/transaksi">Batal</Link>
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan sebagai Draft"}
            </Button>
          </div>
        </form>
        <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Transaksi disimpan sebagai <b>draft</b>. Setelah diajukan, status berlanjut otomatis
          (ketua saja, atau bendahara lalu ketua) sesuai aturan approval. Pengeluaran yang sudah
          disetujui akan mengurangi saldo dan masuk laporan.
        </p>
      </CardContent>
    </Card>
  );
}

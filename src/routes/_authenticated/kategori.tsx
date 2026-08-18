import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { listKategori, upsertKategori, hapusKategori } from "../lib/data";
import { formatRupiah } from "../lib/format";
import { type JenisTransaksi, type Kategori } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/_authenticated/kategori")({
  head: () => ({
    meta: [
      { title: "Kategori — Laporan FKUB" },
      { name: "description", content: "Kelola kategori pemasukan dan pengeluaran." },
    ],
  }),
  component: KategoriPage,
});

function KategoriPage() {
  const [items, setItems] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Kategori | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listKategori());
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat kategori");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleDelete(k: Kategori) {
    if (!confirm(`Hapus kategori "${k.nama}"?`)) return;
    try {
      await hapusKategori(k.id);
      toast.success("Kategori dihapus");
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menghapus");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori pemasukan & pengeluaran beserta pagu anggaran.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </Button>
      </header>

      {showForm && (
        <KategoriForm
          initial={editing}
          onDone={() => {
            setShowForm(false);
            reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Belum ada kategori.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kode</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Jenis</th>
                    <th className="px-4 py-3 text-right font-medium">Pagu</th>
                    <th className="px-4 py-3 font-medium">Wajib Bendahara</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((k) => (
                    <tr key={k.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{k.kode}</td>
                      <td className="px-4 py-3 font-medium">{k.nama}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-medium",
                            k.jenis === "pemasukan"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-rose-500/10 text-rose-700",
                          )}
                        >
                          {k.jenis === "pemasukan" ? "Pemasukan" : "Pengeluaran"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(k.pagu)}</td>
                      <td className="px-4 py-3">
                        {k.wajib_bendahara ? (
                          <span className="text-xs font-medium text-amber-600">Ya</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Tidak</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(k);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(k)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KategoriForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: Kategori | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [kode, setKode] = useState(initial?.kode ?? "");
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [jenis, setJenis] = useState<JenisTransaksi>(initial?.jenis ?? "pengeluaran");
  const [pagu, setPagu] = useState(initial ? String(initial.pagu) : "0");
  const [wajibBendahara, setWajibBendahara] = useState(initial?.wajib_bendahara ?? false);
  const [urutan, setUrutan] = useState(initial ? String(initial.urutan) : "0");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kode.trim() || !nama.trim()) return toast.error("Kode dan nama wajib diisi");
    setBusy(true);
    try {
      await upsertKategori({
        id: initial?.id,
        kode: kode.trim(),
        nama: nama.trim(),
        jenis,
        pagu: Number(pagu.replace(/[^\d]/g, "")) || 0,
        wajib_bendahara: wajibBendahara,
        urutan: Number(urutan) || 0,
      });
      toast.success(initial ? "Kategori diperbarui" : "Kategori ditambahkan");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="h-4 w-4" />
          {initial ? "Edit Kategori" : "Tambah Kategori"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kode">Kode</Label>
            <Input id="kode" value={kode} onChange={(e) => setKode(e.target.value)} placeholder="mis. HNR" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Kategori</Label>
            <Input id="nama" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Honorarium" required />
          </div>
          <div className="space-y-2">
            <Label>Jenis</Label>
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
            <Label htmlFor="pagu">Pagu Anggaran (Rp)</Label>
            <Input
              id="pagu"
              inputMode="numeric"
              value={Number(pagu.replace(/[^\d]/g, "") || 0).toLocaleString("id-ID")}
              onChange={(e) => setPagu(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="urutan">Urutan Tampil</Label>
            <Input
              id="urutan"
              inputMode="numeric"
              value={urutan}
              onChange={(e) => setUrutan(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div className="flex items-end gap-2">
            <input
              id="wajib"
              type="checkbox"
              checked={wajibBendahara}
              onChange={(e) => setWajibBendahara(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="wajib" className="text-sm font-normal">
              Wajib persetujuan Bendahara (tanpa memandang nominal)
            </Label>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

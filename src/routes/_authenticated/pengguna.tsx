import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Users, ShieldCheck } from "lucide-react";
import { listPengguna, aturPeran, type PenggunaLengkap } from "../../lib/data";
import { LABEL_PERAN, type Peran } from "../../lib/types";
import { useAuth } from "../../lib/auth";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({
    meta: [
      { title: "Pengguna — Laporan FKUB" },
      { name: "description", content: "Kelola pengguna dan penetapan peran." },
    ],
  }),
  component: PenggunaPage,
});

const OPSI_PERAN: (Peran | "tanpa")[] = ["tanpa", "kasir", "bendahara", "ketua", "admin"];

function PenggunaPage() {
  const { user: saya } = useAuth();
  const [items, setItems] = useState<PenggunaLengkap[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, Peran | "tanpa">>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPengguna();
      setItems(rows);
      const d: Record<string, Peran | "tanpa"> = {};
      for (const r of rows) d[r.id] = r.peran ?? "tanpa";
      setDraft(d);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSimpan(p: PenggunaLengkap) {
    const nilai = draft[p.id];
    const target: Peran | null = nilai === "tanpa" ? null : nilai ?? null;
    if ((p.peran ?? null) === target) return;
    try {
      await aturPeran(p.id, target);
      toast.success(`Peran ${p.email} diperbarui`);
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memperbarui peran");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Tetapkan peran untuk setiap akun. Masing-masing peran memiliki dashboard dan hak akses
          berbeda.
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Belum ada pengguna.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Peran</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((p) => {
                    const isSaya = p.id === saya?.id;
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p.nama ?? p.email}</span>
                            {isSaya && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                                Anda
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={draft[p.id] ?? "tanpa"}
                            onValueChange={(v) => setDraft((d) => ({ ...d, [p.id]: v as any }))}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OPSI_PERAN.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r === "tanpa" ? "— Tanpa peran —" : LABEL_PERAN[r]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSimpan(p)}
                            disabled={(draft[p.id] ?? "tanpa") === (p.peran ?? "tanpa")}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Simpan
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["admin", "ketua", "bendahara", "kasir"] as Peran[]).map((r) => (
          <div key={r} className="rounded-lg border bg-muted/30 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" />
              {LABEL_PERAN[r]}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{deskripsiPeran(r)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function deskripsiPeran(r: Peran): string {
  switch (r) {
    case "admin":
      return "Mengelola kategori, aturan approval, dan pengguna.";
    case "ketua":
      return "Persetujuan akhir transaksi & verifikasi laporan.";
    case "bendahara":
      return "Persetujuan tahap pertama untuk transaksi besar / wajib.";
    case "kasir":
      return "Mencatat transaksi pemasukan & pengeluaran.";
  }
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SlidersHorizontal, Save } from "lucide-react";
import { getAturan, updateAturan } from "../lib/data";
import { formatRupiah } from "../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aturan")({
  head: () => ({
    meta: [
      { title: "Aturan Approval — Laporan FKUB" },
      { name: "description", content: "Konfigurasi ambang nominal persetujuan bendahara." },
    ],
  }),
  component: AturanPage,
});

function AturanPage() {
  const [ambang, setAmbang] = useState("0");
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const aturan = await getAturan();
        setAmbang(String(aturan.ambang_bendahara ?? 0));
        setKeterangan(aturan.keterangan ?? "");
      } catch (e: any) {
        toast.error(e.message ?? "Gagal memuat aturan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateAturan(Number(ambang.replace(/[^\d]/g, "")) || 0, keterangan.trim());
      toast.success("Aturan approval disimpan");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Aturan Approval</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurasi ambang nominal yang menentukan jalur persetujuan transaksi.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Konfigurasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ambang">Ambang Persetujuan Bendahara (Rp)</Label>
                <Input
                  id="ambang"
                  inputMode="numeric"
                  value={Number(ambang.replace(/[^\d]/g, "") || 0).toLocaleString("id-ID")}
                  onChange={(e) => setAmbang(e.target.value.replace(/[^\d]/g, ""))}
                />
                <p className="text-xs text-muted-foreground">
                  Transaksi pengeluaran dengan nominal <b>di atas ambang ini</b> atau yang
                  berkategori <b>wajib bendahara</b> akan melalui jalur Bendahara → Ketua. Sisanya
                  cukup persetujuan Ketua saja.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ket">Keterangan (opsional)</Label>
                <Textarea
                  id="ket"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  rows={3}
                  placeholder="Catatan internal mengenai kebijakan ambang ini"
                />
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Pratinjau kebijakan</p>
                <p className="mt-1 text-muted-foreground">
                  ≤ {formatRupiah(Number(ambang.replace(/[^\d]/g, "")) || 0)}: Ketua saja
                  <br />≥ {formatRupiah((Number(ambang.replace(/[^\d]/g, "")) || 0) + 1)}: Bendahara → Ketua
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  <Save className="h-4 w-4" />
                  {busy ? "Menyimpan…" : "Simpan Aturan"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer, FileText } from "lucide-react";
import { getRingkasan, listTransaksi, listKategori, type Ringkasan } from "../lib/data";
import { formatRupiah, formatTanggal, formatTanggalSingkat, terbilangRupiah } from "../lib/format";
import { LABEL_STATUS, type Kategori, type Transaksi } from "../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({
    meta: [
      { title: "Laporan — Laporan FKUB" },
      { name: "description", content: "Laporan realisasi dana hibah dan buku kas umum." },
    ],
  }),
  component: LaporanPage,
});

function LaporanPage() {
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [trx, setTrx] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [r, t, k] = await Promise.all([getRingkasan(), listTransaksi({}), listKategori()]);
        if (!active) return;
        setRingkasan(r);
        setTrx(t);
        setKategori(k);
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

  const disetujui = useMemo(() => trx.filter((t) => t.status === "disetujui"), [trx]);

  // Saldo berjalan untuk buku kas umum (kumulatif)
  const bukuKas = useMemo(() => {
    const sorted = [...disetujui].sort(
      (a, b) => a.tanggal.localeCompare(b.tanggal) || a.created_at.localeCompare(b.created_at),
    );
    let saldo = 0;
    return sorted.map((t, i) => {
      const masuk = t.jenis === "pemasukan" ? t.jumlah : 0;
      const keluar = t.jenis === "pengeluaran" ? t.jumlah : 0;
      saldo += masuk - keluar;
      return { no: i + 1, t, masuk, keluar, saldo };
    });
  }, [disetujui]);

  if (loading || !ringkasan) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalPenerimaan = ringkasan.totalPemasukan;
  const totalPengeluaran = ringkasan.realisasi;
  const sisa = totalPenerimaan - totalPengeluaran;
  const periode = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Realisasi dana hibah & buku kas umum — siap cetak.
          </p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Cetak / PDF
        </Button>
      </header>

      {/* ===== Printable report ===== */}
      <div className="rounded-xl border bg-background p-6 md:p-10 print:rounded-none print:border-0 print:p-0">
        {/* Kop */}
        <div className="text-center">
          <h2 className="text-lg font-bold uppercase">Forum Kerukunan Umat Beragama (FKUB)</h2>
          <h3 className="text-base font-semibold uppercase">Kota Manado</h3>
          <p className="text-sm">Laporan Pertanggungjawaban Dana Hibah Tahun Anggaran {periode}</p>
          <div className="mx-auto my-3 h-px w-full bg-foreground/30" />
        </div>

        {/* I. Ringkasan */}
        <section className="mt-6">
          <h4 className="mb-3 text-sm font-bold uppercase underline">I. Ringkasan Keuangan</h4>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <RingkasanRow label="Total Penerimaan (Pemasukan)" value={totalPenerimaan} bold />
              <RingkasanRow label="Total Pengeluaran (Realisasi)" value={totalPengeluaran} bold />
              <RingkasanRow label="Sisa Saldo" value={sisa} bold />
              <RingkasanRow label="Total Pagu Anggaran" value={ringkasan.pagu} />
              <RingkasanRow
                label="Persentase Realisasi"
                value={ringkasan.persenRealisasi}
                suffix="%"
                isPercent
              />
            </tbody>
          </table>
          <p className="mt-2 text-xs italic text-muted-foreground">
            Terbilang saldo: {terbilangRupiah(sisa)}.
          </p>
        </section>

        {/* II. Realisasi per Kategori */}
        <section className="mt-6">
          <h4 className="mb-3 text-sm font-bold uppercase underline">
            II. Realisasi per Kategori Pengeluaran
          </h4>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y bg-muted/40 text-left text-xs uppercase">
                <th className="px-2 py-2 font-medium">No.</th>
                <th className="px-2 py-2 font-medium">Kategori</th>
                <th className="px-2 py-2 text-right font-medium">Pagu</th>
                <th className="px-2 py-2 text-right font-medium">Realisasi</th>
                <th className="px-2 py-2 text-right font-medium">Sisa</th>
                <th className="px-2 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {kategori
                .filter((k) => k.jenis === "pengeluaran")
                .map((k, i) => {
                  const realisasi =
                    ringkasan.perKategori.find((p) => p.kategori === k.nama)?.jumlah ?? 0;
                  const sisaK = k.pagu - realisasi;
                  const persen = k.pagu > 0 ? (realisasi / k.pagu) * 100 : 0;
                  return (
                    <tr key={k.id} className="border-b">
                      <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-2 py-2">{k.nama}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(k.pagu)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(realisasi)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(sisaK)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{persen.toFixed(1)}</td>
                    </tr>
                  );
                })}
              <tr className="border-y-2 font-semibold">
                <td className="px-2 py-2" colSpan={2}>
                  Total
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(ringkasan.pagu)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(ringkasan.realisasi)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(ringkasan.sisaPagu)}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {ringkasan.persenRealisasi.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* III. Buku Kas Umum */}
        <section className="mt-6">
          <h4 className="mb-3 text-sm font-bold uppercase underline">III. Buku Kas Umum</h4>
          {bukuKas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada transaksi yang disetujui.
            </p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-y bg-muted/40 text-left">
                  <th className="px-2 py-2 font-medium">No.</th>
                  <th className="px-2 py-2 font-medium">Tanggal</th>
                  <th className="px-2 py-2 font-medium">Uraian</th>
                  <th className="px-2 py-2 font-medium">Pihak</th>
                  <th className="px-2 py-2 text-right font-medium">Masuk</th>
                  <th className="px-2 py-2 text-right font-medium">Keluar</th>
                  <th className="px-2 py-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {bukuKas.map((r) => (
                  <tr key={r.t.id} className="border-b">
                    <td className="px-2 py-1.5 text-muted-foreground">{r.no}</td>
                    <td className="whitespace-nowrap px-2 py-1.5">{formatTanggalSingkat(r.t.tanggal)}</td>
                    <td className="px-2 py-1.5">{r.t.uraian}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.t.pihak ?? "—"}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-emerald-700">
                      {r.masuk ? formatRupiah(r.masuk) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
                      {r.keluar ? formatRupiah(r.keluar) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium tabular-nums">
                      {formatRupiah(r.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-y-2 font-semibold">
                  <td className="px-2 py-2" colSpan={4}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                    {formatRupiah(totalPenerimaan)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(totalPengeluaran)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(sisa)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {/* Tanda tangan */}
        <section className="mt-10 grid grid-cols-2 gap-8 text-center text-sm print:grid-cols-2">
          <div>
            <p className="font-medium">Mengetahui,</p>
            <p className="mb-16">Ketua FKUB Kota Manado</p>
            <p className="font-semibold underline">Pdt. Handrie M Dengah, M.Th.</p>
          </div>
          <div>
            <p className="font-medium">Manado, {formatTanggal(new Date().toISOString())}</p>
            <p className="mb-16">Bendahara</p>
            <p className="font-semibold underline">________________________</p>
          </div>
        </section>
      </div>

      {/* Non-print: transaksi yang belum disetujui */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Transaksi Belum Disetujui (tidak masuk laporan)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Uraian</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trx
                  .filter((t) => t.status !== "disetujui")
                  .map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-muted-foreground">{formatTanggal(t.tanggal)}</td>
                      <td className="px-4 py-3">{t.uraian}</td>
                      <td className={cn("px-4 py-3 text-right tabular-nums", t.jenis === "pemasukan" && "text-emerald-600")}>
                        {t.jenis === "pemasukan" ? "+" : "−"}
                        {formatRupiah(t.jumlah)}
                      </td>
                      <td className="px-4 py-3 text-xs">{LABEL_STATUS[t.status]}</td>
                    </tr>
                  ))}
                {trx.filter((t) => t.status !== "disetujui").length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Semua transaksi sudah disetujui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RingkasanRow({
  label,
  value,
  bold,
  suffix,
  isPercent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  suffix?: string;
  isPercent?: boolean;
}) {
  return (
    <tr className="border-b">
      <td className="py-2 pr-4 text-sm">{label}</td>
      <td className={cn("py-2 text-right tabular-nums", bold && "font-semibold")}>
        {isPercent ? value.toFixed(1) : formatRupiah(value)}
        {suffix}
      </td>
    </tr>
  );
}

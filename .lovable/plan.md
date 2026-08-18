# Aplikasi Laporan Dana Hibah FKUB — Kerangka (Tanpa Database)

Membangun kerangka aplikasi web untuk mencatat pemasukan/pengeluaran dan menghasilkan laporan seperti format laporan FKUB Kota Manado, dengan tiga peran (Admin, Ketua, Bendahara) yang masing-masing punya dashboard sendiri. Semua data memakai data contoh di memori (mock) — belum ada database.

## Peran & Akses

- **Admin**: kelola pengguna (mock), master kategori/mata anggaran, semua transaksi, semua laporan.
- **Bendahara**: input & edit pemasukan/pengeluaran, buku kas, rekonsiliasi saldo bank, ajukan laporan.
- **Ketua**: hanya baca — ringkasan realisasi anggaran, grafik per kategori, verifikasi/persetujuan laporan, halaman tanda tangan laporan.

Pemilih peran sederhana di halaman masuk (tanpa autentikasi asli), peran disimpan di state client + localStorage supaya bisa berpindah peran saat demo.

## Halaman

```text
/                      Landing + pilih peran (masuk demo)
/admin                 Dashboard Admin
/admin/pengguna        Daftar pengguna (mock)
/admin/kategori        Master kategori & mata anggaran
/bendahara             Dashboard Bendahara
/bendahara/pemasukan   Daftar + form pemasukan
/bendahara/pengeluaran Daftar + form pengeluaran
/bendahara/buku-kas    Buku kas umum (debit/kredit/saldo)
/ketua                 Dashboard Ketua
/ketua/persetujuan     Verifikasi & persetujuan laporan
/laporan               Laporan realisasi (siap cetak)
```

## Dashboard per peran

- **Admin**: kartu total pemasukan, total realisasi, saldo buku, jumlah transaksi; aktivitas terbaru; status kelengkapan data.
- **Bendahara**: saldo kas & bank, selisih rekonsiliasi, realisasi per kategori (progress bar terhadap pagu), transaksi terakhir, aksi cepat input.
- **Ketua**: persentase serapan anggaran, grafik donut/bar realisasi per kategori, tren bulanan, daftar laporan menunggu persetujuan.

## Form

- **Pemasukan**: tanggal, sumber dana (hibah/bunga bank/saldo awal/lain), uraian, jumlah, no. bukti, keterangan.
- **Pengeluaran**: tanggal, kategori (honorarium, tunjangan operasional, ATK, rapat, perjalanan, dll.), mata anggaran, uraian, volume × satuan × harga (jumlah terhitung otomatis), no. bukti, penerima.
- Validasi form dengan react-hook-form + zod; notifikasi memakai sonner.

## Laporan

Halaman `/laporan` mereplikasi struktur laporan asli:
- Kop laporan (judul, tahun anggaran, nama lembaga)
- Tabel A. Penerimaan; B. Pengeluaran per kategori dengan sub-total
- Grand total realisasi, saldo akhir buku vs rekening koran + baris selisih
- Blok tanda tangan (Bendahara, Ketua)
- Tombol Cetak (print CSS) — ekspor PDF/Excel belum diaktifkan di kerangka ini

## Desain

Tema formal-institusional: hijau tua/emas lembut, tipografi serif untuk judul + sans untuk isi, tabel rapi bergaris, siap cetak. Semua warna sebagai token semantik di `src/styles.css`.

## Catatan teknis

- Routing file-based TanStack Router: `src/routes/index.tsx` ditulis ulang jadi halaman masuk; layout per peran (`admin.tsx`, `bendahara.tsx`, `ketua.tsx`) dengan `<Outlet />` + sidebar.
- Store client: `src/lib/store/` (React context + reducer) menyimpan transaksi, kategori, pengguna, dan peran aktif; data awal diisi dari angka laporan FKUB 2025 sebagai contoh.
- Helper perhitungan (total, saldo, rekap per kategori, format rupiah) di `src/lib/keuangan.ts`.
- Grafik memakai recharts; komponen UI dari shadcn yang sudah tersedia.
- Setiap route punya `head()` sendiri (title/description/og).
- Tanpa server function, tanpa Lovable Cloud — semua data hilang saat refresh kecuali peran aktif.

## Di luar cakupan

Autentikasi nyata, penyimpanan permanen, unggah bukti transaksi, ekspor PDF/Excel, audit log.

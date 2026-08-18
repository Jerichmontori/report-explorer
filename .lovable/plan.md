# Aplikasi Laporan Dana Hibah FKUB — dengan Backend InsForge

Aplikasi web untuk mencatat pemasukan/pengeluaran, alur persetujuan transaksi berjenjang, dan menghasilkan laporan seperti format laporan FKUB Kota Manado. Empat peran (Admin, Kasir, Bendahara, Ketua), masing-masing dengan dashboard sendiri. Data persisten dan autentikasi nyata memakai **InsForge** sebagai backend.

## Setup InsForge (langkah pertama implementasi)

1. Login InsForge CLI memakai user API key (disimpan sebagai secret via `secrets--add_secret`, tidak ditulis ulang di kode/plan).
2. Install InsForge CLI + skills untuk project ini, lalu link ke project-id `79676ace-301b-4cc6-9a82-2b142a17ae1d`.
3. Ikuti skill InsForge untuk membuat skema/tabel backend (pengguna, kategori, transaksi + riwayat approval, aturan approval, status laporan).
4. Verifikasi koneksi & endpoint InsForge berfungsi sebelum lanjut membangun UI; jika skill/CLI tidak tersedia, hentikan dan laporkan.

> Backend memakai InsForge (bukan Lovable Cloud/Supabase). Semua tugas backend dijalankan lewat InsForge CLI & skill sesuai instruksi pengguna.

## Peran & Akses

- **Admin**: kelola pengguna, master kategori/mata anggaran & aturan persetujuan, lihat semua transaksi dan laporan.
- **Kasir**: satu-satunya peran yang menginput/mengedit transaksi pemasukan & pengeluaran, mengajukan transaksi untuk persetujuan, mengelola buku kas.
- **Bendahara**: tidak menginput transaksi; memverifikasi/menyetujui transaksi yang butuh persetujuan bendahara, rekonsiliasi saldo bank, ajukan laporan.
- **Ketua**: menyetujui semua transaksi (persetujuan final), verifikasi laporan, halaman tanda tangan laporan.

Autentikasi nyata via InsForge; sesi/peran aktif disimpan di server. Halaman masuk memakai kredensial InsForge.

## Alur persetujuan transaksi

Setiap transaksi dibuat Kasir berstatus `draft` lalu `diajukan`. Jalur persetujuan ditentukan aturan (ambang nilai / kategori) yang diatur di halaman Admin:

- **Jalur 1 — Ketua saja**: transaksi rutin / bernilai kecil. `diajukan` → Ketua setuju → `disetujui`.
- **Jalur 2 — Bendahara lalu Ketua**: transaksi bernilai besar / kategori tertentu. `diajukan` → Bendahara setuju (`menunggu_ketua`) → Ketua setuju → `disetujui`.

Setiap penyetuju dapat menolak dengan catatan (status `ditolak`, kembali ke Kasir untuk revisi). Riwayat persetujuan (siapa, kapan, catatan) ditampilkan pada detail transaksi. Hanya transaksi berstatus `disetujui` yang masuk buku kas & laporan realisasi; transaksi pending ditampilkan terpisah.

## Halaman

```text
/                       Halaman masuk (login InsForge)
/admin                  Dashboard Admin
/admin/pengguna         Daftar pengguna
/admin/kategori         Master kategori & mata anggaran
/admin/aturan-approval  Aturan jalur persetujuan (ambang nilai, kategori)
/kasir                  Dashboard Kasir
/kasir/pemasukan        Daftar + form pemasukan
/kasir/pengeluaran      Daftar + form pengeluaran
/kasir/buku-kas         Buku kas umum (debit/kredit/saldo)
/bendahara              Dashboard Bendahara
/bendahara/persetujuan  Antrean transaksi butuh persetujuan bendahara
/bendahara/rekonsiliasi Rekonsiliasi saldo buku vs rekening koran
/ketua                  Dashboard Ketua
/ketua/persetujuan      Antrean transaksi (tab: Ketua saja | Setelah Bendahara)
/ketua/laporan          Verifikasi & persetujuan laporan
/laporan                Laporan realisasi (siap cetak)
```

## Dashboard per peran

- **Admin**: kartu total pemasukan, total realisasi, saldo buku, jumlah transaksi per status; aktivitas terbaru; ringkasan antrean persetujuan.
- **Kasir**: saldo kas, transaksi hari ini, aksi cepat input pemasukan/pengeluaran, daftar transaksi ditolak yang perlu revisi, status pengajuan.
- **Bendahara**: jumlah transaksi menunggu persetujuannya, nilai yang menunggu, selisih rekonsiliasi, realisasi per kategori (progress terhadap pagu).
- **Ketua**: persentase serapan anggaran, grafik donut/bar realisasi per kategori, tren bulanan, dua kartu antrean persetujuan (jalur Ketua saja & jalur setelah Bendahara), laporan menunggu tanda tangan.

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
- Tombol Cetak (print CSS) — ekspor PDF/Excel belum diaktifkan di tahap ini

## Desain

Tema formal-institusional: hijau tua/emas lembut, tipografi serif untuk judul + sans untuk isi, tabel rapi bergaris, siap cetak. Semua warna sebagai token semantik di `src/styles.css`.

## Catatan teknis

- Routing file-based TanStack Router: `src/routes/index.tsx` ditulis ulang jadi halaman masuk; layout per peran (`admin.tsx`, `kasir.tsx`, `bendahara.tsx`, `ketua.tsx`) dengan `<Outlet />` + sidebar.
- Backend: InsForge untuk autentikasi + penyimpanan (tabel pengguna, kategori, transaksi + riwayat approval, aturan approval, status laporan). Akses data via server function/server route sesuai pola InsForge skill.
- Helper perhitungan (total, saldo, rekap per kategori, format rupiah) dan logika alur persetujuan (`tentukanJalurApproval`, `langkahBerikutnya`) di `src/lib/keuangan.ts` & `src/lib/approval.ts`.
- Grafik memakai recharts; komponen UI dari shadcn yang sudah tersedia.
- Setiap route punya `head()` sendiri (title/description/og).

## Di luar cakupan

Unggah bukti transaksi, ekspor PDF/Excel, audit log.

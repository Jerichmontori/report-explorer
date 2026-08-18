# Aplikasi Laporan Dana Hibah FKUB — Kerangka (Tanpa Database)

Membangun kerangka aplikasi web untuk mencatat pemasukan/pengeluaran dan menghasilkan laporan seperti format laporan FKUB Kota Manado, dengan empat peran (Admin, Kasir, Bendahara, Ketua) yang masing-masing punya dashboard sendiri, plus alur persetujuan transaksi berjenjang. Semua data memakai data contoh di memori (mock) — belum ada database.

## Peran & Akses

- **Admin**: kelola pengguna (mock), master kategori/mata anggaran & aturan persetujuan, lihat semua transaksi dan laporan.
- **Kasir**: satu-satunya peran yang menginput/mengedit transaksi pemasukan & pengeluaran, mengajukan transaksi untuk persetujuan, mengelola buku kas.
- **Bendahara**: tidak menginput transaksi; memverifikasi/menyetujui transaksi yang membutuhkan persetujuan bendahara, rekonsiliasi saldo bank, ajukan laporan.
- **Ketua**: menyetujui semua transaksi (persetujuan final), verifikasi laporan, halaman tanda tangan laporan.

Pemilih peran sederhana di halaman masuk (tanpa autentikasi asli), peran disimpan di state client + localStorage supaya bisa berpindah peran saat demo.

## Alur persetujuan transaksi

Setiap transaksi dibuat Kasir dengan status `draft` lalu `diajukan`. Jalur persetujuan ditentukan aturan (mis. ambang nilai / kategori) yang bisa diatur di halaman Admin:

- **Jalur 1 — Ketua saja**: transaksi rutin / bernilai kecil. `diajukan` → Ketua setuju → `disetujui`.
- **Jalur 2 — Bendahara lalu Ketua**: transaksi bernilai besar atau kategori tertentu. `diajukan` → Bendahara setuju (`menunggu ketua`) → Ketua setuju → `disetujui`.

Setiap penyetuju dapat menolak dengan catatan (status `ditolak`, kembali ke Kasir untuk revisi). Riwayat persetujuan (siapa, kapan, catatan) ditampilkan pada detail transaksi. Hanya transaksi berstatus `disetujui` yang masuk ke buku kas dan laporan realisasi; transaksi pending ditampilkan terpisah sebagai informasi.

## Halaman

```text
/                       Landing + pilih peran (masuk demo)
/admin                  Dashboard Admin
/admin/pengguna         Daftar pengguna (mock)
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
- Tombol Cetak (print CSS) — ekspor PDF/Excel belum diaktifkan di kerangka ini

## Desain

Tema formal-institusional: hijau tua/emas lembut, tipografi serif untuk judul + sans untuk isi, tabel rapi bergaris, siap cetak. Semua warna sebagai token semantik di `src/styles.css`.

## Catatan teknis

- Routing file-based TanStack Router: `src/routes/index.tsx` ditulis ulang jadi halaman masuk; layout per peran (`admin.tsx`, `kasir.tsx`, `bendahara.tsx`, `ketua.tsx`) dengan `<Outlet />` + sidebar.
- Store client: `src/lib/store/` (React context + reducer) menyimpan transaksi (beserta status & riwayat persetujuan), kategori, aturan approval, pengguna, dan peran aktif; data awal diisi dari angka laporan FKUB 2025 sebagai contoh.
- Helper perhitungan (total, saldo, rekap per kategori, format rupiah) dan logika alur persetujuan (`tentukanJalurApproval`, `langkahBerikutnya`) di `src/lib/keuangan.ts` dan `src/lib/approval.ts`.

- Grafik memakai recharts; komponen UI dari shadcn yang sudah tersedia.
- Setiap route punya `head()` sendiri (title/description/og).
- Tanpa server function, tanpa Lovable Cloud — semua data hilang saat refresh kecuali peran aktif.

## Di luar cakupan

Autentikasi nyata, penyimpanan permanen, unggah bukti transaksi, ekspor PDF/Excel, audit log.

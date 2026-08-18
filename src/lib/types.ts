export type Peran = "admin" | "kasir" | "bendahara" | "ketua";

export type JenisTransaksi = "pemasukan" | "pengeluaran";

export type StatusTransaksi =
  | "draft"
  | "diajukan"
  | "menunggu_ketua"
  | "disetujui"
  | "ditolak";

export type JalurApproval = "ketua" | "bendahara_ketua";

export interface LangkahApproval {
  peran: Peran;
  aksi: "diajukan" | "disetujui" | "ditolak" | "direvisi";
  oleh: string;
  waktu: string;
  catatan?: string;
}

export interface Transaksi {
  id: string;
  jenis: JenisTransaksi;
  tanggal: string;
  kategoriId: string;
  mataAnggaran?: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
  jumlah: number;
  noBukti: string;
  pihak: string;
  status: StatusTransaksi;
  jalur: JalurApproval;
  riwayat: LangkahApproval[];
  dibuatOleh: string;
}

export interface Kategori {
  id: string;
  nama: string;
  jenis: JenisTransaksi;
  pagu: number;
  wajibBendahara?: boolean;
}

export interface Pengguna {
  id: string;
  nama: string;
  jabatan: string;
  peran: Peran;
  aktif: boolean;
}

export interface AturanApproval {
  ambangBendahara: number;
  kategoriWajibBendahara: string[];
}

export interface StatusLaporan {
  id: string;
  periode: string;
  diajukanBendahara: boolean;
  disetujuiKetua: boolean;
  catatan?: string;
}

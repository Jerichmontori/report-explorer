// Tipe domain aplikasi Laporan FKUB — mencerminkan skema basis data InsForge.

export type Peran = "admin" | "kasir" | "bendahara" | "ketua";

export type JenisTransaksi = "pemasukan" | "pengeluaran";

export type StatusTransaksi =
  | "draft"
  | "diajukan"
  | "menunggu_bendahara"
  | "disetujui_bendahara"
  | "menunggu_ketua"
  | "disetujui"
  | "ditolak";

export type JalurApproval = "ketua_saja" | "bendahara_ketua";

export type AksiApproval = "diajukan" | "setujui" | "tolak";

export interface Kategori {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisTransaksi;
  pagu: number;
  wajib_bendahara: boolean;
  urutan: number;
}

export interface Transaksi {
  id: string;
  jenis: JenisTransaksi;
  tanggal: string;
  kategori_id: string | null;
  mata_anggaran: string | null;
  uraian: string;
  volume: number;
  satuan: string | null;
  harga_satuan: number;
  jumlah: number;
  no_bukti: string | null;
  pihak: string | null;
  status: StatusTransaksi;
  jalur: JalurApproval;
  dibuat_oleh: string | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  // relasi (optional, saat di-join)
  kategori?: Kategori | null;
}

export interface ApprovalLog {
  id: string;
  transaksi_id: string;
  peran: Peran;
  aksi: AksiApproval;
  oleh: string | null;
  catatan: string | null;
  waktu: string;
}

export interface AturanApproval {
  id: number;
  ambang_bendahara: number;
  keterangan: string | null;
}

export interface StatusLaporan {
  id: string;
  periode: string;
  diajukan_bendahara: boolean;
  disetujui_ketua: boolean;
  catatan: string | null;
  updated_at: string;
}

export interface SesiPengguna {
  id: string;
  email: string;
  name: string;
  peran: Peran | null;
}

export const LABEL_STATUS: Record<StatusTransaksi, string> = {
  draft: "Draft",
  diajukan: "Diajukan",
  menunggu_bendahara: "Menunggu Bendahara",
  disetujui_bendahara: "Disetujui Bendahara",
  menunggu_ketua: "Menunggu Ketua",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const LABEL_PERAN: Record<Peran, string> = {
  admin: "Administrator",
  kasir: "Kasir",
  bendahara: "Bendahara",
  ketua: "Ketua",
};

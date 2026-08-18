import { insforge } from "./insforge";
import type {
  AksiApproval,
  AturanApproval,
  ApprovalLog,
  JalurApproval,
  Kategori,
  Peran,
  StatusLaporan,
  StatusTransaksi,
  Transaksi,
} from "./types";

// ===================== Kategori =====================
export async function listKategori(): Promise<Kategori[]> {
  const { data, error } = await insforge.database
    .from("kategori")
    .select("id, kode, nama, jenis, pagu, wajib_bendahara, urutan")
    .order("urutan", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Kategori[];
}

export async function upsertKategori(k: Partial<Kategori> & { kode: string; nama: string; jenis: Kategori["jenis"] }): Promise<void> {
  const payload = {
    kode: k.kode,
    nama: k.nama,
    jenis: k.jenis,
    pagu: Number(k.pagu ?? 0),
    wajib_bendahara: Boolean(k.wajib_bendahara),
    urutan: Number(k.urutan ?? 0),
  };
  if (k.id) {
    const { error } = await insforge.database.from("kategori").update(payload).eq("id", k.id);
    if (error) throw error;
  } else {
    const { error } = await insforge.database.from("kategori").insert([payload]);
    if (error) throw error;
  }
}

export async function hapusKategori(id: string): Promise<void> {
  const { error } = await insforge.database.from("kategori").delete().eq("id", id);
  if (error) throw error;
}

// ===================== Aturan =====================
export async function getAturan(): Promise<AturanApproval> {
  const { data, error } = await insforge.database
    .from("aturan_approval")
    .select("id, ambang_bendahara, keterangan")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data as AturanApproval;
}

export async function updateAturan(ambang: number, keterangan: string): Promise<void> {
  const { error } = await insforge.database
    .from("aturan_approval")
    .update({ ambang_bendahara: Number(ambang), keterangan })
    .eq("id", 1);
  if (error) throw error;
}

// ===================== Transaksi =====================
export interface FilterTransaksi {
  status?: StatusTransaksi;
  jenis?: Transaksi["jenis"];
  kategori_id?: string;
  dari?: string;
  sampai?: string;
  q?: string;
}

export async function listTransaksi(filter: FilterTransaksi = {}): Promise<Transaksi[]> {
  let q = insforge.database
    .from("transaksi")
    .select("id, jenis, tanggal, kategori_id, mata_anggaran, uraian, volume, satuan, harga_satuan, jumlah, no_bukti, pihak, status, jalur, dibuat_oleh, catatan, created_at, updated_at, kategori(id, kode, nama, jenis, pagu, wajib_bendahara, urutan)")
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.jenis) q = q.eq("jenis", filter.jenis);
  if (filter.kategori_id) q = q.eq("kategori_id", filter.kategori_id);
  if (filter.dari) q = q.gte("tanggal", filter.dari);
  if (filter.sampai) q = q.lte("tanggal", filter.sampai);
  const { data, error } = await q;
  if (error) throw error;
  let rows = normalizeTransaksi(data ?? []);
  if (filter.q) {
    const s = filter.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.uraian?.toLowerCase().includes(s) ||
        r.pihak?.toLowerCase().includes(s) ||
        r.no_bukti?.toLowerCase().includes(s),
    );
  }
  return rows;
}

// PostgREST mengembalikan relasi sebagai array; konversi ke objek tunggal.
function normalizeTransaksi(rows: unknown[]): Transaksi[] {
  return (rows as Record<string, unknown>[]).map((r) => ({
    ...r,
    kategori: Array.isArray(r.kategori) ? (r.kategori[0] as Kategori | undefined) ?? null : (r.kategori as Kategori | null | undefined) ?? null,
  })) as unknown as Transaksi[];
}

export async function getTransaksi(id: string): Promise<Transaksi | null> {
  const { data, error } = await insforge.database
    .from("transaksi")
    .select("id, jenis, tanggal, kategori_id, mata_anggaran, uraian, volume, satuan, harga_satuan, jumlah, no_bukti, pihak, status, jalur, dibuat_oleh, catatan, created_at, updated_at, kategori(id, kode, nama, jenis, pagu, wajib_bendahara, urutan)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeTransaksi([data])[0];
}

export interface InputTransaksi {
  jenis: Transaksi["jenis"];
  tanggal: string;
  kategori_id: string | null;
  mata_anggaran?: string;
  uraian: string;
  volume: number;
  satuan?: string;
  harga_satuan: number;
  no_bukti?: string;
  pihak?: string;
  catatan?: string;
}

export async function createTransaksi(input: InputTransaksi): Promise<Transaksi> {
  const { data, error } = await insforge.database
    .from("transaksi")
    .insert([
      {
        jenis: input.jenis,
        tanggal: input.tanggal,
        kategori_id: input.kategori_id,
        mata_anggaran: input.mata_anggaran ?? null,
        uraian: input.uraian,
        volume: Number(input.volume),
        satuan: input.satuan ?? null,
        harga_satuan: Number(input.harga_satuan),
        no_bukti: input.no_bukti ?? null,
        pihak: input.pihak ?? null,
        catatan: input.catatan ?? null,
        status: "draft",
        jalur: "ketua_saja",
      },
    ])
    .select("id, jenis, tanggal, kategori_id, mata_anggaran, uraian, volume, satuan, harga_satuan, jumlah, no_bukti, pihak, status, jalur, dibuat_oleh, catatan, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as Transaksi;
}

export async function updateTransaksi(id: string, input: Partial<InputTransaksi>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.jenis !== undefined) payload.jenis = input.jenis;
  if (input.tanggal !== undefined) payload.tanggal = input.tanggal;
  if (input.kategori_id !== undefined) payload.kategori_id = input.kategori_id;
  if (input.mata_anggaran !== undefined) payload.mata_anggaran = input.mata_anggaran || null;
  if (input.uraian !== undefined) payload.uraian = input.uraian;
  if (input.volume !== undefined) payload.volume = Number(input.volume);
  if (input.satuan !== undefined) payload.satuan = input.satuan || null;
  if (input.harga_satuan !== undefined) payload.harga_satuan = Number(input.harga_satuan);
  if (input.no_bukti !== undefined) payload.no_bukti = input.no_bukti || null;
  if (input.pihak !== undefined) payload.pihak = input.pihak || null;
  if (input.catatan !== undefined) payload.catatan = input.catatan || null;
  const { error } = await insforge.database.from("transaksi").update(payload).eq("id", id);
  if (error) throw error;
}

export async function hapusTransaksi(id: string): Promise<void> {
  const { error } = await insforge.database.from("transaksi").delete().eq("id", id);
  if (error) throw error;
}

// ===================== Approval =====================
function hitungJalur(jumlah: number, wajibBendahara: boolean, ambang: number): JalurApproval {
  if (wajibBendahara || jumlah > ambang) return "bendahara_ketua";
  return "ketua_saja";
}

export async function ajukanTransaksi(id: string): Promise<void> {
  const trx = await getTransaksi(id);
  if (!trx) throw new Error("Transaksi tidak ditemukan");
  const kategori = trx.kategori;
  const aturan = await getAturan();
  const jalur = hitungJalur(trx.jumlah, Boolean(kategori?.wajib_bendahara), aturan.ambang_bendahara);
  const status: StatusTransaksi = jalur === "bendahara_ketua" ? "menunggu_bendahara" : "menunggu_ketua";
  const { error } = await insforge.database
    .from("transaksi")
    .update({ status, jalur })
    .eq("id", id);
  if (error) throw error;
  await catatApproval(id, "kasir", "diajukan", `Diajukan untuk persetujuan (jalur: ${jalur}).`);
}

async function catatApproval(transaksiId: string, peran: Peran, aksi: AksiApproval, catatan: string): Promise<void> {
  const { error } = await insforge.database.from("approval_log").insert([
    { transaksi_id: transaksiId, peran, aksi, catatan },
  ]);
  if (error) throw error;
}

export async function setujuiTransaksi(id: string, catatan: string, peran: Peran): Promise<void> {
  const trx = await getTransaksi(id);
  if (!trx) throw new Error("Transaksi tidak ditemukan");
  let status: StatusTransaksi;
  if (peran === "bendahara" && trx.status === "menunggu_bendahara") {
    status = "menunggu_ketua";
  } else if (peran === "ketua" && trx.status === "menunggu_ketua") {
    status = "disetujui";
  } else {
    throw new Error("Anda tidak dapat menyetujui transaksi pada status ini.");
  }
  const { error } = await insforge.database.from("transaksi").update({ status }).eq("id", id);
  if (error) throw error;
  await catatApproval(id, peran, "setujui", catatan || "Disetujui.");
}

export async function tolakTransaksi(id: string, catatan: string, peran: Peran): Promise<void> {
  const { error } = await insforge.database.from("transaksi").update({ status: "ditolak" }).eq("id", id);
  if (error) throw error;
  await catatApproval(id, peran, "tolak", catatan || "Ditolak.");
}

export async function listApprovalLog(transaksiId: string): Promise<ApprovalLog[]> {
  const { data, error } = await insforge.database
    .from("approval_log")
    .select("id, transaksi_id, peran, aksi, oleh, catatan, waktu")
    .eq("transaksi_id", transaksiId)
    .order("waktu", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ApprovalLog[];
}

// ===================== Status Laporan =====================
export async function listStatusLaporan(): Promise<StatusLaporan[]> {
  const { data, error } = await insforge.database
    .from("status_laporan")
    .select("id, periode, diajukan_bendahara, disetujui_ketua, catatan, updated_at")
    .order("periode", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StatusLaporan[];
}

export async function upsertStatusLaporan(
  periode: string,
  patch: Partial<Pick<StatusLaporan, "diajukan_bendahara" | "disetujui_ketua" | "catatan">>,
): Promise<void> {
  // Cek apakah sudah ada
  const { data: existing } = await insforge.database
    .from("status_laporan")
    .select("id")
    .eq("periode", periode)
    .maybeSingle();
  if (existing) {
    const { error } = await insforge.database
      .from("status_laporan")
      .update(patch)
      .eq("id", (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await insforge.database
      .from("status_laporan")
      .insert([{ periode, ...patch }]);
    if (error) throw error;
  }
}

// ===================== Pengguna & Peran =====================
export interface PenggunaLengkap {
  id: string;
  email: string;
  nama: string | null;
  peran: Peran | null;
}

export async function listPengguna(): Promise<PenggunaLengkap[]> {
  const { data, error } = await insforge.database
    .from("profil_pengguna")
    .select("id, email, nama, user_roles(role)")
    .order("email", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    email: string;
    nama: string | null;
    user_roles: { role: Peran }[] | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    nama: r.nama,
    peran: r.user_roles && r.user_roles.length > 0 ? r.user_roles[0].role : null,
  }));
}

export async function aturPeran(userId: string, peran: Peran | null): Promise<void> {
  // Hapus peran lama (admin) lalu tambahkan yang baru
  const { error: delErr } = await insforge.database.from("user_roles").delete().eq("user_id", userId);
  if (delErr) throw delErr;
  if (peran) {
    const { error } = await insforge.database.from("user_roles").insert([{ user_id: userId, role: peran }]);
    if (error) throw error;
  }
}

export async function bootstrapAdmin(): Promise<void> {
  const { error } = await insforge.database.from("user_roles").insert([{ role: "admin" }]);
  if (error) throw error;
}

// ===================== Ringkasan Dashboard =====================
export interface Ringkasan {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  pagu: number;
  realisasi: number;
  sisaPagu: number;
  persenRealisasi: number;
  jumlahTransaksi: number;
  menungguApproval: number;
  perKategori: { kategori: string; jumlah: number; pagu: number }[];
  perStatus: { status: StatusTransaksi; jumlah: number }[];
}

export async function getRingkasan(): Promise<Ringkasan> {
  const [trx, kategori] = await Promise.all([listTransaksi(), listKategori()]);
  const disetujui = trx.filter((t) => t.status === "disetujui");
  const pemasukan = disetujui.filter((t) => t.jenis === "pemasukan").reduce((s, t) => s + t.jumlah, 0);
  const pengeluaran = disetujui.filter((t) => t.jenis === "pengeluaran").reduce((s, t) => s + t.jumlah, 0);
  const pagu = kategori.filter((k) => k.jenis === "pengeluaran").reduce((s, k) => s + k.pagu, 0);
  const realisasi = pengeluaran;
  const perKategoriMap = new Map<string, { jumlah: number; pagu: number }>();
  for (const k of kategori) {
    if (k.jenis === "pengeluaran") perKategoriMap.set(k.nama, { jumlah: 0, pagu: k.pagu });
  }
  for (const t of disetujui) {
    if (t.jenis === "pengeluaran" && t.kategori) {
      const e = perKategoriMap.get(t.kategori.nama);
      if (e) e.jumlah += t.jumlah;
    }
  }
  const perStatusMap = new Map<StatusTransaksi, number>();
  for (const t of trx) perStatusMap.set(t.status, (perStatusMap.get(t.status) ?? 0) + 1);
  return {
    totalPemasukan: pemasukan,
    totalPengeluaran: pengeluaran,
    saldo: pemasukan - pengeluaran,
    pagu,
    realisasi,
    sisaPagu: pagu - realisasi,
    persenRealisasi: pagu > 0 ? (realisasi / pagu) * 100 : 0,
    jumlahTransaksi: trx.length,
    menungguApproval: trx.filter((t) => t.status === "menunggu_bendahara" || t.status === "menunggu_ketua").length,
    perKategori: Array.from(perKategoriMap.entries()).map(([kategori, v]) => ({ kategori, ...v })),
    perStatus: Array.from(perStatusMap.entries()).map(([status, jumlah]) => ({ status, jumlah })),
  };
}

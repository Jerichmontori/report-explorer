-- =========================================================
-- FKUB Laporan - Skema basis data
-- =========================================================

-- Tipe enumerasi
CREATE TYPE app_role AS ENUM ('admin', 'kasir', 'bendahara', 'ketua');
CREATE TYPE jenis_transaksi AS ENUM ('pemasukan', 'pengeluaran');
CREATE TYPE status_transaksi AS ENUM (
  'draft',
  'diajukan',
  'menunggu_bendahara',
  'disetujui_bendahara',
  'menunggu_ketua',
  'disetujui',
  'ditolak'
);
CREATE TYPE jalur_approval AS ENUM ('ketua_saja', 'bendahara_ketua');
CREATE TYPE aksi_approval AS ENUM ('diajukan', 'setujui', 'tolak');

-- =========================================================
-- Peran pengguna
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Setiap pengguna terautentikasi dapat melihat semua peran (keperluan pengecekan)
CREATE POLICY "user_roles_select_authenticated"
  ON public.user_roles FOR SELECT TO authenticated
  USING (true);

-- =========================================================
-- Fungsi has_role (SECURITY DEFINER, hindari rekursi RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- =========================================================
-- Kategori
-- =========================================================
CREATE TABLE public.kategori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  jenis jenis_transaksi NOT NULL,
  pagu numeric(15,2) NOT NULL DEFAULT 0,
  wajib_bendahara boolean NOT NULL DEFAULT false,
  urutan int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kategori TO authenticated;
GRANT ALL ON public.kategori TO service_role;
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kategori_read" ON public.kategori FOR SELECT TO authenticated USING (true);
CREATE POLICY "kategori_write_admin" ON public.kategori
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Transaksi
-- =========================================================
CREATE TABLE public.transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis jenis_transaksi NOT NULL,
  tanggal date NOT NULL,
  kategori_id uuid REFERENCES public.kategori(id) ON DELETE SET NULL,
  mata_anggaran text,
  uraian text NOT NULL,
  volume numeric(15,2) NOT NULL DEFAULT 1,
  satuan text,
  harga_satuan numeric(15,2) NOT NULL DEFAULT 0,
  jumlah numeric(15,2) GENERATED ALWAYS AS (volume * harga_satuan) STORED,
  no_bukti text,
  pihak text,
  status status_transaksi NOT NULL DEFAULT 'draft',
  jalur jalur_approval NOT NULL DEFAULT 'ketua_saja',
  dibuat_oleh uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaksi TO authenticated;
GRANT ALL ON public.transaksi TO service_role;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transaksi_read" ON public.transaksi FOR SELECT TO authenticated USING (true);
-- Kasir dapat membuat/mengubah transaksi yang masih draft
CREATE POLICY "transaksi_insert_kasir" ON public.transaksi
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'kasir'));
CREATE POLICY "transaksi_update_kasir" ON public.transaksi
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'kasir') AND status = 'draft')
  WITH CHECK (public.has_role(auth.uid(), 'kasir'));

CREATE TRIGGER transaksi_updated_at
  BEFORE UPDATE ON public.transaksi
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- =========================================================
-- Riwayat approval
-- =========================================================
CREATE TABLE public.approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaksi_id uuid NOT NULL REFERENCES public.transaksi(id) ON DELETE CASCADE,
  peran app_role NOT NULL,
  aksi aksi_approval NOT NULL,
  oleh uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  catatan text,
  waktu timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_log TO authenticated;
GRANT ALL ON public.approval_log TO service_role;
ALTER TABLE public.approval_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_log_read" ON public.approval_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_log_insert" ON public.approval_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), peran));

-- =========================================================
-- Aturan approval (konfigurasi tunggal)
-- =========================================================
CREATE TABLE public.aturan_approval (
  id int PRIMARY KEY DEFAULT 1,
  ambang_bendahara numeric(15,2) NOT NULL DEFAULT 5000000,
  keterangan text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id = 1)
);

GRANT SELECT, UPDATE ON public.aturan_approval TO authenticated;
GRANT ALL ON public.aturan_approval TO service_role;
ALTER TABLE public.aturan_approval ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aturan_read" ON public.aturan_approval FOR SELECT TO authenticated USING (true);
CREATE POLICY "aturan_update_admin" ON public.aturan_approval
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Status laporan (verifikasi laporan periode)
-- =========================================================
CREATE TABLE public.status_laporan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode text NOT NULL UNIQUE,
  diajukan_bendahara boolean NOT NULL DEFAULT false,
  disetujui_ketua boolean NOT NULL DEFAULT false,
  catatan text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.status_laporan TO authenticated;
GRANT ALL ON public.status_laporan TO service_role;
ALTER TABLE public.status_laporan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_laporan_read" ON public.status_laporan FOR SELECT TO authenticated USING (true);
CREATE POLICY "status_laporan_write" ON public.status_laporan
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'bendahara') OR public.has_role(auth.uid(), 'ketua'))
  WITH CHECK (public.has_role(auth.uid(), 'bendahara') OR public.has_role(auth.uid(), 'ketua'));

-- =========================================================
-- Seed: kategori & aturan
-- =========================================================
INSERT INTO public.aturan_approval (id, ambang_bendahara, keterangan) VALUES
  (1, 5000000, 'Transaksi di atas ambang ini wajib melalui persetujuan bendahara dan ketua.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.kategori (kode, nama, jenis, pagu, wajib_bendahara, urutan) VALUES
  ('DANA-HIBAH', 'Dana Hibah', 'pemasukan', 1000000000, false, 1),
  ('HON-PEJABAT', 'Honorarium Pejabat & Staf', 'pengeluaran', 630000000, false, 2),
  ('HON-LAIN', 'Honorarium Lainnya', 'pengeluaran', 40000000, false, 3),
  ('OPR-BEND', 'Uang Operasional Bendahara', 'pengeluaran', 58800000, false, 4),
  ('FGD-REMATRA', 'FGD Dialog Antar Iman Remaja', 'pengeluaran', 30000000, true, 5),
  ('FGD-GEREJA', 'FGD Keamanan Gereja', 'pengeluaran', 25000000, true, 6),
  ('RAP-NAS', 'Rapat Nasional FKUB', 'pengeluaran', 35000000, true, 7),
  ('SEK-IT', 'Sekretariat - IT & Komunikasi', 'pengeluaran', 45000000, false, 8),
  ('SEK-KANTOR', 'Pemeliharaan Kantor', 'pengeluaran', 30000000, false, 9),
  ('SEK-KENDARAAN', 'Operasional Kendaraan', 'pengeluaran', 20000000, false, 10),
  ('LAIN-LAIN', 'Lain-lain', 'pengeluaran', 20000000, false, 99)
ON CONFLICT (kode) DO NOTHING;

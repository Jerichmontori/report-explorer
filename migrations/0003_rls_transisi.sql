-- =========================================================
-- 0003: Kebijakan RLS final + pemicu transisi status
-- =========================================================

-- ---- user_roles: admin kelola; bootstrap admin pertama ----
DROP POLICY IF EXISTS "user_roles_select_authenticated" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      (SELECT role) = 'admin'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin')
    )
  );

CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---- transaksi: UPDATE berdasarkan peran & status ----
DROP POLICY IF EXISTS "transaksi_update_kasir" ON public.transaksi;

CREATE POLICY "transaksi_update" ON public.transaksi
  FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'kasir') AND status = 'draft')
    OR (public.has_role(auth.uid(), 'bendahara') AND status = 'menunggu_bendahara')
    OR (public.has_role(auth.uid(), 'ketua') AND status = 'menunggu_ketua')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'kasir')
    OR public.has_role(auth.uid(), 'bendahara')
    OR public.has_role(auth.uid(), 'ketua')
  );

-- ---- Fungsi & pemicu transisi status ----
CREATE OR REPLACE FUNCTION public.validasi_transisi_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed boolean;
BEGIN
  SELECT CASE
    WHEN OLD.status = 'draft' AND NEW.status IN ('menunggu_bendahara','menunggu_ketua','ditolak') THEN true
    WHEN OLD.status = 'menunggu_bendahara' AND NEW.status IN ('menunggu_ketua','ditolak') THEN true
    WHEN OLD.status = 'menunggu_ketua' AND NEW.status IN ('disetujui','ditolak') THEN true
    WHEN OLD.status = NEW.status THEN true
    ELSE false
  END INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Transisi status tidak valid: % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validasi_transisi_status() TO authenticated;

DROP TRIGGER IF EXISTS transaksi_transisi_status ON public.transaksi;
CREATE TRIGGER transaksi_transisi_status
  BEFORE UPDATE OF status ON public.transaksi
  FOR EACH ROW
  EXECUTE FUNCTION public.validasi_transisi_status();

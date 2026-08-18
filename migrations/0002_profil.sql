-- =========================================================
-- 0002: Profil pengguna + trigger dari auth.users
-- =========================================================

CREATE TABLE public.profil_pengguna (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  nama text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profil_pengguna TO authenticated;
ALTER TABLE public.profil_pengguna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profil_pengguna_read" ON public.profil_pengguna
  FOR SELECT TO authenticated USING (true);

-- Fungsi sinkron profil saat user baru terdaftar di auth.users
CREATE OR REPLACE FUNCTION public.sync_profil_pengguna()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profil_pengguna (id, email, nama)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.profile->>'name', NEW.email))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        nama = COALESCE(EXCLUDED.nama, public.profil_pengguna.nama);
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_profil_pengguna() TO authenticated;

CREATE TRIGGER auth_users_sync_profil
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profil_pengguna();

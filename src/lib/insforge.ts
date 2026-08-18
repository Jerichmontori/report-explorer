import { createClient } from "@insforge/sdk";

// Klien browser InsForge (RLS aktif sesuai pengguna yang login).
// Access token disimpan di memori; refresh via httpOnly cookie.
export const insforge = createClient({
  baseUrl: import.meta.env['VITE_INSFORGE_URL'],
  anonKey: import.meta.env['VITE_INSFORGE_ANON_KEY'],
});

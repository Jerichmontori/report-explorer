import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { insforge } from "./insforge";
import type { Peran, SesiPengguna } from "./types";

interface AuthState {
  user: SesiPengguna | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PRIORITAS: Peran[] = ["admin", "ketua", "bendahara", "kasir"];

const AuthContext = createContext<AuthState | undefined>(undefined);

async function ambilPeran(userId: string): Promise<Peran | null> {
  try {
    const { data, error } = await insforge.database
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error || !data || data.length === 0) return null;
    const peranAda = (data as { role: Peran }[]).map((r) => r.role);
    return PRIORITAS.find((p) => peranAda.includes(p)) ?? peranAda[0] ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SesiPengguna | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (error || !data?.user) {
        setUser(null);
        return;
      }
      const u = data.user;
      const peran = await ambilPeran(u.id);
      setUser({
        id: u.id,
        email: u.email ?? "",
        name: (u as { name?: string }).name ?? u.email ?? "Pengguna",
        peran,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      await refresh();
      return {};
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await insforge.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { useAuth } from "../lib/auth";
import { insforge } from "../lib/insforge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — Laporan FKUB" },
      { name: "description", content: "Masuk atau daftar akun Laporan FKUB." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, refresh } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { mode?: string };
  const [mode, setMode] = useState<"masuk" | "daftar">(
    search.mode === "daftar" ? "daftar" : "masuk",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "masuk") {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Berhasil masuk");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await insforge.auth.signUp({
          email,
          password,
          name: name || email,
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data?.requireEmailVerification) {
          toast.message("Verifikasi email diperlukan", { description: "Periksa email Anda." });
        } else if (data?.accessToken || data?.user) {
          await refresh();
          toast.success("Akun dibuat");
          navigate({ to: "/dashboard", replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Laporan FKUB</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "masuk" ? "Masuk untuk mengelola dana hibah" : "Buat akun baru"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
          {mode === "daftar" && (
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              autoComplete={mode === "masuk" ? "current-password" : "new-password"}
            />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Memproses…" : mode === "masuk" ? "Masuk" : "Daftar"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "masuk" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("daftar")}
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setMode("masuk")}
                >
                  Masuk
                </button>
              </>
            )}
          </div>
        </form>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:underline">
            ← Kembali ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

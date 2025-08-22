"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import { useAuthContext } from "@/providers/Auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();
  const { updatePassword, signOut } = useAuthContext();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Establish a session when arriving from invite/reset email
  useEffect(() => {
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const typeParam = searchParams.get("type");
    let mounted = true;

    const run = async () => {
      try {
        // Guard against React Strict Mode double-invocation in dev
        const w: any = typeof window !== "undefined" ? window : null;
        if (w?.__sbSetPasswordExchangeInProgress) return;
        if (w) w.__sbSetPasswordExchangeInProgress = true;

        // 1) Hash-based callback support on this route (/#access_token=...)
        if (typeof window !== "undefined") {
          const hash = window.location.hash || "";
          if (hash.includes("access_token")) {
            const params = new URLSearchParams(hash.replace(/^#/, ""));
            const at = params.get("access_token");
            const rt = params.get("refresh_token");
            if (at && rt) {
              await supabase.auth.setSession({ access_token: at, refresh_token: rt });
              // Clean the hash from the URL
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }
          }
        }

        if (code) {
          // OIDC/Pkce-style callback
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (token_hash) {
          // OTP-style callback (invite/reset)
          const mappedType = typeParam === "invite" ? "signup" : (typeParam || "recovery");
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: mappedType as any,
          });
          if (error) throw error;
        } else {
          // If user arrived via hash-based callback, the client may already have a session.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("Falta el enlace de validación");
          }
        }
      } catch (err: any) {
        console.error("exchangeCodeForSession error", err);
        if (mounted) setError("El enlace no es válido o ha expirado.");
      } finally {
        const w: any = typeof window !== "undefined" ? window : null;
        if (w && w.__sbSetPasswordExchangeInProgress) delete w.__sbSetPasswordExchangeInProgress;
        if (mounted) setIsExchanging(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [searchParams, supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(password);
    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("¡Listo! Tu contraseña fue actualizada.");

    // Sign out this temporary session and redirect to sign-in
    await signOut();
    const msg = encodeURIComponent("Contraseña actualizada. Inicia sesión.");
    router.replace(`/signin?message=${msg}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Establecer contraseña</CardTitle>
          <CardDescription className="text-center">
            Completa tu registro estableciendo una nueva contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isExchanging && (
            <Alert className="mb-4">
              <AlertDescription>Validando enlace...</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mb-4 bg-green-50 text-green-800">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {!isExchanging && !message && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <PasswordInput
                  id="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <PasswordInput
                  id="confirm"
                  placeholder="Confirma tu contraseña"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

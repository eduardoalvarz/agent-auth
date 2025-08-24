"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();

  const [error, setError] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        // Avoid duplicate exchange in React Strict Mode
        const w: any = typeof window !== "undefined" ? window : null;
        if (w?.__sbOAuthExchangeInProgress) return;
        if (w) w.__sbOAuthExchangeInProgress = true;

        // Support hash-based callbacks (/#access_token=...)
        if (typeof window !== "undefined") {
          const hash = window.location.hash || "";
          if (hash.includes("access_token")) {
            const params = new URLSearchParams(hash.replace(/^#/, ""));
            const at = params.get("access_token");
            const rt = params.get("refresh_token");
            if (at && rt) {
              await supabase.auth.setSession({ access_token: at, refresh_token: rt });
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }
          }
        }

        const code = searchParams.get("code");
        if (code) {
          // PKCE/OIDC flow: exchange code in the browser where code_verifier exists
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // If the provider returned a session via hash, we should already have it
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("Missing authorization code or session");
          }
        }

        // Redirect to desired location if provided
        const dest = searchParams.get("redirect") || "/";
        router.replace(dest);
      } catch (err: any) {
        console.error("OAuth callback exchange error", err);
        if (mounted) setError("No se pudo completar el inicio de sesión. Intenta de nuevo.");
      } finally {
        const w: any = typeof window !== "undefined" ? window : null;
        if (w && w.__sbOAuthExchangeInProgress) delete w.__sbOAuthExchangeInProgress;
        if (mounted) setIsExchanging(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [router, searchParams, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Autenticando...</CardTitle>
          <CardDescription className="text-center">Procesando el inicio de sesión</CardDescription>
        </CardHeader>
        <CardContent>
          {isExchanging && (
            <Alert className="mb-4">
              <AlertDescription>Intercambiando credenciales de acceso...</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

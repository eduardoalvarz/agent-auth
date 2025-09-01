"use client";

import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { ArtifactProvider } from "@/components/thread/artifact";
import { Toaster } from "@/components/ui/sonner";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseClient } from "@/lib/auth/supabase-client";
import { Navbar } from "@/components/navbar";
import { useAuthContext } from "@/providers/Auth";
import Landing from "@/features/landing";
import AboutBlancSplash from "@/components/splash/AboutBlancSplash";

export default function DemoPage(): React.ReactNode {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const flag = sessionStorage.getItem("showAboutBlancSplash");
    if (flag) {
      // Consume the flag immediately to prevent double show on revisit
      sessionStorage.removeItem("showAboutBlancSplash");
      return true;
    }
    return false;
  });

  const [exiting, setExiting] = useState(false);

  const handleEmpresasNavigate = async () => {
    setExiting(true);
    await new Promise((res) => setTimeout(res, 500));
    router.push("/empresas");
  };

  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, [showSplash]);

  // Handle Supabase hash-based callbacks like
  // http://localhost:3000/#access_token=...&type=recovery|invite
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return;
    const hash = window.location.hash || "";
    if (!hash.includes("access_token")) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const type = params.get("type");
    if (type === "recovery" || type === "invite" || type === "signup") {
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const supabase = getSupabaseClient();
      (async () => {
        try {
          if (access_token && refresh_token) {
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
          }
        } finally {
          router.replace("/auth/set-password");
        }
      })();
    }
  }, [router]);

  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      {!showSplash && <Navbar onEmpresasNavigate={handleEmpresasNavigate} />}
      {showSplash && (
        <AboutBlancSplash
          onDone={() => setShowSplash(false)}
          durationMs={2000}
        />
      )}
      {isLoading ? (
        <div className="container mx-auto px-4 py-10">Loading...</div>
      ) : !isAuthenticated ? (
        <Landing />
      ) : showSplash ? null : (
        <motion.div
          key="chat"
          initial={{ y: -16, opacity: 0, filter: "blur(8px)" }}
          animate={
            exiting
              ? { y: 16, opacity: 0, filter: "blur(8px)" }
              : { y: 0, opacity: 1, filter: "blur(0px)" }
          }
          transition={{ type: "spring", stiffness: 220, damping: 26, duration: 0.5 }}
          className="h-[calc(100dvh-4rem)] min-h-0"
        >
          <ThreadProvider>
            <StreamProvider>
              <ArtifactProvider>
                <Thread />
              </ArtifactProvider>
            </StreamProvider>
          </ThreadProvider>
        </motion.div>
      )}
    </React.Suspense>
  );
}

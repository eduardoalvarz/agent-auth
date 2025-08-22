"use client";

import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { ArtifactProvider } from "@/components/thread/artifact";
import { Toaster } from "@/components/ui/sonner";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { useAuthContext } from "@/providers/Auth";
import Landing from "@/features/landing";
import AboutBlancSplash from "@/components/splash/AboutBlancSplash";

export default function DemoPage(): React.ReactNode {
  const { isAuthenticated, isLoading } = useAuthContext();
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

  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, [showSplash]);

  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      {!showSplash && <Navbar />}
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
          initial={{ y: 16, opacity: 0, filter: "blur(8px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 220, damping: 26, duration: 0.75 }}
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

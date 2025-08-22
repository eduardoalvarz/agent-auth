"use client";

import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { ArtifactProvider } from "@/components/thread/artifact";
import { Toaster } from "@/components/ui/sonner";
import React from "react";
import { Navbar } from "@/components/navbar";
import { useAuthContext } from "@/providers/Auth";
import Landing from "@/features/landing";

export default function DemoPage(): React.ReactNode {
  const { isAuthenticated, isLoading } = useAuthContext();
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      <Navbar />
      {isLoading ? (
        <div className="container mx-auto px-4 py-10">Loading...</div>
      ) : !isAuthenticated ? (
        <Landing />
      ) : (
        <ThreadProvider>
          <StreamProvider>
            <ArtifactProvider>
              <Thread />
            </ArtifactProvider>
          </StreamProvider>
        </ThreadProvider>
      )}
    </React.Suspense>
  );
}

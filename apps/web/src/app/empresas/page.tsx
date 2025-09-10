"use client";
import { Card, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/providers/Auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MarkdownSections from "@/components/markdown-sections";
import { getSupabaseClient } from "@/lib/auth/supabase-client";

function EmpresasContent({
  exiting,
  onOpenDemo,
  onOpenCoop,
  onOpenHerc,
  onOpenPink,
  allowed,
}: {
  exiting: boolean;
  onOpenDemo: () => void;
  onOpenCoop: () => void;
  onOpenHerc: () => void;
  onOpenPink: () => void;
  allowed: Set<string>;
}) {
  return (
    <motion.div
      key="empresas"
      initial={{ y: -16, opacity: 0, filter: "blur(8px)" }}
      animate={
        exiting
          ? { y: 16, opacity: 0, filter: "blur(8px)" }
          : { y: 0, opacity: 1, filter: "blur(0px)" }
      }
      transition={{ type: "spring", stiffness: 220, damping: 26, duration: 0.5 }}
      className="container mx-auto max-w-4xl px-4 py-14"
    >
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
        <p className="text-sm text-muted-foreground">Elige las empresas que deseas administrar</p>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <Card className="group rounded-xl border shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/20 transition-transform hover:-translate-y-1 hover:shadow-lg hover:border-primary/30" style={{ display: allowed.has("demo") ? undefined : "none" }}>
          <CardHeader className="flex flex-col items-center gap-4 py-6">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden bg-gradient-to-b from-muted/70 to-muted/50 flex items-center justify-center ring-2 ring-primary/10 ring-offset-2 ring-offset-background shadow-sm transition duration-200 group-hover:ring-primary/30">
              <img
                src="https://i.postimg.cc/W32PBvfT/Monte-Carlo-13.png"
                alt="DEMO"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <CardTitle>DEMO</CardTitle>
              <Switch aria-label="Activar DEMO" />
            </div>
            <CardDescription>Entorno de demostración</CardDescription>
          </CardHeader>
          <CardFooter className="-mx-6 p-0 border-t bg-muted/30">
            <Button
              variant="default"
              className="w-full rounded-[2rem] bg-black/80 text-white hover:bg-black/85"
              onClick={onOpenDemo}
            >
              Contexto
            </Button>
          </CardFooter>
        </Card>

        <Card className="group rounded-xl border shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/20 transition-transform hover:-translate-y-1 hover:shadow-lg hover:border-primary/30" style={{ display: allowed.has("hercules") ? undefined : "none" }}>
          <CardHeader className="flex flex-col items-center gap-4 py-6">
            <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full bg-gradient-to-b from-muted/70 to-muted/50 flex items-center justify-center ring-2 ring-primary/10 ring-offset-2 ring-offset-background shadow-sm transition duration-200 group-hover:ring-primary/30">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4pxdojlZQpHEyvMBxtCU2KMllJLCeobcaXA&s"
                alt="HÉRCULES"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <CardTitle>HÉRCULES</CardTitle>
              <Switch aria-label="Activar HÉRCULES" />
            </div>
            <CardDescription>BEER · QRO-MX</CardDescription>
          </CardHeader>
          <CardFooter className="-mx-6 p-0 border-t bg-muted/30">
            <Button
              variant="default"
              className="w-full rounded-[2rem] bg-black/80 text-white hover:bg-black/85"
              onClick={onOpenHerc}
            >
              Contexto
            </Button>
          </CardFooter>
        </Card>

        <Card className="group rounded-xl border shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/20 transition-transform hover:-translate-y-1 hover:shadow-lg hover:border-primary/30" style={{ display: allowed.has("coop") ? undefined : "none" }}>
          <CardHeader className="flex flex-col items-center gap-4 py-6">
            <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full bg-gradient-to-b from-muted/70 to-muted/50 flex items-center justify-center ring-2 ring-primary/10 ring-offset-2 ring-offset-background shadow-sm transition duration-200 group-hover:ring-primary/30">
              <img
                src="https://coopspirits.com/public/assets/og_coop_logo.jpg"
                alt="COOP"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <CardTitle>COOP</CardTitle>
              <Switch aria-label="Activar COOP" />
            </div>
            <CardDescription>Spirits & Wines · QRO-MX</CardDescription>
          </CardHeader>
          <CardFooter className="-mx-6 p-0 border-t bg-muted/30">
            <Button
              variant="default"
              className="w-full rounded-[2rem] bg-black/80 text-white hover:bg-black/85"
              onClick={onOpenCoop}
            >
              Contexto
            </Button>
          </CardFooter>
        </Card>
        <Card className="group rounded-xl border shadow-sm overflow-hidden bg-gradient-to-b from-card to-muted/20 transition-transform hover:-translate-y-1 hover:shadow-lg hover:border-primary/30" style={{ display: allowed.has("pinkcheladas") ? undefined : "none" }}>
          <CardHeader className="flex flex-col items-center gap-4 py-6">
            <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full bg-gradient-to-b from-muted/70 to-muted/50 flex items-center justify-center ring-2 ring-primary/10 ring-offset-2 ring-offset-background shadow-sm transition duration-200 group-hover:ring-primary/30">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToTrsVpIKGqNFFfYsmi4JP3qoe9l04XImLlA&s"
                alt="PINKCHELADAS"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex w-full items-center justify-between">
              <CardTitle>PINKCHELADAS</CardTitle>
              <Switch aria-label="Activar PINKCHELADAS" />
            </div>
            <CardDescription>Bebidas preparadas · JAL-MX</CardDescription>
          </CardHeader>
          <CardFooter className="-mx-6 p-0 border-t bg-muted/30">
            <Button
              variant="default"
              className="w-full rounded-[2rem] bg-black/80 text-white hover:bg-black/85"
              onClick={onOpenPink}
            >
              Contexto
            </Button>
          </CardFooter>
        </Card>
      </div>
    </motion.div>
  );
}

export default function EmpresasPage() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const router = useRouter();
  const [exiting, setExiting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<"DEMO" | "COOP" | "HERCULES" | "PINKCHELADAS" | null>(null);
  const [coopLoading, setCoopLoading] = useState(false);
  const [coopContent, setCoopContent] = useState<string | null>(null);
  const [coopError, setCoopError] = useState<string | null>(null);
  const [hercLoading, setHercLoading] = useState(false);
  const [hercContent, setHercContent] = useState<string | null>(null);
  const [hercError, setHercError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [allowedLoading, setAllowedLoading] = useState(true);

  const handleChatNavigate = async () => {
    setExiting(true);
    // espera para reproducir la animación antes de navegar (alineado con duration 0.5s)
    await new Promise((res) => setTimeout(res, 500));
    router.push("/");
  };

  const ensureCoopContent = async () => {
    if (coopContent || coopLoading) return;
    setCoopLoading(true);
    setCoopError(null);
    try {
      const res = await fetch("/api/empresas/coop", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch_failed");
      const text = await res.text();
      setCoopContent(text);
    } catch {
      setCoopError("No se pudo cargar el contexto de COOP.");
    } finally {
      setCoopLoading(false);
    }
  };

  const ensureHercContent = async () => {
    if (hercContent || hercLoading) return;
    setHercLoading(true);
    setHercError(null);
    try {
      const res = await fetch("/api/empresas/hercules", { cache: "no-store" });
      if (!res.ok) throw new Error("fetch_failed");
      const text = await res.text();
      setHercContent(text);
    } catch {
      setHercError("No se pudo cargar el contexto de HÉRCULES.");
    } finally {
      setHercLoading(false);
    }
  };

  const openDialog = async (company: "DEMO" | "COOP" | "HERCULES" | "PINKCHELADAS") => {
    setSelectedCompany(company);
    setDialogOpen(true);
    if (company === "COOP") {
      ensureCoopContent();
    } else if (company === "HERCULES") {
      ensureHercContent();
    }
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        setAllowedLoading(true);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.from("companies").select("slug");
        if (!cancelled) {
          if (!error && data) {
            setAllowed(new Set(data.map((r: any) => String(r.slug || "").toLowerCase())));
          } else {
            setAllowed(new Set());
          }
        }
      } finally {
        if (!cancelled) setAllowedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-10" />
      </>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-10" />
      </>
    );
  }

  return (
    <>
      <Navbar onChatNavigate={handleChatNavigate} />
      <EmpresasContent
        exiting={exiting}
        onOpenDemo={() => openDialog("DEMO")}
        onOpenCoop={() => openDialog("COOP")}
        onOpenHerc={() => openDialog("HERCULES")}
        onOpenPink={() => openDialog("PINKCHELADAS")}
        allowed={allowed}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="border-b p-4">
            <DialogTitle>{selectedCompany ? `${selectedCompany} — Contexto` : "Contexto"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto p-4 text-sm leading-relaxed">
            {selectedCompany === "COOP" ? (
              coopLoading ? (
                <div>Cargando…</div>
              ) : coopError ? (
                <div className="text-destructive">{coopError}</div>
              ) : coopContent && coopContent.trim().length > 0 ? (
                <MarkdownSections
                  content={coopContent}
                  defaultOpenTitles={["coop_sellout"]}
                  splitLevel={3}
                  maxWidthClass="max-w-[640px]"
                  storageKey="empresas:coop:sections:v1"
                />
              ) : (
                <div className="text-muted-foreground">No hay contenido disponible.</div>
              )
            ) : selectedCompany === "HERCULES" ? (
              hercLoading ? (
                <div>Cargando…</div>
              ) : hercError ? (
                <div className="text-destructive">{hercError}</div>
              ) : hercContent && hercContent.trim().length > 0 ? (
                <MarkdownSections
                  content={hercContent}
                  splitLevel={3}
                  maxWidthClass="max-w-[640px]"
                  storageKey="empresas:hercules:sections:v1"
                />
              ) : (
                <div className="text-muted-foreground">No hay contenido disponible.</div>
              )
            ) : selectedCompany ? (
              <div className="text-muted-foreground max-w-[640px] mx-auto">
                Contexto próximamente para {selectedCompany}.
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

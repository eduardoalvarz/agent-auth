"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-24">
        <Card>
          <CardHeader>
            <CardTitle>Pagos deshabilitados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Esta compilación no procesa pagos ni gestiona créditos. Si
              llegaste aquí desde un enlace antiguo, por favor regresa a la aplicación.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/">Ir al chat</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pricing">Precios</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

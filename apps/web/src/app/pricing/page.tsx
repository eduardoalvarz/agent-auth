"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

function PricingContent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-24">
      <Card>
        <CardHeader>
          <CardTitle>Precios no disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Los pagos y los planes basados en créditos están deshabilitados en esta compilación.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/">Ir al chat</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Contacto</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <PricingContent />
    </>
  );
}

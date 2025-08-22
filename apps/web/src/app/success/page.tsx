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
            <CardTitle>Payments Disabled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This build does not process payments or manage credits. If you
              arrived here from an old link, please return to the app.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/">Go to Chat</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/pricing">Pricing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

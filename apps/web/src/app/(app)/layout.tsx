import type { Metadata } from "next";
import "../globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "about:blanc - chat",
  description: "chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

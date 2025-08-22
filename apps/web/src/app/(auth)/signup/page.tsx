"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect away from public sign-up
    const message = encodeURIComponent(
      "El registro está deshabilitado. Solicita una invitación al administrador.",
    );
    router.replace(`/signin?message=${message}`);
  }, [router]);

  return null;
}

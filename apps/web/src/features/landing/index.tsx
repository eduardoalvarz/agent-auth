"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 py-16 text-center">

      <motion.h1
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        className="text-4xl font-bold tracking-tight sm:text-5xl"
      >
        <span className="font-normal italic">¡Bienvenido a </span>
        <span className="font-bold not-italic">about:</span><span className="text-muted-foreground">chat</span>
        <span className="font-normal italic">!</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        className="text-muted-foreground max-w-2xl text-lg"
      >
        Inicia sesión para empezar a chatear con tus datos.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-center gap-4"
      >
        <Button asChild>
          <Link href="/signin">Iniciar sesión</Link>
        </Button>
      </motion.div>
      {/* <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-center gap-4"
        >
        <p className="text-muted-foreground text-xs italic">
          - Registro por invitación -
        </p>
      </motion.div> */}
    </main>
  );
}
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import CarouselText from "./CarouselText";

export default function Landing() {
  const samples = [
    "¿Cómo me fue en las ventas de octubre 2024 vs 2025?",
    "Top 10 productos por ingresos en el último trimestre.",
    "¿Qué cadenas crecieron más este mes vs el mismo mes del año pasado?",
    "Ventas por estado y ciudad en los últimos 30 días.",
    "¿Cuál es el margen promedio por marca en 2025 YTD?",
    "Comparativo sell-in vs sell-out por cliente clave.",
    "Rupturas de stock por semana y su impacto en ventas.",
    "Tienda con mayor crecimiento de botellas vendidas este mes.",
    "Análisis de descuentos: % de ventas con promoción vs sin promoción.",
    "Forecast de ventas para la próxima semana por SKU.",
    "¿Qué presentaciones tienen rotación lenta y alto inventario?",
    "Efecto de campañas: antes vs después por canal.",
    "Variación de precios promedio por cadena en 90 días.",
    "¿Cuáles son los 5 clientes con más devolución?",
    "Mapa de calor de ventas por región.",
    "Participación de mercado de cada marca este mes.",
    "Ticket promedio por cliente en el último periodo.",
    "¿Qué producto nuevo tuvo mejor adopción en 60 días?",
    "Comparativo de ventas netas vs objetivo (plan) por semana.",
    "Top 10 SKUs con mayor contribución al total acumulado YTD.",
    "¿Qué día de la semana vendo más por canal moderno?",
    "Detección de outliers: puntos de venta con variaciones atípicas.",
    "Curveo ABC de clientes por facturación.",
    "¿Cuál fue la elasticidad de precio aproximada por categoría?",
    "Lead time promedio entre pedido y entrega por cadena.",
    "¿Qué marcas canibalizan ventas entre sí en el último trimestre?",
    "Ventas y margen por combo/kit vs piezas sueltas.",
    "¿Dónde hay quiebres recurrentes por SKU?",
    "Top 5 oportunidades por bajo inventario y alta demanda.",
    "¿Cómo cambió el mix de productos en septiembre vs agosto?",
  ];
  return (
    <main className="container mx-auto min-h-[calc(100dvh-4rem)] px-4 py-10 sm:py-16 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl text-center space-y-3 sm:space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight"
        >
          <span className="font-normal italic">¡Bienvenido a </span>
          <span className="font-bold not-italic">about:</span>
          <span className="text-muted-foreground">chat</span>
          <span className="font-normal italic">!</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.55, ease: "easeOut" }}
          className="mx-auto max-w-xl text-base sm:text-lg text-muted-foreground"
        >
          Inicia sesión para empezar a chatear con tus datos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.85, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <Button asChild>
            <Link href="/signin">Iniciar sesión</Link>
          </Button>
        </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
        className="w-full"
      >
        <CarouselText items={samples} intervalMs={3500} />
      </motion.div>
    </main>
  );
}
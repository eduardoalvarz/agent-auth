# COOP (Company of People)

COOP (Company of People) es una distribuidora de licores enfocada en **canal moderno y especializado** en México. Opera y da seguimiento a sell-out en cadenas como **Walmart, Chedraui, La Europea, Soriana, La Comer, H-E-B, Vinoteca**, entre otras.  
Portafolio típico: **Mezcal, Sake, Tequila, Ginebra, Whisky, Ron, Vermouth**; con marcas frecuentes en el dataset como **Bruxo, Mil Diablos, Nami, Danz, Alipus, Arette, Cómplice**, etc.

---

## Bases de datos

1. **coop_sellout** — Base de ventas (sell-out) a nivel tienda/SKU.
2. **coop_inventarios** — Base de inventarios a nivel tienda/SKU.

---

### 1. coop_sellout

#### Resumen del dataset

- **Cobertura**: Histórico disponible según cargas recibidas.
- **Granularidad**: Fecha × Tienda × SKU.
- **Frecuencia de actualización**: Diaria.
- **Uso típico**: Performance por cadena/formato, mix de marcas/categorías, ASP, comparativos temporales.

#### Diccionario de campos (esquema funcional)

| Columna | Tipo | Descripción | Observaciones | Ejemplo |
|---|---|---|---|---|
| `Record ID` | date | Campos auxiliares de integración. | Pueden ser de uso interno. | `—` |
| `FECHA` | date | Fecha de la venta/salida. | Verificar que no existan fechas fuera de rango operativo. | `2024-02-10 00:00:00` |
| `AÑO`, `MES`, `MONTH` | entero / texto | Componentes derivados de `FECHA` (año, mes, nombre de mes). | Redundantes para agregaciones; considerar usar solo `FECHA`. | `2025`, `5`, `May` |
| `CADENA` | categórica | Retailer/cadena comercial. | — | `WALMART`, `CHEDRAUI`, `EUROPEA` |
| `FORMATO` | categórica | Subformato dentro de la cadena. | — | `WALMART SUPERCENTER`, `HEB`, `MI BODEGA AURRERA` |
| `CANAL` | categórica | Canal de venta. | Puede haber variaciones de escritura; normalizar. | `TIENDAS`, `MOSTRADOR`, `ECOMMERCE` |
| `ESTADO`, `MUNICIPIO` | categórica | Ubicación geográfica. | Valores `NO DEFINIDO` frecuentes; completar/limpiar. | `CDMX`, `NUEVO LEÓN` / `IZTAPALAPA` |
| `KEY-PDV` | id / texto | Identificador del punto de venta. | — | `WMT-XXXX` |
| `CLIENTE` | categórica | Cliente/facturación. | `No Definido` frecuente; revisar mapeo. | `CHEDRAUI`, `BODEGAS`, `No Definido` |
| `TIENDA` | texto | Nombre comercial de la tienda. | — | `EUROPEA POLANCO` |
| `RFC` | texto | Registro fiscal del cliente. | — | `XXX000000` |
| `REGIÓN-KAE` | categórica | Región comercial. | Puede venir vacío o único. | `REGIÓN 1` |
| `CATEGORÍA` | categórica | Categoría del producto. | — | `MEZCAL`, `SAKE`, `TEQUILA` |
| `MARCA` | categórica | Marca del producto. | — | `BRUXO`, `MIL DIABLOS`, `NAMI` |
| `PRODUCTO` | texto | Nombre del producto como viene del portal (raw). | — | `BRUXO NO.1` |
| `PRODUCTO - DB` | texto | Nombre normalizado del producto. | — | `MEZCAL BRUXO JOVEN 100% No. 1` |
| `SKU` | id / texto | Código interno/SKU. | — | `MI02001`, `BR02006` |
| `BOTELLAS` | numérico | Unidades vendidas. | — | `12` |
| `C9L` | numérico | Equivalente a caja de 9L. | Puede venir vacío. | `—` |
| `VENTA` | moneda | Importe de venta (MXN). | — | `\$1,234.56` |

#### Observaciones clave

- **Geografía incompleta** (`ESTADO`, `MUNICIPIO`) y **CLIENTE** con `No Definido`.
- **CANAL** con variantes de escritura (normalizar).

---

#### Valores únicos

```
CADENAS: Total 12
---
1. ALIANZA
2. CHEDRAUI
3. CORPOVINOS
4. DUERO
5. EUROPEA
6. HEB
7. LA COMER
8. LIVERPOOL
9. PALACIO DE HIERRO
10. SORIANA
11. VINOTECA
12. WALMART
```

```
CATEGORÍA: Total 10
---
1. GINEBRA
2. LICOR
3. MEZCAL
4. NECTAR AGAVE
5. RON
6. SAKE
7. SOTOL
8. TEQUILA
9. VERMOUTH
10. WHISKY
```

```
MARCA: Total 28
---
1. ABERLOUR
2. ALIPUS
3. ANCNOC 12
4. ARETTE
5. ARMONICO
6. BALBLAIR 12
7. BALBLAIR 15
8. BALBLAIR 18
9. BRUXO
10. CELOSA
11. COMPLICE
12. COSMICO
13. DANZ
14. DOS DEUS
15. HATOZAKI
16. HECHICERA
17. ITALICUS
18. LILLET
19. MALFY
20. MIL DIABLOS
21. MIRACIELO
22. NAMI
23. PORTO
24. SALMERO
25. SAVOIA
26. SEÑOR MAGUEY
27. SEÑOR SOTOL
28. TEREMANA
```

```
PRODUCTO: Total 73
---
1. ABERLOUR
2. ALIPUS S. ANA
3. ALIPUS S. ANDRES
4. ALIPUS S. BALTAZAR
5. ALIPUS S. JUAN
6. ALIPUS S. LUIS
7. ALIPUS S. MIGUEL
8. ANCNOC 12
9. ARMONICO
10. ATT BLANCO
11. ATT FUERTE BLANCO
12. ATT GRAN CLASE
13. ATT REPOSADO
14. ATT SUAVE AÑEJO
15. ATT SUAVE BLANCO
16. ATT SUAVE REPOSADO
17. BALBLAIR 12
18. BALBLAIR 15
19. BALBLAIR 18
20. BRUXO NO.1
21. BRUXO NO.2
22. BRUXO NO.3
23. BRUXO NO.4
24. BRUXO NO.5
25. BRUXO RI
26. CELOSA
27. COM AVENTURA
28. COM ENSAMBLE
29. COM ORIGENES 750
30. COM PAS. CUISHE
31. COM PAS. TOBALÁ
32. COM REPOSADO
33. COSMICO AÑEJO 375
34. COSMICO AÑEJO 750
35. COSMOS E. AÑEJO
36. DD RED
37. DD WHITE
38. HATOZAKI F. BLEND
39. HATOZAKI P. MALT
40. HECHICERA EXP BANANA
41. HECHICERA RVA FAM
42. ITALICUS
43. LD ARROQUEÑO
44. LD AÑEJO
45. LD COYOTE
46. LD JOVEN
47. LD PECHUGA
48. LD REPOSADO
49. LD SIERRA NEGRA
50. LD STILL PROOF
51. LD TOBALA
52. LILLLET BCO
53. MALFY LIMON
54. MALFY ORIGINAL
55. MALFY ROSA
56. MIL DIABLOS
57. MIRACIELO
58. NAMI DAIGINJO
59. NAMI GINJO
60. NAMI JUNMAI
61. NAMI NIGORI 375
62. PORTO 500
63. S. GUADALUPE
64. S. MAGUEY
65. S. ORIGINAL
66. S. PANAMERICANO
67. S. SOTOL
68. SAVOIA
69. TEREMANA BCO
70. TEREMANA REP
71. VAP ARMONICO 700 + VASO + RECETARIO
72. VAP BRUXO RI 750 + BRUXO 2 250
73. VAP COM ORIGENES 750 + 250
```

### 2. coop_inventarios
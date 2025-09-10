# Hércules (Cervecería Hércules, Querétaro)

Hércules es una cervecería artesanal mexicana con base en Querétaro. Opera y da seguimiento a ventas **retail** en cadenas nacionales como **HEB, Walmart, Soriana, La Comer**, entre otras.  
Portafolio típico: **Cervezas artesanales** con estilos como **West Coast Pilsner, Lager con centeno, Brown Ale, Schwarzbier, Doble IPA, Weizenbock**, etc.  
Todas bajo la marca **Hércules**.

---

## Bases de datos

1. **hercules_sellout** — Base de ventas (sell-out) a nivel tienda/SKU.

---

### 1. hercules_sellout

#### Resumen del dataset

- **Cobertura**: Histórico disponible según cargas recibidas.
- **Granularidad**: Fecha × Tienda × SKU.
- **Frecuencia de actualización**: Diaria.
- **Uso típico**: Performance por cadena/formato, mix de estilos, comparativos temporales, volumen vs. valor.

#### Diccionario de campos (esquema funcional)

| Columna | Tipo | Descripción | Observaciones | Ejemplo |
|---|---|---|---|---|
| `Record ID` | id | Identificador auxiliar de integración. | Uso interno. | `444009b3-9c56-46df-a0d0-c2b9147c1e77` |
| `FECHA` | date | Fecha de la venta/salida. | Revisar consistencia en zonas horarias. | `2025-07-03 14:12:21` |
| `AÑO`, `MES`, `MONTH` | entero / texto | Derivados de `FECHA`. | Redundantes. | `2025`, `7`, `July` |
| `CADENA` | categórica | Retailer/cadena comercial. | — | `HEB`, `WALMART` |
| `FORMATO` | categórica | Subformato dentro de la cadena. | — | `HEB`, `SOR SUPER` |
| `CANAL` | categórica | Canal de venta. | Variantes frecuentes (`Física`, `Ecommerce`). | `Física` |
| `ESTADO`, `MUNICIPIO` | categórica | Ubicación geográfica. | Frecuentes valores incompletos. | `NUEVO LEÓN`, `MONTERREY` |
| `KEY-PDV` | id / texto | Identificador del punto de venta. | — | `9106` |
| `CLIENTE` | categórica | Cliente/facturación. | `No Definido` común. | `No Definido` |
| `TIENDA` | texto | Nombre comercial de la tienda. | — | `9106 HEB MTY DIEGO DIAZ` |
| `RFC` | texto | Registro fiscal del cliente. | — | `No Definido` |
| `CATEGORÍA` | categórica | Categoría del producto. | Siempre `CERVEZA`. | `CERVEZA` |
| `MARCA` | categórica | Marca. | — | `HERCULES` |
| `PRODUCTO` | texto | Nombre del producto como viene del portal (raw). | — | `Barracuda 4-Pack Lata 473ml` |
| `PRODUCTO - DB` | texto | Nombre normalizado con estilo. | — | `Barracuda | West Coast Pilsner | 4-Pack Lata 473ml` |
| `SKU` | id / texto | Código interno/SKU. | — | `HRK-BARRACUDA-4P473` |
| `BOTELLAS` | numérico | Unidades vendidas. | — | `1` |
| `C9L` | numérico | Equivalente a caja de 9L. | Puede venir vacío. | `0.2102` |
| `VENTA` | moneda | Importe de venta (MXN). | — | `405.37` |

#### Observaciones clave

- **CLIENTE y RFC** presentan con frecuencia `No Definido`.
- **Ubicación** (estado/municipio) puede estar incompleta o desuniforme.
- Todos los productos pertenecen a la marca **Hércules**, diferenciados por estilo y empaque.

---

#### Valores únicos

CADENAS: Total 4
	1.	HEB
	2.	WALMART
	3.	SORIANA
	4.	LA COMER



CATEGORÍA: Total 1
	1.	CERVEZA



MARCA: Total 1
	1.	HERCULES



PRODUCTOS (ejemplos del catálogo)
	1.	Barracuda 4-Pack Lata 473ml — West Coast Pilsner
	2.	Hombre Pájaro 6-Pack Botella 355ml — Lager con centeno
	3.	Raymundo Centeno Lata 473ml — Citra Rye Pale Ale
	4.	Barracuda 6-Pack Botella 355ml — West Coast Pilsner
	5.	Fidelinus Sobador 4-Pack Lata 473ml — Weizenbock
	6.	República 6-Pack Botella 355ml — Czech Pilsner
	7.	Superlager Lata 473ml — Extra Amarga
	8.	Huracán Lata 473ml — Doble IPA
	9.	Faro Keller 6-Pack Botella 355ml — Helles Original
	10.	Macanuda 6-Pack Botella 355ml — Brown Ale
	11.	Máquina Lata 473ml — Schwarzbier
	12.	Lucky Muchacho Lata 473ml — Mexican Lager


# Informe de auditoría — rediseño de tres dominios

Auditoría previa al rediseño arquitectónico (junio 2026). Objetivo: decidir qué
ideas del producto merecían conservarse y qué debía rediseñarse desde cero para
llegar a tres dominios de datos aislados (Cartera / Inversiones / Inmuebles),
un Dashboard agregado de solo lectura y una navegación 100 % consistente.

## Diagnóstico

### Modelo de datos

| Problema | Detalle |
|---|---|
| Cash modelado como "asset manual" | El efectivo vivía dentro del dominio de inversiones como `Asset` con `category = OTHERS` + `manualPricing = true`, con movimientos expresados como `Transaction` de tipo `TRANSFER` a precio 1. Mezclaba dominios, obligaba a excepciones en todos los cálculos (`invested` vs `grand`, valoración a cost basis) y contaminaba el histórico de inversiones. |
| Discriminador nullable | `TransactionType.TRANSFER` + columna `transferType IN/OUT` obligaba a comprobar dos campos en cada switch (cálculo FIFO, histórico, formularios, parser de emails). |
| `AssetCategory` ambigua | `FUNDS / STOCKS / PP / OTHERS`: los ETFs no existían como clase (iban dentro de STOCKS) y `OTHERS` era un cajón de sastre para el cash. |
| Inmuebles | Bien aislado a nivel de modelo (`Property`, `Mortgage`, `PropertyValuation`, `PartialAmortization`), pero su equity se incrustaba en la pantalla y el gráfico del portfolio. |

### Navegación

| Problema | Detalle |
|---|---|
| Patrón de retroceso mixto | Unas pantallas usaban `router.back()` (destino imprevisible) y otras links fijos a `/`. |
| Pestañas con botón "atrás" | `/transactions` y `/settings` eran pestañas del nav inferior y aun así mostraban botón atrás hacia `/`. |
| Cabeceras inconsistentes | Home e Inmuebles: título grande sin cabecera; el resto: barra sticky compacta; cada una con su propio markup. |
| Hub `/add` transversal | El botón "+" global mezclaba acciones de dominios distintos (transacción, import Gmail, import JSON). |

### Lo que funcionaba bien

- **Motor FIFO puro** (`src/services/holdings.calc.ts`) sin dependencias de framework, con tests.
- **Pipeline de precios** (EODHD + `Price`/`PriceCache` + cron + refresh por SSE).
- **`scopedDb`**: aislamiento multi-tenant inyectado en el cliente Prisma, con tests.
- **Dominio inmobiliario**: cálculo de hipoteca francés con amortizaciones parciales (testado), valoraciones, reparto por propietarios.
- **Import Gmail/MyInvestor** con preview y dedupe por `gmailMessageId`.
- **Sistema de diseño**: tokens semánticos (`--gain`/`--loss`), tipografía mono para cifras, `sensitive-amount` (modo privacidad), kit shadcn-style.
- **i18n** completo (es/en) con claves tipadas.

## Veredicto: qué se conserva y qué se rediseña

**Se conserva** (con adaptaciones menores): motor FIFO y persistencia de
holdings, pipeline de precios, `scopedDb`, auth Supabase, dominio inmobiliario
completo, import Gmail, settings, formatters, kit UI, charts, i18n.

**Se rediseña**:

1. **Cash → dominio Cartera** con entidad propia `CashMovement`
   (`DEPOSIT`/`WITHDRAWAL`). El cash desaparece por completo de Inversiones.
2. **`AssetCategory` → `AssetClass`** (`FUND / ETF / STOCK / PENSION`). Sin
   `OTHERS`. ETF pasa a clase de primer nivel. `PENSION` se mantiene porque la
   cartera real contiene planes de pensiones.
3. **Tipos de transacción planos**: `TRANSFER_IN` / `TRANSFER_OUT` sustituyen a
   `TRANSFER` + `transferType`. El tipo describe por sí solo el efecto sobre la
   posición.
4. **Página principal → Dashboard** agregado de solo lectura (los tres dominios
   se componen únicamente ahí, a nivel de summary).
5. **Navegación**: 5 pestañas persistentes + componente `PageHeader` único
   (ver `docs/NAVIGATION.md`).

## Migración de datos

Aunque el encargo permitía reintroducción manual, la migración SQL
(`prisma/migrations/20260609120000_three_domain_redesign`) conserva los datos:

1. Las transacciones de assets `OTHERS` se convierten en `CashMovement`
   (entradas → `DEPOSIT`, salidas → `WITHDRAWAL`, nota = nombre del asset) y
   esos assets se eliminan de Inversiones.
2. `TRANSFER` + `transferType` se aplana a `TRANSFER_IN`/`TRANSFER_OUT`.
3. `FUNDS→FUND`, `STOCKS→STOCK`, `PP→PENSION` en `Asset` y `TickerMapping`.
   Los antiguos `STOCKS` que en realidad sean ETFs pueden reclasificarse desde
   el selector de clase en el detalle del activo.

Verificada contra PostgreSQL 16 con datos con la forma del esquema anterior
(incl. `prisma migrate diff` limpio entre la BD migrada y el esquema nuevo).

## Plan de construcción ejecutado

1. **Fase 1 — Esquema y datos**: `schema.prisma` nuevo, migración SQL, seed.
2. **Fase 2 — Núcleo de dominio**: FIFO con tipos planos (+tests), validadores
   Zod, `wallet.service` + `actions/wallet` (nuevos), `portfolio.service`
   reagrupado por clase, `dashboard.service` (agregación de solo lectura),
   parser MyInvestor, export/import JSON con movimientos de cartera.
3. **Fase 3 — Shell de navegación**: `PageHeader`/`SubPageHeader`, `BottomNav`
   de 5 pestañas, eliminación de `router.back()`.
4. **Fase 4 — Pantallas**: Dashboard nuevo, Cartera nueva, Inversiones movida a
   `/investments/*`, Inmuebles estandarizado, Settings con import JSON visible.
5. **Fase 5 — i18n, docs y verificación**: namespaces `dashboard`/`wallet`,
   este documento + `docs/ARCHITECTURE.md` + `docs/NAVIGATION.md`; typecheck,
   51 tests, lint y build en verde.

# Arquitectura — tres dominios aislados

La app se organiza en **tres dominios de datos independientes** más dos
superficies transversales. Los dominios nunca comparten entidades ni se
referencian entre sí; el único punto de cruce es el Dashboard, en lectura.

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard (/)            — agregación READ-ONLY             │
│  compone los summaries públicos de cada dominio              │
└──────┬──────────────────────┬──────────────────────┬────────┘
       │                      │                      │
┌──────▼───────┐   ┌──────────▼─────────┐   ┌────────▼────────┐
│ Cartera      │   │ Inversiones        │   │ Inmuebles       │
│ (/wallet)    │   │ (/investments)     │   │ (/real-estate)  │
│              │   │                    │   │                 │
│ CashMovement │   │ Asset              │   │ Property        │
│              │   │ Transaction        │   │ PropertyOwner   │
│              │   │ Holding (derivada) │   │ PropertyValuation│
│              │   │ Price / PriceCache │   │ Mortgage        │
│              │   │ TickerMapping      │   │ PartialAmort.   │
│              │   │ ImportBatch        │   │                 │
└──────────────┘   └────────────────────┘   └─────────────────┘

        Settings (/settings) — transversal (config, export/import, reset)
```

## Reglas de aislamiento

1. Ningún servicio o server action de un dominio importa entidades de otro
   dominio. Los servicios viven en `src/services/`:
   - Cartera → `wallet.service.ts`, `actions/wallet.ts`
   - Inversiones → `portfolio.service.ts`, `holdings.*`, `price*`,
     `actions/transactions.ts`, `actions/assets.ts`, `actions/import.ts`
   - Inmuebles → `real-estate.service.ts`, `mortgage.service.ts`,
     `actions/real-estate.ts`
2. La única superficie de agregación es `dashboard.service.ts`, que compone los
   **summaries públicos** (`getWalletSummary`, `getInvestmentsSummary`,
   `getRealEstateSummary`) y sus series temporales. Solo lectura.
3. El cash es propiedad exclusiva de Cartera. Las transacciones de Inversiones
   (compras, ventas, traspasos) **no** generan movimientos de cash automáticos:
   la cartera se alimenta manualmente y es la fuente de verdad del efectivo.
4. Las series `{date, close}` de cada dominio se combinan con el util puro
   `mergeSeries` (`src/lib/series.ts`, forward-fill + suma), sin acoplar modelos.

## Modelo de datos (diseñado desde cero)

### Dominio 1 — Cartera

```prisma
enum CashMovementType { DEPOSIT WITHDRAWAL }

model CashMovement {
  id     String           @id @default(cuid())
  userId String
  type   CashMovementType
  date   DateTime
  amount Decimal          @db.Decimal(18, 4)  // siempre > 0; el signo lo da `type`
  note   String?
}
```

- **Saldo** = Σ depósitos − Σ salidas (derivado, nunca almacenado).
- Histórico = suma acumulada por día (`getWalletBalanceHistory`).

### Dominio 2 — Inversiones

```prisma
enum AssetClass      { FUND ETF STOCK PENSION }
enum TransactionType { BUY SELL TRANSFER_IN TRANSFER_OUT DIVIDEND FEE }
```

- `Asset`: instrumento real con ISIN/ticker. `manualPricing` solo para activos
  sin feed de precios (se valoran a cost basis). **No existe la clase OTHERS**:
  el cash no es un asset.
- `Transaction`: tipos planos. `BUY`/`TRANSFER_IN` crean lote FIFO;
  `SELL`/`TRANSFER_OUT` consumen lotes; `DIVIDEND`/`FEE` no afectan a la
  posición. Sin discriminadores nullable.
- `Holding`: caché derivada por asset, recalculada en cada escritura dentro de
  la misma transacción de BD (FIFO puro en `holdings.calc.ts`).
- `Price`, `PriceCache`, `TickerMapping`: datos de mercado globales.
- `ImportBatch`: pipeline de import Gmail (pertenece a este dominio).

### Dominio 3 — Inmuebles

Sin cambios respecto al diseño anterior (ya estaba aislado y bien testado):
`Property` (+impuestos de compra), `PropertyOwner` (reparto), `PropertyValuation`
(snapshots manuales), `Mortgage` (sistema francés) y `PartialAmortization`.

### Transversal

`Settings` (uno por usuario): claves API, tema, idioma, conexión Gmail.

## Decisiones y justificación

- **Tipos de transacción planos**: un solo campo describe el efecto; el switch
  del motor FIFO pasa de 2 dimensiones a 1 y desaparecen los estados inválidos
  (`TRANSFER` sin dirección).
- **ETF como clase propia**: agrupación y pesos por clase reales; los antiguos
  `STOCKS` se reclasifican desde el selector del detalle de activo.
- **Saldo derivado, no almacenado**: imposible des-sincronizar el saldo de la
  cartera con sus movimientos; editar/borrar un movimiento corrige el saldo
  automáticamente.
- **Holding como caché derivada** (se conserva): lecturas O(1) con la verdad en
  las transacciones; el recálculo es atómico con cada escritura.
- **Agregación solo en lectura**: el Dashboard puede cambiar o desaparecer sin
  tocar ningún modelo subyacente.

## Export / Import

El backup JSON (Settings) cubre los tres dominios: `assets`, `transactions`,
`cashMovements` y `properties` (con valoraciones e hipotecas). El import
deduplica por ISIN (assets), por fecha+tipo+importe (movimientos) y por
nombre+fecha de compra (inmuebles).

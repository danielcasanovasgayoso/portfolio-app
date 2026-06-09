# Mapa de navegación

## Principios

1. **Un único patrón de navegación.** Nav inferior persistente con las 5
   secciones (Dashboard, Cartera, Inversiones, Inmuebles, Ajustes), visible en
   toda la app. Las acciones de cada dominio viven dentro del dominio — no hay
   botones globales transversales.
2. **Dos tipos de cabecera, y solo dos** (`src/components/layout/PageHeader.tsx`):
   - `PageHeader` (páginas raíz = pestañas): título grande, sin botón atrás
     (la salida es el propio nav), acciones a la derecha.
   - `SubPageHeader` (subpáginas): barra sticky compacta con **botón atrás como
     `Link` a un href explícito al padre** — nunca `router.back()` — título y
     acciones.
3. **El retroceso siempre es predecible**: cada subpágina declara su padre. Da
   igual cómo se haya llegado (deep link, refresh, historial); atrás lleva
   siempre al mismo sitio.
4. **Sin pantallas huérfanas**: toda pantalla es alcanzable desde su pestaña y
   tiene salida por el nav o por su botón atrás.

## Árbol de rutas

```
PESTAÑAS (PageHeader, sin atrás)
│
├── /                                Dashboard — agregado read-only
│
├── /wallet                          Cartera — saldo, evolución, movimientos
│   └── /wallet/new                  Nuevo movimiento          ← atrás: /wallet
│       (editar/eliminar movimiento: diálogos dentro de /wallet)
│
├── /investments                     Inversiones — posiciones por clase
│   ├── /investments/chart           Evolución                 ← atrás: /investments
│   ├── /investments/transactions    Histórico + filtros       ← atrás: /investments
│   │   └── …/transactions/new       Nueva transacción         ← atrás: /investments/transactions
│   │       (editar/eliminar: diálogos dentro del histórico)
│   ├── /investments/assets/[id]     Detalle de activo         ← atrás: /investments
│   └── /investments/import          Import Gmail (MyInvestor) ← atrás: /investments
│
├── /real-estate                     Inmuebles — lista
│   ├── /real-estate/new             Alta de inmueble          ← atrás: /real-estate
│   └── /real-estate/[id]            Detalle                   ← atrás: /real-estate
│       └── /real-estate/[id]/edit   Edición                   ← atrás: /real-estate/[id]
│
└── /settings                        Ajustes — cuenta, API, tema, idioma,
                                     export/import JSON, reset

AUTH (layout propio, sin nav)
├── /login
└── /register
```

## Entradas a cada pantalla

| Pantalla | Se llega desde |
|---|---|
| Dashboard | pestaña; punto de entrada de la app |
| Cartera | pestaña; tarjeta "Cartera" del Dashboard |
| Nuevo movimiento | botón `+` de Cartera; CTA del estado vacío |
| Inversiones | pestaña; tarjeta "Inversiones" del Dashboard |
| Evolución inversiones | tarjeta-resumen de Inversiones |
| Transacciones | quick-link de Inversiones |
| Nueva transacción | botón `+` de Inversiones; CTA del estado vacío |
| Detalle de activo | tarjeta de posición en Inversiones |
| Import Gmail | quick-link de Inversiones; "Importar más" tras un import |
| Inmuebles | pestaña; tarjeta "Inmuebles" del Dashboard |
| Alta / detalle / edición inmueble | botones dentro de Inmuebles |
| Ajustes | pestaña |

## Comportamientos uniformes

- **Formularios**: guardar navega al padre declarado (`router.push`), cancelar
  también; nunca `router.back()`.
- **Mutaciones rápidas** (editar/eliminar elementos de una lista): diálogo
  sobre la propia lista, sin cambiar de ruta.
- **Estados vacíos**: cada raíz de dominio tiene estado vacío con CTA a su
  acción primaria; el Dashboard vacío enlaza a los tres dominios.
- **Carga**: `loading.tsx` por ruta con skeletons que respetan la cabecera del
  tipo de página.
- **Título**: las pestañas muestran su nombre; las subpáginas su entidad
  (nombre del activo/inmueble) o la acción ("Nuevo movimiento").

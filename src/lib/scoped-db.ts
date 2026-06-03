// User-scoped Prisma client.
//
// Tenant isolation in this app is enforced entirely in application code: every
// query against a user-owned table must filter by `userId`. Relying on each
// call site to remember that filter is fragile — a single forgotten `where`
// leaks another user's financial data.
//
// `scopedDb(userId)` returns a Prisma client that automatically injects the
// current user's id into every operation on a user-owned model:
//   - filter operations (findMany, findFirst, count, ...) get `userId` ANDed
//     into their `where`
//   - create operations get `userId` written into their `data` (overriding any
//     caller-supplied value, so a user can never create rows for someone else)
//   - by-unique-selector operations (findUnique, update, delete, upsert) cannot
//     be safely scoped — they target a row by a unique key, not a filter — so
//     they are rejected with a clear error pointing at the safe alternative.
//
// Global tables (Price, PriceCache, TickerMapping) have no `userId` column and
// are passed through untouched.

import { db } from "./db";

/** Models that carry a `userId` column and must always be user-scoped. */
export const USER_SCOPED_MODELS = new Set<string>([
  "Asset",
  "Transaction",
  "Holding",
  "ImportBatch",
  "Settings",
  "Property",
  "PropertyOwner",
  "PropertyValuation",
  "Mortgage",
  "PartialAmortization",
]);

/** Operations whose `where` is a filter we can safely AND a `userId` into. */
const WHERE_FILTER_OPS = new Set<string>([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/** Operations that insert rows; `userId` is written into the data. */
const CREATE_OPS = new Set<string>([
  "create",
  "createMany",
  "createManyAndReturn",
]);

/**
 * Operations that target a single row by a unique selector. A `userId` cannot
 * be merged into a unique `where`, so these can't be transparently scoped.
 */
const UNIQUE_OPS = new Set<string>([
  "findUnique",
  "findUniqueOrThrow",
  "update",
  "delete",
  "upsert",
]);

type AnyArgs = Record<string, unknown> | undefined;

/**
 * Pure transformation that injects `userId` into a Prisma operation's arguments
 * for user-owned models. Exported for unit testing; the extension below applies
 * it to every query.
 *
 * @throws if called for a by-unique-selector operation on a scoped model.
 */
export function applyUserScope(
  model: string | undefined,
  operation: string,
  args: AnyArgs,
  userId: string
): AnyArgs {
  // Global models (or operations on no specific model) are untouched.
  if (!model || !USER_SCOPED_MODELS.has(model)) {
    return args;
  }

  if (WHERE_FILTER_OPS.has(operation)) {
    const where = (args?.where as Record<string, unknown> | undefined) ?? {};
    return { ...args, where: { ...where, userId } };
  }

  if (CREATE_OPS.has(operation)) {
    const data = args?.data;
    if (Array.isArray(data)) {
      return {
        ...args,
        data: data.map((row) => ({ ...(row as object), userId })),
      };
    }
    return { ...args, data: { ...((data as object) ?? {}), userId } };
  }

  if (UNIQUE_OPS.has(operation)) {
    throw new Error(
      `scopedDb: "${operation}" on ${model} cannot be safely user-scoped ` +
        `because it targets a unique record. Use findFirst / updateMany / ` +
        `deleteMany (which scope by userId) or verify ownership explicitly ` +
        `with the unscoped client.`
    );
  }

  // Unknown/utility operations: leave untouched.
  return args;
}

/**
 * Returns a Prisma client that automatically scopes every user-owned model
 * operation to `userId`. Use this for all reads/writes of user data instead of
 * the raw `db` client.
 */
export function scopedDb(userId: string) {
  return db.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const scoped = applyUserScope(model, operation, args as AnyArgs, userId);
          return query(scoped as Parameters<typeof query>[0]);
        },
      },
    },
  });
}

export type ScopedDb = ReturnType<typeof scopedDb>;

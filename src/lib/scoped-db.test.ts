import { describe, it, expect } from "vitest";
import { applyUserScope, USER_SCOPED_MODELS } from "./scoped-db";

const USER = "user-123";

describe("applyUserScope — filter operations", () => {
  it("injects userId into an empty where", () => {
    const out = applyUserScope("Transaction", "findMany", undefined, USER);
    expect(out).toEqual({ where: { userId: USER } });
  });

  it("ANDs userId alongside existing filters", () => {
    const out = applyUserScope(
      "Transaction",
      "findMany",
      { where: { assetId: "a1" }, orderBy: { date: "desc" } },
      USER
    );
    expect(out).toEqual({
      where: { assetId: "a1", userId: USER },
      orderBy: { date: "desc" },
    });
  });

  it("overrides a caller-supplied userId so it cannot be spoofed", () => {
    const out = applyUserScope(
      "Asset",
      "findFirst",
      { where: { userId: "someone-else", id: "x" } },
      USER
    );
    expect((out!.where as Record<string, unknown>).userId).toBe(USER);
  });

  it.each([
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
    "updateMany",
    "deleteMany",
  ])("scopes the '%s' operation", (op) => {
    const out = applyUserScope("Holding", op, { where: {} }, USER);
    expect((out!.where as Record<string, unknown>).userId).toBe(USER);
  });

  it("does not mutate the original args object", () => {
    const args = { where: { assetId: "a1" } };
    applyUserScope("Transaction", "findMany", args, USER);
    expect(args).toEqual({ where: { assetId: "a1" } });
  });
});

describe("applyUserScope — create operations", () => {
  it("writes userId into create data", () => {
    const out = applyUserScope(
      "Transaction",
      "create",
      { data: { assetId: "a1", shares: 1 } },
      USER
    );
    expect(out).toEqual({ data: { assetId: "a1", shares: 1, userId: USER } });
  });

  it("writes userId into every row of createMany", () => {
    const out = applyUserScope(
      "Transaction",
      "createMany",
      { data: [{ assetId: "a1" }, { assetId: "a2" }] },
      USER
    );
    expect(out!.data).toEqual([
      { assetId: "a1", userId: USER },
      { assetId: "a2", userId: USER },
    ]);
  });

  it("overrides a spoofed userId in create data", () => {
    const out = applyUserScope(
      "Asset",
      "create",
      { data: { userId: "attacker", isin: "X" } },
      USER
    );
    expect((out!.data as Record<string, unknown>).userId).toBe(USER);
  });
});

describe("applyUserScope — unique-selector operations are rejected", () => {
  it.each(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"])(
    "throws for '%s' on a scoped model",
    (op) => {
      expect(() =>
        applyUserScope("Transaction", op, { where: { id: "t1" } }, USER)
      ).toThrow(/cannot be safely user-scoped/);
    }
  );
});

describe("applyUserScope — global models pass through", () => {
  it.each(["Price", "PriceCache", "TickerMapping"])(
    "leaves '%s' untouched",
    (model) => {
      const args = { where: { ticker: "AAPL" } };
      expect(applyUserScope(model, "findMany", args, USER)).toBe(args);
    }
  );

  it("does not reject unique operations on global models", () => {
    const args = { where: { id: "p1" } };
    expect(applyUserScope("Price", "findUnique", args, USER)).toBe(args);
  });

  it("leaves operations with no model untouched", () => {
    const args = { foo: "bar" };
    expect(applyUserScope(undefined, "findMany", args, USER)).toBe(args);
  });
});

describe("USER_SCOPED_MODELS", () => {
  it("covers every user-owned model and excludes global ones", () => {
    for (const m of [
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
    ]) {
      expect(USER_SCOPED_MODELS.has(m)).toBe(true);
    }
    for (const m of ["Price", "PriceCache", "TickerMapping"]) {
      expect(USER_SCOPED_MODELS.has(m)).toBe(false);
    }
  });
});

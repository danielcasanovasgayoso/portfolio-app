import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import type { TransactionType, TransferType } from "@prisma/client";
import { computeHolding, removeFifoShares, type HoldingTransaction } from "./holdings.calc";

// Concise builder for a transaction in a FIFO history.
function tx(
  type: TransactionType,
  shares: number | string,
  pricePerShare: number | string | null = null,
  transferType: TransferType | null = null
): HoldingTransaction {
  return {
    type,
    transferType,
    shares: new Decimal(shares),
    pricePerShare: pricePerShare === null ? null : new Decimal(pricePerShare),
  };
}

describe("computeHolding", () => {
  it("returns zeros for an empty history", () => {
    const r = computeHolding([]);
    expect(r.totalShares.toString()).toBe("0");
    expect(r.totalCostBasis.toString()).toBe("0");
    expect(r.avgPrice.toString()).toBe("0");
  });

  it("handles a single BUY", () => {
    const r = computeHolding([tx("BUY", 10, 100)]);
    expect(r.totalShares.toString()).toBe("10");
    expect(r.totalCostBasis.toString()).toBe("1000");
    expect(r.avgPrice.toString()).toBe("100");
  });

  it("computes a weighted average across multiple BUYs", () => {
    const r = computeHolding([tx("BUY", 10, 100), tx("BUY", 10, 200)]);
    expect(r.totalShares.toString()).toBe("20");
    expect(r.totalCostBasis.toString()).toBe("3000");
    expect(r.avgPrice.toString()).toBe("150");
  });

  it("removes shares oldest-first on a SELL that crosses lots (FIFO)", () => {
    // BUY 10 @ 100, BUY 10 @ 200, SELL 15 -> consumes 10@100 then 5@200.
    const r = computeHolding([
      tx("BUY", 10, 100),
      tx("BUY", 10, 200),
      tx("SELL", 15),
    ]);
    expect(r.totalShares.toString()).toBe("5");
    // Remaining lot is 5 shares from the 200 lot.
    expect(r.totalCostBasis.toString()).toBe("1000");
    expect(r.avgPrice.toString()).toBe("200");
  });

  it("keeps cost basis tied to the lots actually consumed, not the latest price", () => {
    // SELL of 3 must remove the cheapest (oldest) shares first.
    const r = computeHolding([
      tx("BUY", 5, 10),
      tx("BUY", 5, 20),
      tx("SELL", 3),
    ]);
    expect(r.totalShares.toString()).toBe("7");
    expect(r.totalCostBasis.toString()).toBe("120"); // 2@10 + 5@20
    expect(r.avgPrice.toNumber()).toBeCloseTo(17.142857, 6);
  });

  it("returns zeros after selling the entire position", () => {
    const r = computeHolding([tx("BUY", 10, 100), tx("SELL", 10)]);
    expect(r.totalShares.toString()).toBe("0");
    expect(r.totalCostBasis.toString()).toBe("0");
    expect(r.avgPrice.toString()).toBe("0");
  });

  it("treats TRANSFER IN like a BUY and TRANSFER OUT like a SELL", () => {
    const r = computeHolding([
      tx("TRANSFER", 10, 50, "IN"),
      tx("TRANSFER", 4, null, "OUT"),
    ]);
    expect(r.totalShares.toString()).toBe("6");
    expect(r.totalCostBasis.toString()).toBe("300"); // 6 @ 50
    expect(r.avgPrice.toString()).toBe("50");
  });

  it("ignores DIVIDEND and FEE transactions", () => {
    const r = computeHolding([
      tx("BUY", 10, 100),
      tx("DIVIDEND", 0, 25),
      tx("FEE", 0, 5),
    ]);
    expect(r.totalShares.toString()).toBe("10");
    expect(r.totalCostBasis.toString()).toBe("1000");
  });

  it("clamps to non-negative when selling more than was ever held", () => {
    const r = computeHolding([tx("BUY", 5, 100), tx("SELL", 10)]);
    expect(r.totalShares.toString()).toBe("0");
    expect(r.totalCostBasis.toString()).toBe("0");
    expect(r.avgPrice.toString()).toBe("0");
  });

  it("treats a missing price as zero cost", () => {
    const r = computeHolding([tx("BUY", 10, null)]);
    expect(r.totalShares.toString()).toBe("10");
    expect(r.totalCostBasis.toString()).toBe("0");
    expect(r.avgPrice.toString()).toBe("0");
  });

  it("preserves precision with fractional fund shares", () => {
    const r = computeHolding([
      tx("BUY", "1.5", "100.50"),
      tx("BUY", "2.25", "80.00"),
    ]);
    expect(r.totalShares.toString()).toBe("3.75");
    expect(r.totalCostBasis.toString()).toBe("330.75"); // 150.75 + 180.00
    expect(r.avgPrice.toString()).toBe("88.2");
  });

  it("re-buys after a full exit using the new lot's basis", () => {
    const r = computeHolding([
      tx("BUY", 10, 100),
      tx("SELL", 10),
      tx("BUY", 5, 250),
    ]);
    expect(r.totalShares.toString()).toBe("5");
    expect(r.totalCostBasis.toString()).toBe("1250");
    expect(r.avgPrice.toString()).toBe("250");
  });
});

describe("removeFifoShares", () => {
  it("partially consumes the oldest lot and leaves the remainder", () => {
    const lots = [
      { shares: new Decimal(10), pricePerShare: new Decimal(100) },
      { shares: new Decimal(10), pricePerShare: new Decimal(200) },
    ];
    const { costBasisRemoved, sharesRemoved } = removeFifoShares(lots, new Decimal(4));
    expect(sharesRemoved.toString()).toBe("4");
    expect(costBasisRemoved.toString()).toBe("400");
    expect(lots).toHaveLength(2);
    expect(lots[0].shares.toString()).toBe("6"); // oldest lot reduced in place
  });

  it("stops when lots are exhausted", () => {
    const lots = [{ shares: new Decimal(3), pricePerShare: new Decimal(10) }];
    const { costBasisRemoved, sharesRemoved } = removeFifoShares(lots, new Decimal(5));
    expect(sharesRemoved.toString()).toBe("3");
    expect(costBasisRemoved.toString()).toBe("30");
    expect(lots).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  NET_WORTH_DOMAINS,
  mergeNetWorthHistory,
  parseNetWorthDomains,
  serializeNetWorthDomains,
  sumNetWorth,
} from "./net-worth-filter";

describe("parseNetWorthDomains", () => {
  it("defaults to every domain when the cookie is missing or empty", () => {
    expect(parseNetWorthDomains(undefined)).toEqual([...NET_WORTH_DOMAINS]);
    expect(parseNetWorthDomains("")).toEqual([...NET_WORTH_DOMAINS]);
  });

  it("keeps only known domains, in canonical order", () => {
    expect(parseNetWorthDomains("realEstate,bogus,wallet")).toEqual([
      "wallet",
      "realEstate",
    ]);
  });

  it("falls back to every domain when nothing valid remains", () => {
    expect(parseNetWorthDomains("bogus,,x")).toEqual([...NET_WORTH_DOMAINS]);
  });

  it("round-trips through serializeNetWorthDomains", () => {
    const value = serializeNetWorthDomains(["realEstate", "investments"]);
    expect(value).toBe("investments,realEstate");
    expect(parseNetWorthDomains(value)).toEqual(["investments", "realEstate"]);
  });
});

describe("sumNetWorth", () => {
  const values = { wallet: 100.1, investments: 200.2, realEstate: 300.3 };

  it("sums only the enabled domains", () => {
    expect(sumNetWorth(values, ["investments", "realEstate"])).toBe(500.5);
    expect(sumNetWorth(values, ["wallet"])).toBe(100.1);
  });

  it("rounds to cents", () => {
    expect(sumNetWorth(values, [...NET_WORTH_DOMAINS])).toBe(600.6);
  });
});

describe("mergeNetWorthHistory", () => {
  const histories = {
    wallet: [
      { date: "2026-01-01", close: 10 },
      { date: "2026-01-03", close: 30 },
    ],
    investments: [{ date: "2026-01-02", close: 100 }],
    realEstate: [{ date: "2026-01-01", close: 1000 }],
  };

  it("merges only the enabled domains", () => {
    expect(mergeNetWorthHistory(histories, ["wallet", "investments"])).toEqual([
      { date: "2026-01-01", close: 10 },
      { date: "2026-01-02", close: 110 },
      { date: "2026-01-03", close: 130 },
    ]);
  });

  it("returns a single enabled domain's series unchanged", () => {
    expect(mergeNetWorthHistory(histories, ["realEstate"])).toEqual(
      histories.realEstate
    );
  });
});

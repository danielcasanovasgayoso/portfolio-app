import { describe, it, expect } from "vitest";
import {
  monthlyPayment,
  computeSchedule,
  summarize,
  type MortgageInput,
} from "./mortgage.service";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("monthlyPayment", () => {
  it("returns 0 for a non-positive term", () => {
    expect(monthlyPayment(100000, 0.03, 0)).toBe(0);
    expect(monthlyPayment(100000, 0.03, -12)).toBe(0);
  });

  it("splits principal evenly when the rate is zero", () => {
    expect(monthlyPayment(12000, 0, 12)).toBe(1000);
  });

  it("matches the French-system formula for a standard loan", () => {
    // 100k @ 3% over 30 years ≈ 421.60/month.
    expect(monthlyPayment(100000, 0.03, 360)).toBeCloseTo(421.6, 1);
  });
});

describe("computeSchedule", () => {
  it("fully amortizes a zero-interest loan to a zero balance", () => {
    const mortgage: MortgageInput = {
      loanAmount: 12000,
      annualInterestRate: 0,
      termMonths: 12,
      startDate: utc(2020, 1, 1),
    };
    const schedule = computeSchedule(mortgage, [], utc(2025, 1, 1));

    expect(schedule).toHaveLength(12);
    expect(schedule.every((row) => row.interest === 0)).toBe(true);
    expect(schedule.every((row) => row.payment === 1000)).toBe(true);
    expect(schedule[schedule.length - 1].balance).toBe(0);
  });

  it("amortizes a standard loan over exactly the term with no leftover balance", () => {
    const mortgage: MortgageInput = {
      loanAmount: 100000,
      annualInterestRate: 0.03,
      termMonths: 360,
      startDate: utc(2000, 1, 1),
    };
    const schedule = computeSchedule(mortgage, [], utc(2100, 1, 1));

    // Rounding the monthly installment to cents can leave a tiny residual that
    // is cleared by one extra final row, so the term may run one month over.
    expect(schedule.length).toBeGreaterThanOrEqual(360);
    expect(schedule.length).toBeLessThanOrEqual(361);
    expect(schedule[schedule.length - 1].balance).toBe(0);

    // Rounded principal payments must sum back to the original loan amount.
    const principalPaid = schedule.reduce((s, row) => s + row.principal, 0);
    expect(principalPaid).toBeCloseTo(100000, 2);

    const totalInterest = schedule.reduce((s, row) => s + row.interest, 0);
    expect(totalInterest).toBeGreaterThan(0);
  });

  it("back-fills decreasing pendingQuotas", () => {
    const schedule = computeSchedule(
      {
        loanAmount: 12000,
        annualInterestRate: 0,
        termMonths: 12,
        startDate: utc(2020, 1, 1),
      },
      [],
      utc(2025, 1, 1)
    );
    expect(schedule[0].pendingQuotas).toBe(11);
    expect(schedule[schedule.length - 1].pendingQuotas).toBe(0);
  });

  it("shortens the loan when a partial amortization reduces the term", () => {
    const mortgage: MortgageInput = {
      loanAmount: 100000,
      annualInterestRate: 0.03,
      termMonths: 360,
      startDate: utc(2000, 1, 1),
    };
    const schedule = computeSchedule(
      mortgage,
      [{ date: utc(2000, 2, 15), amount: 30000, mode: "REDUCE_TERM" }],
      utc(2100, 1, 1)
    );

    // A big early repayment that keeps the installment must finish sooner.
    expect(schedule.length).toBeLessThan(360);
    expect(schedule[schedule.length - 1].balance).toBe(0);
    expect(schedule[1].partialAmortization).toBe(30000);
  });

  it("lowers the installment but keeps the term when reducing the installment", () => {
    const mortgage: MortgageInput = {
      loanAmount: 100000,
      annualInterestRate: 0.03,
      termMonths: 360,
      startDate: utc(2000, 1, 1),
    };
    const baseline = computeSchedule(mortgage, [], utc(2100, 1, 1));
    const schedule = computeSchedule(
      mortgage,
      [{ date: utc(2000, 2, 15), amount: 30000, mode: "REDUCE_INSTALLMENT" }],
      utc(2100, 1, 1)
    );

    // Installment after the partial is lower than the original one...
    expect(schedule[100].payment).toBeLessThan(baseline[100].payment);
    // ...and the term is not shortened beyond the original.
    expect(schedule.length).toBeLessThanOrEqual(360);
    expect(schedule[schedule.length - 1].balance).toBe(0);
  });

  it("prepends an interest-only stub row that leaves the balance untouched", () => {
    const mortgage: MortgageInput = {
      loanAmount: 100000,
      annualInterestRate: 0.03,
      termMonths: 360,
      startDate: utc(2000, 2, 1),
      initialInterest: { date: utc(2000, 1, 15), amount: 150 },
    };
    const schedule = computeSchedule(mortgage, [], utc(2100, 1, 1));

    expect(schedule[0].index).toBe(0);
    expect(schedule[0].interest).toBe(150);
    expect(schedule[0].principal).toBe(0);
    expect(schedule[0].balance).toBe(100000);
    // Regular installments still number from 1 (the stub is index 0).
    const regular = schedule.filter((row) => row.index >= 1);
    expect(regular.length).toBeGreaterThanOrEqual(360);
    expect(regular.length).toBeLessThanOrEqual(361);
  });
});

describe("summarize", () => {
  const mortgage: MortgageInput = {
    loanAmount: 100000,
    annualInterestRate: 0.03,
    termMonths: 360,
    startDate: utc(2000, 1, 1),
    downPayment: 20000,
  };

  it("reports progress partway through the loan", () => {
    const today = utc(2010, 1, 1); // ~120 installments in
    const schedule = computeSchedule(mortgage, [], today);
    const summary = summarize(mortgage, schedule);

    expect(summary.monthlyPayment).toBeCloseTo(421.6, 1);
    expect(summary.downPayment).toBe(20000);
    expect(summary.remainingBalance).toBeGreaterThan(0);
    expect(summary.remainingBalance).toBeLessThan(100000);
    expect(summary.pendingQuotas).toBeGreaterThan(0);
    expect(summary.pendingQuotas).toBeLessThan(360);
    expect(summary.totalInterest).toBeGreaterThan(0);
    expect(summary.paidToDate).toBe(summary.totalPaid);
  });

  it("excludes the interest-only stub from pending quotas", () => {
    const withStub: MortgageInput = {
      ...mortgage,
      startDate: utc(2000, 2, 1),
      initialInterest: { date: utc(2000, 1, 15), amount: 150 },
    };
    const schedule = computeSchedule(withStub, [], utc(1999, 1, 1)); // nothing paid yet
    const summary = summarize(withStub, schedule);

    // Every regular installment is pending; the stub (index 0) is not counted.
    const regularCount = schedule.filter((row) => row.index >= 1).length;
    expect(summary.pendingQuotas).toBe(regularCount);
    expect(summary.pendingQuotas).toBeGreaterThanOrEqual(360);
  });
});

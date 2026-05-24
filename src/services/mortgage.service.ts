// Mortgage amortization math (pure, no DB access).
// Uses the standard French amortization system, rounding each row to cents
// to mirror a typical bank/Excel amortization table.

export type MortgageInput = {
  loanAmount: number;
  annualInterestRate: number; // e.g. 0.0125 for 1.25%
  termMonths: number;
  startDate: Date; // date of the first regular payment
  downPayment?: number;
};

export type PartialAmortizationInput = {
  date: Date;
  amount: number;
  mode: "REDUCE_TERM" | "REDUCE_INSTALLMENT";
};

export type ScheduleRow = {
  index: number; // 1-based installment number
  paymentDate: string; // ISO yyyy-mm-dd
  payment: number;
  interest: number;
  principal: number;
  balance: number; // outstanding balance after this payment
  pendingQuotas: number; // installments remaining after this one
  remainingYears: number;
  status: "PAID" | "PENDING";
  partialAmortization: number; // extra capital repaid this month (0 if none)
};

export type MortgageSummary = {
  monthlyPayment: number;
  remainingBalance: number;
  pendingQuotas: number;
  remainingYears: number;
  totalInterest: number;
  totalPaid: number; // installments paid to date (interest + principal)
  paidToDate: number; // alias kept for clarity
  downPayment: number;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Standard French-system monthly payment.
 * P·r / (1 − (1+r)^−n), with r = annualRate / 12.
 */
export function monthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (termMonths <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths));
}

/**
 * Builds the full amortization schedule. Each row is rounded to cents.
 * Partial amortizations are applied in the month matching their date:
 * REDUCE_TERM keeps the installment and shortens the loan; REDUCE_INSTALLMENT
 * recomputes a lower installment over the remaining months.
 */
export function computeSchedule(
  mortgage: MortgageInput,
  partials: PartialAmortizationInput[] = [],
  today: Date = new Date()
): ScheduleRow[] {
  const r = mortgage.annualInterestRate / 12;
  let balance = mortgage.loanAmount;
  let payment = round2(
    monthlyPayment(balance, mortgage.annualInterestRate, mortgage.termMonths)
  );
  let remainingMonths = mortgage.termMonths;

  // Group partial amortizations by the installment month they fall on.
  const sortedPartials = [...partials].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const rows: ScheduleRow[] = [];
  const todayTime = today.getTime();
  let index = 0;
  const maxIterations = mortgage.termMonths + 1200; // safety cap

  while (balance > 0.005 && index < maxIterations) {
    index += 1;
    const paymentDate = addMonths(mortgage.startDate, index - 1);

    const interest = round2(balance * r);
    let principal = round2(payment - interest);

    // Final installment: pay off whatever remains.
    if (principal >= balance) {
      principal = balance;
    }

    let rowPayment = round2(interest + principal);
    balance = round2(balance - principal);
    remainingMonths -= 1;

    // Apply any partial amortizations dated within this installment's month.
    let partialThisMonth = 0;
    const monthStart = paymentDate;
    const nextMonth = addMonths(mortgage.startDate, index);
    for (const p of sortedPartials) {
      if (
        balance > 0 &&
        p.date.getTime() >= monthStart.getTime() &&
        p.date.getTime() < nextMonth.getTime()
      ) {
        const applied = Math.min(round2(p.amount), balance);
        balance = round2(balance - applied);
        partialThisMonth = round2(partialThisMonth + applied);
        rowPayment = round2(rowPayment + applied);
        if (p.mode === "REDUCE_INSTALLMENT" && balance > 0 && remainingMonths > 0) {
          payment = round2(
            monthlyPayment(balance, mortgage.annualInterestRate, remainingMonths)
          );
        }
        // REDUCE_TERM: keep payment; loan naturally finishes earlier.
      }
    }

    rows.push({
      index,
      paymentDate: toISODate(paymentDate),
      payment: rowPayment,
      interest,
      principal,
      balance,
      pendingQuotas: 0, // filled in below
      remainingYears: 0,
      status: paymentDate.getTime() <= todayTime ? "PAID" : "PENDING",
      partialAmortization: partialThisMonth,
    });
  }

  // Back-fill pendingQuotas / remainingYears now that the length is known.
  const total = rows.length;
  for (let i = 0; i < total; i++) {
    const pending = total - (i + 1);
    rows[i].pendingQuotas = pending;
    rows[i].remainingYears = Math.ceil(pending / 12);
  }

  return rows;
}

/**
 * Derives summary metrics from a computed schedule.
 */
export function summarize(
  mortgage: MortgageInput,
  schedule: ScheduleRow[]
): MortgageSummary {
  const basePayment = round2(
    monthlyPayment(
      mortgage.loanAmount,
      mortgage.annualInterestRate,
      mortgage.termMonths
    )
  );

  const paidRows = schedule.filter((row) => row.status === "PAID");
  const pendingRows = schedule.filter((row) => row.status === "PENDING");

  const remainingBalance = paidRows.length
    ? paidRows[paidRows.length - 1].balance
    : mortgage.loanAmount;

  const totalInterest = round2(
    schedule.reduce((sum, row) => sum + row.interest, 0)
  );
  const totalPaid = round2(
    paidRows.reduce((sum, row) => sum + row.payment, 0)
  );
  const pendingQuotas = pendingRows.length;

  return {
    monthlyPayment: basePayment,
    remainingBalance,
    pendingQuotas,
    remainingYears: Math.ceil(pendingQuotas / 12),
    totalInterest,
    totalPaid,
    paidToDate: totalPaid,
    downPayment: mortgage.downPayment ?? 0,
  };
}

import * as cheerio from "cheerio";
import { SKIP_PATTERNS } from "@/lib/gmail";
import type { GmailEmail, ParsedEmail, ParsedTransaction, EmailType } from "@/types/import";
import type { TransactionType, TransferType } from "@prisma/client";
import { resolveIsinFromDgsfp } from "@/lib/myinvestor-funds";

/**
 * Subject line regex patterns
 * Example: "** MYINVESTOR **CONFIRMACIÓN DE OPERACIÓN DE VALORES : XXXXXX5641 # 03/03/2026 # COMPRA # INVESCO PHYSICAL GOLD ETC # TIT: 2 # PRE: 419.80 # 840.61 EUR"
 */
const SUBJECT_REGEX = /# (\d{2}\/\d{2}\/\d{4}) # (\w+) # (.+?) # TIT: ([\d.,]+) # PRE: ([\d.,]+) # ([\d.,]+) (\w+)/;

/**
 * Maps Spanish operation types to transaction types
 */
const OPERATION_TYPE_MAP: Record<string, { type: TransactionType; transferType?: TransferType }> = {
  "COMPRA": { type: "BUY" },
  "SUSCRIPCION": { type: "BUY" },
  "VENTA": { type: "SELL" },
  "REEMBOLSO": { type: "SELL" },
  "TRASPASO_SALIDA": { type: "TRANSFER", transferType: "OUT" },
  "TRASPASO_ENTRADA": { type: "TRANSFER", transferType: "IN" },
};

/**
 * Classifies an email based on its subject
 */
function classifyEmail(subject: string): EmailType {
  const upperSubject = subject.toUpperCase();

  if (upperSubject.includes("TRANSFERENCIA SEPA")) {
    return "SEPA_TRANSFER";
  } else if (upperSubject.includes("MODIFICACIÓN DE COMISIONES") || upperSubject.includes("MODIFICACION DE COMISIONES")) {
    return "COMMISSION_CHANGE";
  } else if (upperSubject.includes("ABONO") || upperSubject.includes("CARGO")) {
    return "ACCOUNT_CREDIT_DEBIT";
  } else if (upperSubject.includes("LIQUIDACION CUENTA CORRIENTE") || upperSubject.includes("LIQUIDACIÓN CUENTA CORRIENTE")) {
    return "INTEREST_SETTLEMENT";
  } else if (upperSubject.includes("TRASPASO")) {
    return "FUND_TRANSFER";
  } else if (upperSubject.includes("REEMBOLSO")) {
    return "FUND_REDEMPTION";
  } else if (upperSubject.includes("APORTACION A PLANES DE PENSIONES") || upperSubject.includes("APORTACIÓN A PLANES DE PENSIONES")) {
    return "PENSION_CONTRIBUTION";
  } else if (
    upperSubject.includes("CONFIRMACIÓN DE OPERACIÓN") ||
    upperSubject.includes("CONFIRMACION DE OPERACION") ||
    upperSubject.includes("SUSCRIPCION") ||
    upperSubject.includes("SUSCRIPCIÓN") ||
    upperSubject.includes("COMPRA")
  ) {
    return "FUND_SUBSCRIPTION";
  } else {
    return "UNKNOWN";
  }
}

/**
 * Checks if an email should be skipped
 */
function shouldSkipEmail(subject: string): { skip: boolean; reason?: string } {
  for (const pattern of SKIP_PATTERNS) {
    if (subject.toUpperCase().includes(pattern.toUpperCase())) {
      return { skip: true, reason: `Matches skip pattern: ${pattern}` };
    }
  }
  return { skip: false };
}

/**
 * Parses a number that can be in Spanish (1.234,56) or English (1,234.56) format
 */
function parseSpanishNumber(value: string): number {
  if (!value) return 0;

  const trimmed = value.trim();

  // Detect format by checking if comma or dot comes last
  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");

  if (lastComma > lastDot) {
    // Spanish format: 1.234,56 (comma is decimal separator)
    const normalized = trimmed.replace(/\./g, "").replace(",", ".");
    return parseFloat(normalized) || 0;
  } else {
    // English format: 1,234.56 (dot is decimal separator)
    const normalized = trimmed.replace(/,/g, "");
    return parseFloat(normalized) || 0;
  }
}

/**
 * Parses a Spanish date string (DD/MM/YYYY)
 */
function parseSpanishDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Extracts transaction data from email subject
 */
function parseSubject(subject: string): Partial<ParsedTransaction> | null {
  const match = subject.match(SUBJECT_REGEX);
  if (!match) return null;

  const [, dateStr, operation, name, shares, price, total, currency] = match;

  const operationType = OPERATION_TYPE_MAP[operation.toUpperCase()];
  if (!operationType) return null;

  return {
    date: parseSpanishDate(dateStr),
    type: operationType.type,
    transferType: operationType.transferType,
    name: name.trim(),
    shares: parseSpanishNumber(shares),
    pricePerShare: parseSpanishNumber(price),
    totalAmount: parseSpanishNumber(total),
    currency: currency.toUpperCase(),
  };
}

/**
 * Extracts ISIN from HTML body using cheerio
 */
function extractIsinFromHtml(html: string): string | null {
  const $ = cheerio.load(html);

  const isinRegex = /[A-Z]{2}[A-Z0-9]{9}[0-9]/g;
  const text = $("body").text() || $("*").text() || html;
  const matches = text.match(isinRegex);

  if (matches && matches.length > 0) {
    return matches[0];
  }

  return null;
}

/**
 * Extracts commission/fees from HTML body
 */
function extractFeesFromHtml(html: string): number {
  const $ = cheerio.load(html);
  const text = ($("body").text() || $("*").text() || html).toLowerCase();

  const commissionPatterns = [
    /comisi[oó]n[:\s]*([\d.,]+)/i,
    /gastos[:\s]*([\d.,]+)/i,
    /corretaje[:\s]*([\d.,]+)/i,
  ];

  for (const pattern of commissionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseSpanishNumber(match[1]);
    }
  }

  return 0;
}

/**
 * Extracts reference number from HTML body
 */
function extractReferenceFromHtml(html: string): string | null {
  const $ = cheerio.load(html);
  const text = $("body").text() || $("*").text() || html;

  const refPatterns = [
    /referencia[:\s]*(\d+\/?\d*)/i,
    /n[úu]mero de operaci[oó]n[:\s]*(\d+)/i,
    /(\d{6,}\/\d+)/,
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Parses a transfer email
 * TRASPASO emails contain BOTH sides of the transfer in a single email:
 * - Valor (Fondo Reembolsado) = Source fund (TRANSFER OUT)
 * - Valor (Fondo Suscrito) = Destination fund (TRANSFER IN)
 *
 * The operation field may show "REEMB.POR TRASPASO" for all cases,
 * so we use the fund labels to determine direction, not the operation type.
 */
function parseTransferEmail(email: GmailEmail): ParsedTransaction[] {
  const $ = cheerio.load(email.body);
  const transactions: ParsedTransaction[] = [];
  const text = $("body").text() || $("*").text() || email.body;

  // Check if this is a transfer email (contains transfer operation keywords)
  const hasReemb = text.includes("REEMB.POR TRASPASO") || text.includes("REEMBOLSO POR TRASPASO");
  const hasSuscr = text.includes("SUSCR.POR TRASPASO") || text.includes("SUSCRIPCION POR TRASPASO");
  const isTransferEmail = hasReemb || hasSuscr;

  if (!isTransferEmail) {
    return transactions;
  }

  // Extract ISINs - in transfer emails, they appear in order:
  // 1st ISIN = Fondo Reembolsado (source)
  // 2nd ISIN = Fondo Suscrito (destination)
  const isinMatches = text.match(/[A-Z]{2}[A-Z0-9]{9}[0-9]/g) || [];
  const uniqueIsins = [...new Set(isinMatches)];

  if (uniqueIsins.length === 0) {
    return transactions;
  }

  // Extract common fields
  let shares = 0;
  let pricePerShare = 0;
  let amount = 0;

  // Find the operation details section and extract all numbers with EUR
  const detailSection = text.match(/N[uú]mero de Participaciones[\s\S]*?Importe (?:Bruto|Neto)[\s\S]*?([\d.,]+)[\s\S]*?([\d.,]+)\s*EUR[\s\S]*?([\d.,]+)\s*EUR/i);

  if (detailSection) {
    shares = parseSpanishNumber(detailSection[1]);
    pricePerShare = parseSpanishNumber(detailSection[2]);
    amount = parseSpanishNumber(detailSection[3]);
  } else {
    // Fallback: try to extract individually
    const sharesMatch = text.match(/N[uú]mero de Participaciones[^\d]*([\d.,]+)/i);
    if (sharesMatch) {
      shares = parseSpanishNumber(sharesMatch[1]);
    }

    const navMatch = text.match(/Valor Liquidativo[^\d]*([\d.,]+)\s*EUR/i);
    if (navMatch) {
      pricePerShare = parseSpanishNumber(navMatch[1]);
    }

    const amountNetoMatch = text.match(/Importe Neto[^\d]*([\d.,]+)\s*EUR/i);
    if (amountNetoMatch) {
      amount = parseSpanishNumber(amountNetoMatch[1]);
    } else {
      const amountBrutoMatch = text.match(/Importe Bruto[^\d]*([\d.,]+)\s*EUR/i);
      if (amountBrutoMatch) {
        amount = parseSpanishNumber(amountBrutoMatch[1]);
      }
    }
  }

  // Parse date from "Fecha Operación"
  let date = email.date;
  const dateMatch = text.match(/Fecha Operaci[oó]n[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (dateMatch) {
    date = parseSpanishDate(dateMatch[1]);
  }

  const extractFundName = (isin: string): string => isin;

  // MyInvestor sends TWO separate emails per transfer:
  // - REEMB.POR TRASPASO = redemption email (OUT from source fund)
  // - SUSCR.POR TRASPASO = subscription email (IN to destination fund)
  // Both emails contain both ISINs for reference, but each describes only ONE leg.
  const isRedemption = hasReemb;

  // For REEMB: use first ISIN (Fondo Reembolsado = source)
  // For SUSCR: use second ISIN (Fondo Suscrito = destination)
  const isin = isRedemption ? uniqueIsins[0] : (uniqueIsins[1] || uniqueIsins[0]);
  const transferType: TransferType = isRedemption ? "OUT" : "IN";
  // Counterpart = the *other* ISIN in the email, used later to pair legs.
  const counterpartIsin = isRedemption
    ? (uniqueIsins[1] || undefined)
    : (uniqueIsins[0] || undefined);

  const transaction: ParsedTransaction = {
    date,
    type: "TRANSFER",
    transferType,
    isin,
    name: extractFundName(isin),
    shares,
    pricePerShare,
    totalAmount: amount,
    fees: 0,
    currency: "EUR",
    emailId: email.id,
    emailType: "FUND_TRANSFER",
    counterpartIsin,
  };

  transactions.push(transaction);

  return transactions;
}

/**
 * Parses a pension plan contribution email
 * Subject format: "** MYINVESTOR **APORTACION A PLANES DE PENSIONES : XXXXXX1234 # DD/MM/YYYY # NOMBRE DEL PLAN # IMPORTE EUR"
 */
function parsePensionContributionEmail(email: GmailEmail): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const $ = cheerio.load(email.body);
  const bodyText = $("body").text() || $("*").text() || email.body;

  // Try to extract from subject
  // Pattern: # DD/MM/YYYY # PLAN NAME # AMOUNT EUR
  const subjectMatch = email.subject.match(/# (\d{2}\/\d{2}\/\d{4}) # (.+?) # ([\d.,]+) (\w+)/);

  let date = email.date;
  let name = "Plan de Pensiones";
  let amount = 0;
  let currency = "EUR";

  if (subjectMatch) {
    date = parseSpanishDate(subjectMatch[1]);
    name = subjectMatch[2].trim();
    amount = parseSpanishNumber(subjectMatch[3]);
    currency = subjectMatch[4].toUpperCase();
  } else {
    // Try to extract amount from body
    const amountMatch = bodyText.match(/importe[:\s]*([\d.,]+)/i) ||
                        bodyText.match(/aportaci[oó]n[:\s]*([\d.,]+)/i) ||
                        bodyText.match(/([\d.,]+)\s*EUR/i);
    if (amountMatch) {
      amount = parseSpanishNumber(amountMatch[1]);
    }

    // Try to extract plan name from body
    const nameMatch = bodyText.match(/plan[:\s]*([^\n]+)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
  }

  let isin = extractIsinFromHtml(email.body);

  // Pension plan emails use DGSFP registry codes (e.g. "Código DGS: N5396") instead of ISINs
  if (!isin) {
    const dgsfpMatch = bodyText.match(/[Cc][oó]digo\s*DGS(?:FP)?[^:]*:\s*(N\d{4})/);
    if (dgsfpMatch) {
      isin = resolveIsinFromDgsfp(dgsfpMatch[1]);
    }
  }

  // Extract shares (participaciones) and price from body
  let shares = amount; // fallback: shares = amount (1:1)
  let pricePerShare = 1;
  const sharesMatch = bodyText.match(/[Nn][uú]mero\s*de\s*participaciones\s*([\d.,]+)/);
  const priceMatch = bodyText.match(/[Pp]recio\s*bruto\s*([\d.,]+)/);
  if (sharesMatch) {
    shares = parseSpanishNumber(sharesMatch[1]);
  }
  if (priceMatch) {
    pricePerShare = parseSpanishNumber(priceMatch[1]);
  }

  // Extract date from body if not found in subject
  if (!subjectMatch) {
    const dateMatch = bodyText.match(/[Ff]echa\s*de\s*operaci[oó]n\s*(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      date = parseSpanishDate(dateMatch[1]);
    }
  }

  if (amount > 0) {
    const finalName = isin ? isin : name;

    transactions.push({
      date,
      type: "BUY",
      isin: isin || "UNKNOWN_PP",
      name: finalName,
      shares,
      pricePerShare,
      totalAmount: amount,
      fees: 0,
      currency,
      emailId: email.id,
      emailType: "PENSION_CONTRIBUTION",
    });
  }

  return transactions;
}

/**
 * Parses an interest/dividend settlement email
 */
function parseDividendEmail(email: GmailEmail): ParsedTransaction[] {
  const $ = cheerio.load(email.body);
  const transactions: ParsedTransaction[] = [];

  const text = $("body").text() || $("*").text() || email.body;
  const amountMatch = text.match(/importe[:\s]*([\d.,]+)/i) ||
                      text.match(/liquido[:\s]*([\d.,]+)/i) ||
                      text.match(/([\d.,]+)\s*EUR/i);

  if (amountMatch) {
    const amount = parseSpanishNumber(amountMatch[1]);
    const isin = extractIsinFromHtml(email.body);
    const name = isin ? isin : "Interest Settlement";

    transactions.push({
      date: email.date,
      type: "DIVIDEND",
      isin: isin || "UNKNOWN",
      name,
      shares: 0,
      pricePerShare: 0,
      totalAmount: amount,
      fees: 0,
      currency: "EUR",
      emailId: email.id,
      emailType: "INTEREST_SETTLEMENT",
    });
  }

  return transactions;
}

/**
 * Main parser function - parses a single email
 */
export function parseMyInvestorEmail(email: GmailEmail): ParsedEmail {
  const emailType = classifyEmail(email.subject);
  const skipCheck = shouldSkipEmail(email.subject);

  const result: ParsedEmail = {
    emailId: email.id,
    subject: email.subject,
    date: email.date,
    emailType,
    transactions: [],
    rawHtml: email.body,
    shouldSkip: skipCheck.skip,
    skipReason: skipCheck.reason,
    parseErrors: [],
  };

  // Skip certain email types
  if (
    skipCheck.skip ||
    emailType === "SEPA_TRANSFER" ||
    emailType === "COMMISSION_CHANGE" ||
    emailType === "ACCOUNT_CREDIT_DEBIT" ||
    emailType === "UNKNOWN"
  ) {
    result.shouldSkip = true;
    result.skipReason = result.skipReason || `Email type: ${emailType}`;
    return result;
  }

  try {
    if (emailType === "FUND_TRANSFER") {
      result.transactions = parseTransferEmail(email);
    } else if (emailType === "INTEREST_SETTLEMENT") {
      result.transactions = parseDividendEmail(email);
    } else if (emailType === "PENSION_CONTRIBUTION") {
      result.transactions = parsePensionContributionEmail(email);
    } else {
      // Standard fund subscription/redemption
      const subjectData = parseSubject(email.subject);

      if (subjectData) {
        const isin = extractIsinFromHtml(email.body);
        const fees = extractFeesFromHtml(email.body);
        const reference = extractReferenceFromHtml(email.body);
        const name = isin
          ? isin
          : subjectData.name || "Unknown Asset";

        result.transactions.push({
          date: subjectData.date || email.date,
          type: subjectData.type || "BUY",
          transferType: subjectData.transferType,
          isin: isin || "UNKNOWN",
          name,
          shares: subjectData.shares || 0,
          pricePerShare: subjectData.pricePerShare || 0,
          totalAmount: subjectData.totalAmount || 0,
          fees: fees || 0,
          currency: subjectData.currency || "EUR",
          reference: reference || undefined,
          emailId: email.id,
          emailType,
        });
      } else {
        result.parseErrors?.push("Could not parse subject line");
      }
    }
  } catch (error) {
    result.parseErrors?.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Parses multiple emails
 */
export function parseMyInvestorEmails(emails: GmailEmail[]): ParsedEmail[] {
  return emails.map(parseMyInvestorEmail);
}

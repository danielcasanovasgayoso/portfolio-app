import * as cheerio from "cheerio";
import { SKIP_PATTERNS } from "@/lib/gmail";
import type { GmailEmail, ParsedEmail, ParsedTransaction, EmailType } from "@/types/import";
import type { TransactionType, TransferType } from "@prisma/client";
import { determineFundName, resolveIsinFromDgsfp } from "@/lib/myinvestor-funds";

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

  let emailType: EmailType;

  if (upperSubject.includes("TRANSFERENCIA SEPA")) {
    emailType = "SEPA_TRANSFER";
  } else if (upperSubject.includes("MODIFICACIÓN DE COMISIONES") || upperSubject.includes("MODIFICACION DE COMISIONES")) {
    emailType = "COMMISSION_CHANGE";
  } else if (upperSubject.includes("ABONO") || upperSubject.includes("CARGO")) {
    emailType = "ACCOUNT_CREDIT_DEBIT";
  } else if (upperSubject.includes("LIQUIDACION CUENTA CORRIENTE") || upperSubject.includes("LIQUIDACIÓN CUENTA CORRIENTE")) {
    emailType = "INTEREST_SETTLEMENT";
  } else if (upperSubject.includes("TRASPASO")) {
    emailType = "FUND_TRANSFER";
  } else if (upperSubject.includes("REEMBOLSO")) {
    emailType = "FUND_REDEMPTION";
  } else if (upperSubject.includes("APORTACION A PLANES DE PENSIONES") || upperSubject.includes("APORTACIÓN A PLANES DE PENSIONES")) {
    emailType = "PENSION_CONTRIBUTION";
  } else if (
    upperSubject.includes("CONFIRMACIÓN DE OPERACIÓN") ||
    upperSubject.includes("CONFIRMACION DE OPERACION") ||
    upperSubject.includes("SUSCRIPCION") ||
    upperSubject.includes("SUSCRIPCIÓN") ||
    upperSubject.includes("COMPRA")
  ) {
    emailType = "FUND_SUBSCRIPTION";
  } else {
    emailType = "UNKNOWN";
  }

  console.log(`[PARSER-CLASSIFY] Subject: "${subject.substring(0, 60)}..." => ${emailType}`);
  return emailType;
}

/**
 * Checks if an email should be skipped
 */
function shouldSkipEmail(subject: string): { skip: boolean; reason?: string } {
  for (const pattern of SKIP_PATTERNS) {
    if (subject.toUpperCase().includes(pattern.toUpperCase())) {
      console.log(`[PARSER-SKIP] Subject "${subject.substring(0, 50)}..." matches skip pattern: "${pattern}"`);
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
  return new Date(year, month - 1, day);
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

  // Look for ISIN in table cells or specific text patterns
  const isinRegex = /[A-Z]{2}[A-Z0-9]{9}[0-9]/g;

  // Search in all text content
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

  // Look for commission patterns
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

  // Look for reference patterns
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
  console.log(`[PARSER-TRANSFER] Processing transfer email: ${email.id}`);
  console.log(`[PARSER-TRANSFER] Subject: ${email.subject}`);
  console.log(`[PARSER-TRANSFER] Date: ${email.date.toISOString()}`);

  const $ = cheerio.load(email.body);
  const transactions: ParsedTransaction[] = [];
  const text = $("body").text() || $("*").text() || email.body;

  // Check if this is a transfer email (contains transfer operation keywords)
  const hasReemb = text.includes("REEMB.POR TRASPASO") || text.includes("REEMBOLSO POR TRASPASO");
  const hasSuscr = text.includes("SUSCR.POR TRASPASO") || text.includes("SUSCRIPCION POR TRASPASO");
  const isTransferEmail = hasReemb || hasSuscr;

  console.log(`[PARSER-TRANSFER] Has REEMB keyword: ${hasReemb}`);
  console.log(`[PARSER-TRANSFER] Has SUSCR keyword: ${hasSuscr}`);
  console.log(`[PARSER-TRANSFER] Is transfer email: ${isTransferEmail}`);

  if (!isTransferEmail) {
    console.log(`[PARSER-TRANSFER] ❌ Not a valid transfer email - missing keywords. First 500 chars of body text:`);
    console.log(text.substring(0, 500));
    return transactions;
  }

  // Extract ISINs - in transfer emails, they appear in order:
  // 1st ISIN = Fondo Reembolsado (source)
  // 2nd ISIN = Fondo Suscrito (destination)
  const isinMatches = text.match(/[A-Z]{2}[A-Z0-9]{9}[0-9]/g) || [];
  const uniqueIsins = [...new Set(isinMatches)];

  console.log(`[PARSER-TRANSFER] ISINs found: ${uniqueIsins.join(", ") || "NONE"}`);

  if (uniqueIsins.length === 0) {
    console.log(`[PARSER-TRANSFER] ❌ No ISINs found in email body`);
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
    console.log(`[PARSER-TRANSFER] Detail section match - Shares: ${shares}, Price: ${pricePerShare}, Amount: ${amount}`);
  } else {
    console.log(`[PARSER-TRANSFER] Detail section not matched, trying fallback extraction...`);

    // Fallback: try to extract individually
    const sharesMatch = text.match(/N[uú]mero de Participaciones[^\d]*([\d.,]+)/i);
    if (sharesMatch) {
      shares = parseSpanishNumber(sharesMatch[1]);
      console.log(`[PARSER-TRANSFER] Fallback - Shares match: "${sharesMatch[1]}" => ${shares}`);
    } else {
      console.log(`[PARSER-TRANSFER] ❌ Shares not found`);
    }

    const navMatch = text.match(/Valor Liquidativo[^\d]*([\d.,]+)\s*EUR/i);
    if (navMatch) {
      pricePerShare = parseSpanishNumber(navMatch[1]);
      console.log(`[PARSER-TRANSFER] Fallback - NAV match: "${navMatch[1]}" => ${pricePerShare}`);
    } else {
      console.log(`[PARSER-TRANSFER] ❌ NAV/Price not found`);
    }

    // Look for Importe Neto (the final amount after fees)
    const amountNetoMatch = text.match(/Importe Neto[^\d]*([\d.,]+)\s*EUR/i);
    if (amountNetoMatch) {
      amount = parseSpanishNumber(amountNetoMatch[1]);
      console.log(`[PARSER-TRANSFER] Fallback - Importe Neto match: "${amountNetoMatch[1]}" => ${amount}`);
    } else {
      const amountBrutoMatch = text.match(/Importe Bruto[^\d]*([\d.,]+)\s*EUR/i);
      if (amountBrutoMatch) {
        amount = parseSpanishNumber(amountBrutoMatch[1]);
        console.log(`[PARSER-TRANSFER] Fallback - Importe Bruto match: "${amountBrutoMatch[1]}" => ${amount}`);
      } else {
        console.log(`[PARSER-TRANSFER] ❌ Amount not found`);
      }
    }
  }

  // Parse date from "Fecha Operación"
  let date = email.date;
  const dateMatch = text.match(/Fecha Operaci[oó]n[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i);
  if (dateMatch) {
    date = parseSpanishDate(dateMatch[1]);
    console.log(`[PARSER-TRANSFER] Fecha Operación: "${dateMatch[1]}" => ${date.toISOString()}`);
  } else {
    console.log(`[PARSER-TRANSFER] No Fecha Operación found, using email date: ${email.date.toISOString()}`);
  }

  const extractFundName = (isin: string): string => determineFundName(isin);

  // MyInvestor sends TWO separate emails per transfer:
  // - REEMB.POR TRASPASO = redemption email (OUT from source fund)
  // - SUSCR.POR TRASPASO = subscription email (IN to destination fund)
  // Both emails contain both ISINs for reference, but each describes only ONE leg.
  // Generate only ONE transaction per email based on the operation type.
  const isRedemption = hasReemb;

  // For REEMB: use first ISIN (Fondo Reembolsado = source)
  // For SUSCR: use second ISIN (Fondo Suscrito = destination)
  const isin = isRedemption ? uniqueIsins[0] : (uniqueIsins[1] || uniqueIsins[0]);
  const transferType: TransferType = isRedemption ? "OUT" : "IN";

  console.log(`[PARSER-TRANSFER] Direction: ${isRedemption ? "REDEMPTION (OUT)" : "SUBSCRIPTION (IN)"}`);
  console.log(`[PARSER-TRANSFER] Selected ISIN: ${isin}`);
  console.log(`[PARSER-TRANSFER] Final values - Shares: ${shares}, Price: ${pricePerShare}, Amount: ${amount}`);

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
  };

  console.log(`[PARSER-TRANSFER] ✅ Created transaction:`, JSON.stringify(transaction, null, 2));
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
    const finalName = isin ? determineFundName(isin) : name;

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

  // Extract amount from HTML
  const text = $("body").text() || $("*").text() || email.body;
  const amountMatch = text.match(/importe[:\s]*([\d.,]+)/i) ||
                      text.match(/liquido[:\s]*([\d.,]+)/i) ||
                      text.match(/([\d.,]+)\s*EUR/i);

  if (amountMatch) {
    const amount = parseSpanishNumber(amountMatch[1]);
    const isin = extractIsinFromHtml(email.body);
    const name = isin ? determineFundName(isin) : "Interest Settlement";

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
  console.log(`\n[PARSER] ========================================`);
  console.log(`[PARSER] Processing email: ${email.id}`);
  console.log(`[PARSER] Date: ${email.date.toISOString()}`);
  console.log(`[PARSER] Subject: ${email.subject}`);

  const emailType = classifyEmail(email.subject);
  const skipCheck = shouldSkipEmail(email.subject);

  console.log(`[PARSER] Classification: ${emailType}`);
  console.log(`[PARSER] Skip check: ${skipCheck.skip ? `YES (${skipCheck.reason})` : "NO"}`);

  // Initialize result
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
    console.log(`[PARSER] ⏭️ SKIPPING email - Reason: ${result.skipReason}`);
    return result;
  }

  try {
    // Parse based on email type
    if (emailType === "FUND_TRANSFER") {
      console.log(`[PARSER] Parsing as FUND_TRANSFER...`);
      result.transactions = parseTransferEmail(email);
    } else if (emailType === "INTEREST_SETTLEMENT") {
      console.log(`[PARSER] Parsing as INTEREST_SETTLEMENT...`);
      result.transactions = parseDividendEmail(email);
    } else if (emailType === "PENSION_CONTRIBUTION") {
      console.log(`[PARSER] Parsing as PENSION_CONTRIBUTION...`);
      result.transactions = parsePensionContributionEmail(email);
    } else {
      console.log(`[PARSER] Parsing as standard SUBSCRIPTION/REDEMPTION...`);
      // Standard fund subscription/redemption
      const subjectData = parseSubject(email.subject);

      if (subjectData) {
        const isin = extractIsinFromHtml(email.body);
        const fees = extractFeesFromHtml(email.body);
        const reference = extractReferenceFromHtml(email.body);
        const name = isin
          ? determineFundName(isin)
          : subjectData.name || "Unknown Asset";

        console.log(`[PARSER] Subject parse result - Name: ${subjectData.name}, Shares: ${subjectData.shares}, Price: ${subjectData.pricePerShare}`);
        console.log(`[PARSER] HTML parse result - ISIN: ${isin}, Fees: ${fees}, Reference: ${reference}`);
        console.log(`[PARSER] Final name (after lookup): ${name}`);

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
        console.log(`[PARSER] ❌ Could not parse subject line`);
        result.parseErrors?.push("Could not parse subject line");
      }
    }
  } catch (error) {
    console.log(`[PARSER] ❌ Parse error: ${error instanceof Error ? error.message : String(error)}`);
    result.parseErrors?.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`[PARSER] Result: ${result.transactions.length} transactions, ${result.parseErrors?.length || 0} errors`);
  if (result.transactions.length > 0) {
    result.transactions.forEach((tx, i) => {
      console.log(`[PARSER] Transaction ${i + 1}: ${tx.type}${tx.transferType ? ` (${tx.transferType})` : ""} | ${tx.isin} | ${tx.shares} shares @ ${tx.pricePerShare}`);
    });
  }
  console.log(`[PARSER] ========================================\n`);

  return result;
}

/**
 * Parses multiple emails
 */
export function parseMyInvestorEmails(emails: GmailEmail[]): ParsedEmail[] {
  return emails.map(parseMyInvestorEmail);
}

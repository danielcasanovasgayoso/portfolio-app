import "dotenv/config";
import * as fs from "fs";
import { parseMyInvestorEmail } from "../src/services/myinvestor-parser.service";

// Read the .eml files
const emlFiles = [
  "./EJECUCION DE UNA ORDEN DE TRASPASO DE IIC VANGUARD GLOB STOCK EUR.eml",
  "./EJECUCION DE UNA ORDEN DE TRASPASO DE IIC VANGUARD GLOB STOCK EUR-1.eml"
];

for (const file of emlFiles) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`File: ${file}`);
  console.log("=".repeat(80));

  const content = fs.readFileSync(file, "utf-8");

  // Extract subject and body from .eml
  const subjectMatch = content.match(/^Subject: (.+)$/m);
  const dateMatch = content.match(/^Date: (.+)$/m);
  const subject = subjectMatch ? subjectMatch[1].trim() : "Unknown";
  const dateStr = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

  // Find HTML body (after the headers)
  const bodyStart = content.indexOf("<html");
  const body = bodyStart > -1 ? content.substring(bodyStart) : content;

  console.log(`Subject: ${subject}`);
  console.log(`Date: ${dateStr}`);

  // Parse with our parser
  const result = parseMyInvestorEmail({
    id: file,
    subject,
    date: new Date(dateStr),
    body
  });

  console.log(`\nEmail Type: ${result.emailType}`);
  console.log(`Should Skip: ${result.shouldSkip}`);
  console.log(`Skip Reason: ${result.skipReason || "N/A"}`);
  console.log(`Parse Errors: ${result.parseErrors?.join(", ") || "None"}`);

  if (result.transactions.length > 0) {
    console.log(`\nTransactions (${result.transactions.length}):`);
    result.transactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.type} ${t.transferType || ""}`);
      console.log(`     ISIN: ${t.isin}`);
      console.log(`     Name: ${t.name}`);
      console.log(`     Shares: ${t.shares}`);
      console.log(`     Price: ${t.pricePerShare}`);
      console.log(`     Amount: ${t.totalAmount}`);
      console.log(`     Date: ${t.date}`);
    });
  } else {
    console.log("\nNo transactions parsed!");
  }
}

console.log("\n\nDone!");

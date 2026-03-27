/**
 * AES-256-GCM symmetric encryption for sensitive values stored in the database.
 *
 * Requires the ENCRYPTION_KEY environment variable to be set to a 64-character
 * hex string (32 bytes). Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * The encrypted format is:  <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * All three components are needed for decryption; altering any one of them
 * causes authentication to fail (integrity protection).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypts a plaintext string.
 * Returns a colon-separated string: `<iv>:<authTag>:<ciphertext>` (all hex).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a value previously produced by `encrypt()`.
 * Throws if the value has been tampered with or the key is wrong.
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;

  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}

/**
 * Encrypts a value only if ENCRYPTION_KEY is configured.
 * Falls back to plaintext when the key is absent (development / migration path).
 * Plaintext values are stored with a "plain:" prefix so they can be
 * distinguished from encrypted ones during a gradual migration.
 */
export function encryptIfConfigured(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return `plain:${value}`;
  return encrypt(value);
}

/**
 * Decrypts a value that may be encrypted or plain-prefixed.
 * Handles both formats produced by `encryptIfConfigured`, plus legacy
 * raw plaintext values stored before encryption was introduced.
 */
export function decryptIfEncrypted(value: string): string {
  if (value.startsWith("plain:")) return value.slice(6);
  // Values encrypted by `encrypt()` always have exactly 3 colon-separated
  // hex components (iv:authTag:ciphertext). Anything else is a legacy raw
  // plaintext value stored before encryption was added.
  if (value.split(":").length !== 3) return value;
  return decrypt(value);
}

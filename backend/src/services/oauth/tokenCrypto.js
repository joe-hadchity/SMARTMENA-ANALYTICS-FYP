/**
 * tokenCrypto -- symmetric encryption for OAuth access/refresh tokens.
 *
 * Algorithm: AES-256-GCM
 *   - Key: SHA-256(TOKEN_ENCRYPTION_KEY)
 *   - IV: random 12 bytes per encryption (never reused)
 *   - Auth tag: 16 bytes, appended to the ciphertext
 *
 * Storage layout (base64-encoded when needed):
 *     [ 1-byte version ][ 12-byte IV ][ 16-byte tag ][ ciphertext ]
 *
 * Only the backend process needs to decrypt. DB dumps, backups and API
 * responses must NEVER include the plaintext token.
 */

const crypto = require("crypto");
const env = require("../../config/env");

const VERSION = 0x01;
const ALGO = "aes-256-gcm";

function getKey() {
  if (!env.TOKEN_ENCRYPTION_KEY) {
    const err = new Error(
      "TOKEN_ENCRYPTION_KEY is not configured. Live OAuth is disabled.",
    );
    err.status = 503;
    throw err;
  }
  return crypto.createHash("sha256").update(env.TOKEN_ENCRYPTION_KEY).digest();
}

/**
 * Encrypt a UTF-8 string. Returns a Buffer suitable for Postgres bytea.
 */
function encryptToken(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptToken: plaintext must be a non-empty string");
  }
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, ct]);
}

/**
 * Decrypt a Buffer previously produced by encryptToken. Accepts:
 *   - Buffer
 *   - { type: "Buffer", data: number[] }  (JSON-serialised buffer)
 *   - base64 / hex string
 *   - Postgres `\x...` bytea string
 */
function decryptToken(input) {
  let buf;
  if (Buffer.isBuffer(input)) {
    buf = input;
  } else if (input && typeof input === "object" && Array.isArray(input.data)) {
    buf = Buffer.from(input.data);
  } else if (typeof input === "string") {
    if (input.startsWith("\\x")) {
      buf = Buffer.from(input.slice(2), "hex");
    } else if (/^[0-9a-fA-F]+$/.test(input) && input.length % 2 === 0) {
      buf = Buffer.from(input, "hex");
    } else {
      buf = Buffer.from(input, "base64");
    }
  } else {
    throw new Error("decryptToken: unsupported input type");
  }
  if (buf.length < 1 + 12 + 16 + 1) {
    throw new Error("decryptToken: ciphertext too short");
  }
  const version = buf[0];
  if (version !== VERSION) {
    throw new Error(`decryptToken: unsupported version byte 0x${version.toString(16)}`);
  }
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(13, 29);
  const ct = buf.subarray(29);
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

module.exports = {
  encryptToken,
  decryptToken,
};

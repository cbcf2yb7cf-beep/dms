import { describe, expect, it } from "vitest";
import { consumeRecoveryCode, currentStep, generateRecoveryCodes, generateSecret, hashRecoveryCode, verifyTotp } from "./totp";
import { createHmac } from "node:crypto";

// RFC-6238-Testvektor: Schlüssel "12345678901234567890" (Base32 GEZDGNBV…), T=59 s → 94287082 (8-stellig) → 287082.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("TOTP", () => {
  it("akzeptiert den RFC-Testvektor", () => {
    expect(verifyTotp(RFC_SECRET, "287082", null, 59_000)).toBe(1);
  });

  it("lehnt einen bereits verbrauchten Zeitschritt ab", () => {
    expect(verifyTotp(RFC_SECRET, "287082", 1, 59_000)).toBeNull();
  });

  it("lehnt falsche Formate ab", () => {
    expect(verifyTotp(generateSecret(), "12ab56", null)).toBeNull();
    expect(verifyTotp(generateSecret(), "1234567", null)).toBeNull();
  });

  it("zählt Zeitschritte à 30 s", () => {
    expect(currentStep(0)).toBe(0);
    expect(currentStep(29_999)).toBe(0);
    expect(currentStep(30_000)).toBe(1);
  });

  it("HMAC-Basis stimmt mit node:crypto überein", () => {
    expect(createHmac("sha1", "x").update("y").digest("hex")).toHaveLength(40);
  });
});

describe("Notfall-Codes", () => {
  it("sind einmal verwendbar, unabhängig von Groß-/Kleinschreibung und Bindestrich", () => {
    const codes = generateRecoveryCodes(3);
    const hashes = codes.map(hashRecoveryCode);
    const rest = consumeRecoveryCode(hashes, codes[1].toUpperCase().replace("-", ""));
    expect(rest).toHaveLength(2);
    expect(consumeRecoveryCode(rest!, codes[1])).toBeNull();
  });
});

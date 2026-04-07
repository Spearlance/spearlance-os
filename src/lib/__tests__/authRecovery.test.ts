import { describe, expect, it, vi } from "vitest";
import { getRecoveryError, hasRecoveryTokensInHash, hasUsableRecoverySession } from "@/lib/authRecovery";

describe("authRecovery helpers", () => {
  it("detects recovery tokens in the URL hash", () => {
    window.location.hash = "#access_token=abc&refresh_token=def&type=recovery";
    expect(hasRecoveryTokensInHash()).toBe(true);
  });

  it("returns recovery errors from the URL hash", () => {
    window.location.hash = "#error=access_denied&error_description=Link%20expired";
    expect(getRecoveryError()).toEqual({
      error: "access_denied",
      description: "Link expired",
    });
  });

  it("detects usable sessions", () => {
    expect(hasUsableRecoverySession(null)).toBe(false);
    expect(hasUsableRecoverySession({ user: { id: "1" }, access_token: "token" } as never)).toBe(true);
  });

  it("returns false when no tokens exist in the hash", () => {
    window.location.hash = "";
    expect(hasRecoveryTokensInHash()).toBe(false);
    expect(getRecoveryError()).toBeNull();
  });
});

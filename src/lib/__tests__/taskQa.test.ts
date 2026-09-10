import { describe, expect, it } from "vitest";
import {
  DEFAULT_QA_TARGET_STATE,
  findCredentialLeak,
  isValidCredentialRef,
  qaSubmissionBlocker,
  visibleQaRuns,
} from "../taskQa";

describe("findCredentialLeak", () => {
  it("returns null for ordinary acceptance criteria", () => {
    expect(findCredentialLeak("- Hero H2 reads \"Roof repair in Concord NH\"\n- Header phone matches client record")).toBeNull();
    expect(findCredentialLeak("Password reset link on the login page goes to /forgot")).toBeNull();
    expect(findCredentialLeak("Contact form sends to office@acme.com and shows a thank-you")).toBeNull();
    expect(findCredentialLeak("")).toBeNull();
    expect(findCredentialLeak(null)).toBeNull();
  });

  it("flags passwords written inline", () => {
    expect(findCredentialLeak("login with garrett@x.com password: Hunter2!")).toBe("a password");
    expect(findCredentialLeak("PW=abc123xyz")).toBe("a password");
    expect(findCredentialLeak("the password is Winter2026")).toBe("a password");
  });

  it("flags email + password pairs", () => {
    expect(findCredentialLeak("editor login: editor@acme.com / Sunshine99")).toBe("an email + password pair");
    expect(findCredentialLeak("someone@acme.com : Sunshine99")).toBe("an email + password pair");
    expect(findCredentialLeak("creds: acme_editor / Sunshine99")).toBe("login credentials");
  });

  it("flags API keys and tokens", () => {
    expect(findCredentialLeak("use api_key: 0123456789abcdefXYZ")).toBe("an API key or token");
    // Built by concatenation so the literal never trips the repo's pre-commit secret scan.
    expect(findCredentialLeak("stripe " + ["sk", "live", "abcdefghijklmnop"].join("_"))).toBe("a Stripe key");
    expect(findCredentialLeak("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop")).not.toBeNull();
    expect(findCredentialLeak("AKIAIOSFODNN7EXAMPLE")).toBe("an AWS access key");
  });
});

describe("qaSubmissionBlocker", () => {
  const good = { acceptance_criteria: "- Title is correct", qa_target_url: "https://acme.com/" };

  it("allows a complete, clean submission", () => {
    expect(qaSubmissionBlocker(good)).toBeNull();
  });

  it("requires criteria and a URL", () => {
    expect(qaSubmissionBlocker({ ...good, acceptance_criteria: "  " })).toMatch(/acceptance criteria/i);
    expect(qaSubmissionBlocker({ ...good, qa_target_url: "" })).toMatch(/target URL/i);
    expect(qaSubmissionBlocker({ ...good, qa_target_url: "acme.com" })).toMatch(/http/i);
  });

  it("blocks a credential in the criteria", () => {
    expect(qaSubmissionBlocker({ ...good, acceptance_criteria: "password: hunter22" })).toMatch(/a password/);
  });
});

describe("isValidCredentialRef", () => {
  it("accepts empty and qa_cred_* names only", () => {
    expect(isValidCredentialRef("")).toBe(true);
    expect(isValidCredentialRef(null)).toBe(true);
    expect(isValidCredentialRef("qa_cred_acme_editor")).toBe(true);
    expect(isValidCredentialRef("service_role_key")).toBe(false);
    expect(isValidCredentialRef("qa_cred_Acme")).toBe(false);
    expect(isValidCredentialRef("qa_cred_")).toBe(false);
  });
});

describe("visibleQaRuns", () => {
  const runs = [
    { id: "new", superseded_by: null },
    { id: "old", superseded_by: "new" },
    { id: "legacy" },
  ];
  it("hides superseded runs by default", () => {
    expect(visibleQaRuns(runs).map((r) => r.id)).toEqual(["new", "legacy"]);
  });
  it("shows everything when asked", () => {
    expect(visibleQaRuns(runs, true)).toHaveLength(3);
  });
});

describe("defaults", () => {
  it("defaults QA target to the published site", () => {
    expect(DEFAULT_QA_TARGET_STATE).toBe("published");
  });
});

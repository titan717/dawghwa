import { afterEach, describe, expect, it } from "vitest";
import { flag, overridesAllowed, parseOverrides, resetFlagsForTests } from "./flags";

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  resetFlagsForTests();
});

describe("parseOverrides", () => {
  it("turns names on and minus-prefixed names off", () => {
    expect(parseOverrides("offline,-comments")).toEqual({ FEATURE_OFFLINE: true, FEATURE_COMMENTS: false });
  });
  it("accepts full names, mixed case and spaces", () => {
    expect(parseOverrides(" FEATURE_SHARE_CARDS , Accounts, android_release")).toEqual({ FEATURE_SHARE_CARDS: true, FEATURE_ACCOUNTS: true, FEATURE_ANDROID_RELEASE: true });
  });
  it("ignores unknown names and empty input", () => {
    expect(parseOverrides("nope,,-x")).toEqual({});
    expect(parseOverrides(null)).toEqual({});
  });
});

describe("flag", () => {
  it("is off by default (no VITE_FEATURE_* in the test env)", () => {
    expect(flag("FEATURE_OFFLINE")).toBe(false);
  });
  it("tests run outside production, so overrides are allowed", () => {
    expect(overridesAllowed()).toBe(true);
  });
  it("reads ?ff= and keeps it for the tab", () => {
    window.history.replaceState(null, "", "/?ff=offline");
    expect(flag("FEATURE_OFFLINE")).toBe(true);
    expect(flag("FEATURE_COMMENTS")).toBe(false);
    window.history.replaceState(null, "", "/library");
    resetFlagsForTests();
    expect(flag("FEATURE_OFFLINE")).toBe(true);
  });
  it("?ff=-name forces a flag off", () => {
    window.history.replaceState(null, "", "/?ff=-offline");
    expect(flag("FEATURE_OFFLINE")).toBe(false);
  });
});

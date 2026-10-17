import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "./oauth-return-path";

describe("OAuth same-origin return paths", () => {
  it("preserves consent authorization and fragments across sign-in", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=request-123#review"))
      .toBe("/.lovable/oauth/consent?authorization_id=request-123#review");
  });
  it("rejects external, network, backslash and control-character redirects", () => {
    for (const path of ["https://outside.invalid", "//outside.invalid", "/\\outside.invalid", "/\n/outside.invalid", undefined, null]) {
      expect(oauthReturnPath(path)).toBe("/");
    }
  });
  it("returns a canonical local path", () => {
    expect(oauthReturnPath("/cliente/../.lovable/oauth/consent?authorization_id=a"))
      .toBe("/.lovable/oauth/consent?authorization_id=a");
  });
});
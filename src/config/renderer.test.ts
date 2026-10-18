import { describe, expect, it } from "vitest";
import { rendererFromSearch } from "./renderer";

describe("rendererFromSearch", () => {
  it("maps the query param", () => {
    expect(rendererFromSearch("?renderer=canvas")).toBe("canvas");
    expect(rendererFromSearch("?renderer=webgl")).toBe("webgl");
    expect(rendererFromSearch("")).toBe("auto");
    expect(rendererFromSearch("?renderer=bogus")).toBe("auto");
  });
});

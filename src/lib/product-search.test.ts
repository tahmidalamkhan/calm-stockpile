import { describe, expect, test } from "bun:test";
import { matchesProductSearch, matchesSearchText } from "./product-search";

const product = { name: "MOTOR CAR NO 3 16 X 20 WHEEL ms", sku: "MC003" };

describe("product keyword search", () => {
  test("finds a word beyond the first word", () => {
    expect(matchesProductSearch(product, "wheel")).toBe(true);
    expect(matchesProductSearch(product, "gear")).toBe(false);
  });
  test("matches all keywords in any order and ignores case", () => {
    expect(matchesProductSearch(product, "WHEEL 16 motor")).toBe(true);
    expect(matchesProductSearch(product, "wheel ss")).toBe(false);
  });
  test("matches substrings within the SKU and combines name and SKU terms", () => {
    expect(matchesProductSearch(product, "003 wheel")).toBe(true);
    expect(matchesProductSearch(product, "MC004 wheel")).toBe(false);
  });
  test("ignores extra whitespace and preserves empty searches", () => {
    expect(matchesProductSearch(product, "  16\t wheel  ")).toBe(true);
    expect(matchesProductSearch(product, " \t ")).toBe(true);
  });
  test("uses the same matching for dropdown text", () => {
    expect(matchesSearchText(`${product.name} ${product.sku}`, "ms 003")).toBe(true);
    expect(matchesSearchText(`${product.name} ${product.sku}`, "ms 004")).toBe(false);
  });
});
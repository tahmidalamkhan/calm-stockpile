import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { matchesProductSearch, matchesSearchText } from "./product-search";

const product = { name: "MOTOR CAR NO 3 16 X 20 WHEEL ms", sku: "MC003" };

describe("product keyword search", () => {
  test("finds a word beyond the first word", () => {
    assert.equal(matchesProductSearch(product, "wheel"), true);
    assert.equal(matchesProductSearch(product, "gear"), false);
  });
  test("matches all keywords in any order and ignores case", () => {
    assert.equal(matchesProductSearch(product, "WHEEL 16 motor"), true);
    assert.equal(matchesProductSearch(product, "wheel ss"), false);
  });
  test("matches substrings within the SKU and combines name and SKU terms", () => {
    assert.equal(matchesProductSearch(product, "003 wheel"), true);
    assert.equal(matchesProductSearch(product, "MC004 wheel"), false);
  });
  test("ignores extra whitespace and preserves empty searches", () => {
    assert.equal(matchesProductSearch(product, "  16\t wheel  "), true);
    assert.equal(matchesProductSearch(product, " \t "), true);
  });
  test("uses the same matching for dropdown text", () => {
    assert.equal(matchesSearchText(`${product.name} ${product.sku}`, "ms 003"), true);
    assert.equal(matchesSearchText(`${product.name} ${product.sku}`, "ms 004"), false);
  });
});
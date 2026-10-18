import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { buildProductReport } from "./product-report";
import type { Product, StockMovement } from "./types";

const product: Product = { id: "p1", companyId: "c1", sku: "MC003", name: "MOTOR CAR WHEEL", category: "Parts", unit: "pcs", avgCost: 12, price: 20, reorderLevel: 2 };
const movements: StockMovement[] = [{ id: "m1", companyId: "c1", date: "2026-10-18", productId: "p1", warehouseId: "w1", type: "purchase", quantity: 5, unitCost: 12, reference: "purchase" }];

describe("Products PDF data", () => {
  it("includes unit cost and inventory value for admins", () => {
    const report = buildProductReport([product], movements, [], "admin");
    assert.equal(report.rows[0][5], "12.00");
    assert.equal(report.rows[0][6], "60.00");
    assert.equal(report.rows[0].length, 9);
  });
  it("excludes cost and inventory value for staff", () => {
    const report = buildProductReport([product], movements, [], "staff");
    assert.deepEqual(report.rows[0], ["MC003", "MOTOR CAR WHEEL", "Parts", "pcs", "—", 5, 2]);
  });
  it("does not expose prices before a role is known", () => {
    assert.equal(buildProductReport([product], movements, [], null).rows[0].length, 7);
  });
  it("exports only the supplied search results", () => {
    assert.equal(buildProductReport([], movements, [], "admin").rows.length, 0);
    assert.equal(buildProductReport([product], movements, [], "admin").rows.length, 1);
  });
});
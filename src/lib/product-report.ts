import type { Product, StockMovement, Warehouse } from "./types";
import { weightedAverageCost } from "./inventory-cost";
import { formatCurrency } from "./format";

export function buildProductReport(
  products: Product[],
  movements: StockMovement[],
  warehouses: Warehouse[],
  role: "admin" | "staff" | null,
) {
  const includePrices = role === "admin";
  const columns = ["SKU", "Product Name", "Category", "Unit", "Warehouses"];
  if (includePrices) columns.push("Unit Price", "Total Value");
  columns.push("On Hand", "Reorder");
  const rows = products.map((product) => {
    const history = movements.filter((movement) => movement.productId === product.id);
    const quantity = history.reduce((sum, movement) => sum + movement.quantity, 0);
    const locations = warehouses.flatMap((warehouse) => {
      const stock = history.filter((movement) => movement.warehouseId === warehouse.id)
        .reduce((sum, movement) => sum + movement.quantity, 0);
      return stock > 0 ? [`${warehouse.name}: ${stock}`] : [];
    });
    const row: (string | number)[] = [product.sku, product.name, product.category, product.unit, locations.join("\n") || "—"];
    if (includePrices) {
      const cost = weightedAverageCost(history, product.avgCost, product.price);
      row.push(formatCurrency(cost), formatCurrency(cost * quantity));
    }
    row.push(quantity, product.reorderLevel);
    return row;
  });
  return { columns, rows };
}
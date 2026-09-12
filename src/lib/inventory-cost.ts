import type { StockMovement } from "@/lib/types";

type CostMovement = Pick<StockMovement, "type" | "quantity" | "unitCost">;

export function isInventoryReceipt(movement: CostMovement) {
  return (
    movement.type !== "transfer" &&
    movement.type !== "sale" &&
    movement.quantity > 0 &&
    movement.unitCost > 0
  );
}

export function receiptCostSummary(movements: CostMovement[]) {
  return movements.reduce(
    (summary, movement) => {
      if (!isInventoryReceipt(movement)) return summary;
      summary.quantity += movement.quantity;
      summary.value += movement.quantity * movement.unitCost;
      return summary;
    },
    { quantity: 0, value: 0 },
  );
}

export function weightedAverageCost(movements: CostMovement[], fallback = 0) {
  const summary = receiptCostSummary(movements);
  return summary.quantity > 0 ? summary.value / summary.quantity : fallback;
}
import type { StockMovement } from "@/lib/types";

type CostMovement = Pick<StockMovement, "type" | "quantity" | "unitCost">;

/**
 * A receipt is any movement that brings inventory in with a real cost:
 * purchases, bulk purchases, opening stock and positive adjustments.
 * Sales / stock-outs and both legs of a transfer never affect the average.
 */
export function isInventoryReceipt(movement: CostMovement) {
  return (
    movement.type !== "transfer" &&
    movement.type !== "sale" &&
    movement.quantity > 0
  );
}

/**
 * Historical price recorded on the movement. Older rows were saved without a
 * price, so the product's own price acts as the documented cost for them.
 */
export function effectiveUnitCost(movement: CostMovement, fallbackUnitCost = 0) {
  const cost = Number(movement.unitCost) || 0;
  if (cost > 0) return cost;
  const fallback = Number(fallbackUnitCost) || 0;
  return fallback > 0 ? fallback : 0;
}

/** Total quantity received and its total value — the two WAC inputs. */
export function receiptCostSummary(movements: CostMovement[], fallbackUnitCost = 0) {
  return movements.reduce(
    (summary, movement) => {
      if (!isInventoryReceipt(movement)) return summary;
      const cost = effectiveUnitCost(movement, fallbackUnitCost);
      if (cost <= 0) return summary;
      summary.quantity += movement.quantity;
      summary.value += movement.quantity * cost;
      return summary;
    },
    { quantity: 0, value: 0 },
  );
}

/**
 * Weighted average cost = total value received / total quantity received.
 * Never divided by quantity on hand, so selling units leaves it unchanged.
 */
export function weightedAverageCost(
  movements: CostMovement[],
  fallback = 0,
  fallbackUnitCost = 0,
) {
  const summary = receiptCostSummary(movements, fallbackUnitCost);
  return summary.quantity > 0 ? summary.value / summary.quantity : fallback;
}

# Include legacy bulk purchases in weighted-average cost

## Goal
Count the existing `+70 @ 90` Excel bulk-import adjustment as purchased inventory without creating or changing any stock transaction, while excluding ordinary stock-count adjustments.

## Plan
1. Centralize receipt classification so purchases count automatically, and legacy positive adjustments count only when their source/reference identifies a bulk Excel import or opening stock.
2. Keep the movement’s original displayed transaction type and quantity unchanged; use the classification only for buying-value and weighted-average calculations.
3. Apply the same calculation to Products, Stock History, saved product average cost, and warehouse stock valuation.
4. Verify the target figures: 360 purchased units, 39,500 buying value, 109.72 average cost, 350 on hand, and matching warehouse valuation.

## Technical details
- Make legacy bulk-source matching case-insensitive and whitespace-tolerant.
- Do not count normal positive stock-count adjustments as purchases.
- Sales and transfers remain excluded from historical weighted-average inputs.
- Persist the recalculated `avg_cost` only; do not insert, duplicate, or alter stock movements.

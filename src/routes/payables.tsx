import { createFileRoute } from "@tanstack/react-router";
import { FinanceLedger } from "@/components/app/FinanceLedger";

export const Route = createFileRoute("/payables")({
  head: () => ({
    meta: [
      { title: "Accounts Payable — StockHub" },
      { name: "description", content: "Track what you owe vendors, PO-wise payments, discounts, VAT and loans taken." },
      { property: "og:title", content: "Accounts Payable — StockHub" },
      { property: "og:description", content: "Track what you owe vendors, PO-wise payments, discounts, VAT and loans taken." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <FinanceLedger kind="payable" />,
});

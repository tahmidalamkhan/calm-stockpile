import { createFileRoute } from "@tanstack/react-router";
import { FinanceLedger } from "@/components/app/FinanceLedger";

export const Route = createFileRoute("/receivables")({
  head: () => ({
    meta: [
      { title: "Accounts Receivable — StockHub" },
      { name: "description", content: "Track what customers owe, PO-wise payments, discounts, VAT and loans given." },
      { property: "og:title", content: "Accounts Receivable — StockHub" },
      { property: "og:description", content: "Track what customers owe, PO-wise payments, discounts, VAT and loans given." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <FinanceLedger kind="receivable" />,
});

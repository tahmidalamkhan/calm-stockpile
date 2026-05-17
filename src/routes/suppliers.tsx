import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/mock/store";
import { formatCurrency } from "@/lib/format";
import { NewSupplierDialog } from "@/components/app/NewSupplierDialog";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — StockHub" },
      { name: "description", content: "Vendors you buy inventory from." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { activeCompanyId, suppliers } = useCompany();
  const list = suppliers.filter((s) => s.companyId === activeCompanyId);
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Vendors you buy from"
        actions={<NewSupplierDialog />}
      />
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{s.address}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(s.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

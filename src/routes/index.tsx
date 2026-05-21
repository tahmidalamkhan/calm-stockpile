import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Package, Boxes, Warehouse as WarehouseIcon, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/mock/store";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { role } = useAuth();
  const { activeCompanyId, activeCompany, products, warehouses, stockMovements } = useCompany();
  if (role && role !== "admin") return <Navigate to="/products" />;

  const ps = products.filter((p) => p.companyId === activeCompanyId);
  const ws = warehouses.filter((w) => w.companyId === activeCompanyId);
  const ms = stockMovements.filter((m) => m.companyId === activeCompanyId);

  const onHand = (productId: string) =>
    ms.filter((m) => m.productId === productId).reduce((s, m) => s + m.quantity, 0);

  const stockValue = ps.reduce((sum, p) => sum + onHand(p.id) * p.avgCost, 0);
  const totalUnits = ps.reduce((sum, p) => sum + onHand(p.id), 0);

  const lowStock = ps
    .map((p) => ({ ...p, qty: onHand(p.id) }))
    .filter((p) => p.qty <= p.reorderLevel);

  const recentMovements = ms
    .filter((m) => !(m.type === "transfer" && m.quantity < 0))
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const productName = (id: string) => ps.find((p) => p.id === id)?.name ?? "—";
  const warehouseName = (id: string) => ws.find((w) => w.id === id)?.name ?? "—";

  const warehouseLabel = (m: (typeof ms)[number]) => {
    if (m.type !== "transfer") return warehouseName(m.warehouseId);
    const pair = ms.find(
      (x) =>
        x.id !== m.id &&
        x.reference === m.reference &&
        x.productId === m.productId &&
        x.type === "transfer" &&
        Math.sign(x.quantity) !== Math.sign(m.quantity),
    );
    const fromId = m.quantity < 0 ? m.warehouseId : pair?.warehouseId;
    const toId = m.quantity > 0 ? m.warehouseId : pair?.warehouseId;
    return `${warehouseName(fromId ?? "")} → ${warehouseName(toId ?? "")}`;
  };

  const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    purchase: "default",
    sale: "destructive",
    transfer: "secondary",
    adjustment: "outline",
  };

  return (
    <>
      <PageHeader
        title="Inventory Dashboard"
        description={`Overview for ${activeCompany.name}`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/products" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
          <StatCard title="Products" value={formatNumber(ps.length)} icon={Package} hint="Active SKUs" />
        </Link>
        <Link to="/stock" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
          <StatCard title="Stock value" value={formatCurrency(stockValue)} icon={Boxes} hint={`${formatNumber(totalUnits)} units on hand`} />
        </Link>
        <Link to="/warehouses" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
          <StatCard title="Warehouses" value={formatNumber(ws.length)} icon={WarehouseIcon} hint="Storage locations" />
        </Link>
        <Link to="/products" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
          <StatCard
            title="Low stock"
            value={formatNumber(lowStock.length)}
            icon={AlertTriangle}
            trend={lowStock.length > 0 ? "down" : "up"}
            hint={lowStock.length > 0 ? "Need reordering" : "All levels healthy"}
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent stock movements</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/stock">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No movements yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{formatDate(m.date)}</TableCell>
                      <TableCell>
                        <Badge variant={typeVariant[m.type] ?? "outline"} className="capitalize">
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{productName(m.productId)}</TableCell>
                      <TableCell>{warehouseLabel(m)}</TableCell>
                      <TableCell
                        className={`text-right font-mono ${m.quantity > 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Low stock
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/products">All <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All stock levels healthy.</p>
            ) : (
              <ul className="space-y-3">
                {lowStock.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{p.name}</span>
                    </div>
                    <Badge variant="destructive">{p.qty} {p.unit}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

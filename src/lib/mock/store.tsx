import * as React from "react";
import {
  companies as seedCompanies,
  suppliers as seedSuppliers,
  products as seedProducts,
  warehouses as seedWarehouses,
  stockMovements as seedStockMovements,
} from "./data";
import type {
  Company,
  Supplier,
  Product,
  Warehouse,
  StockMovement,
  ID,
} from "../types";

type CompanyContextValue = {
  companies: Company[];
  activeCompanyId: string;
  setActiveCompanyId: (id: string) => void;
  activeCompany: Company;

  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
  stockMovements: StockMovement[];

  addSupplier: (s: Supplier) => void;
  addProduct: (p: Product, initialStock?: { warehouseId: ID; quantity: number; unitCost: number }[]) => void;
  addWarehouse: (w: Warehouse) => void;
  addStockMovement: (m: StockMovement) => void;
  addStockMovements: (m: StockMovement[]) => void;
  transferStock: (args: { fromWarehouseId: ID; toWarehouseId: ID; date: string; items: { productId: ID; quantity: number }[]; reference: string }) => void;
};

const CompanyContext = React.createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [activeCompanyId, setActiveCompanyId] = React.useState<string>(seedCompanies[0].id);
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>(seedStockMovements);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(seedSuppliers);
  const [products, setProducts] = React.useState<Product[]>(seedProducts);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>(seedWarehouses);

  const activeCompany = React.useMemo(
    () => seedCompanies.find((c) => c.id === activeCompanyId) ?? seedCompanies[0],
    [activeCompanyId],
  );

  const addSupplier = React.useCallback((s: Supplier) => setSuppliers((p) => [s, ...p]), []);
  const addProduct = React.useCallback(
    (p: Product, initialStock?: { warehouseId: ID; quantity: number; unitCost: number }[]) => {
      setProducts((prev) => [p, ...prev]);
      if (initialStock && initialStock.length) {
        const movements = initialStock
          .filter((s) => s.quantity > 0)
          .map<StockMovement>((s, idx) => ({
            id: `sm-init-${p.id}-${idx}`,
            companyId: p.companyId,
            date: new Date().toISOString().slice(0, 10),
            productId: p.id,
            warehouseId: s.warehouseId,
            type: "adjustment",
            quantity: s.quantity,
            unitCost: s.unitCost,
            reference: "OPENING",
          }));
        if (movements.length) setStockMovements((prev) => [...movements, ...prev]);
      }
    },
    [],
  );
  const addWarehouse = React.useCallback((w: Warehouse) => setWarehouses((p) => [w, ...p]), []);
  const addStockMovement = React.useCallback(
    (m: StockMovement) => setStockMovements((prev) => [m, ...prev]),
    [],
  );
  const addStockMovements = React.useCallback(
    (ms: StockMovement[]) => setStockMovements((prev) => [...ms, ...prev]),
    [],
  );
  const transferStock = React.useCallback(
    (args: {
      fromWarehouseId: ID;
      toWarehouseId: ID;
      date: string;
      items: { productId: ID; quantity: number }[];
      reference: string;
    }) => {
      const ts = Date.now();
      const movements: StockMovement[] = [];
      args.items.forEach((it, idx) => {
        if (it.quantity <= 0) return;
        movements.push({
          id: `sm-trf-out-${ts}-${idx}`,
          companyId: activeCompanyId,
          date: args.date,
          productId: it.productId,
          warehouseId: args.fromWarehouseId,
          type: "transfer",
          quantity: -it.quantity,
          unitCost: 0,
          reference: args.reference,
        });
        movements.push({
          id: `sm-trf-in-${ts}-${idx}`,
          companyId: activeCompanyId,
          date: args.date,
          productId: it.productId,
          warehouseId: args.toWarehouseId,
          type: "transfer",
          quantity: it.quantity,
          unitCost: 0,
          reference: args.reference,
        });
      });
      if (movements.length) setStockMovements((prev) => [...movements, ...prev]);
    },
    [activeCompanyId],
  );

  const value = React.useMemo<CompanyContextValue>(
    () => ({
      companies: seedCompanies,
      activeCompanyId,
      setActiveCompanyId,
      activeCompany,
      suppliers,
      products,
      warehouses,
      stockMovements,
      addSupplier,
      addProduct,
      addWarehouse,
      addStockMovement,
      addStockMovements,
      transferStock,
    }),
    [
      activeCompanyId,
      activeCompany,
      suppliers,
      products,
      warehouses,
      stockMovements,
      addSupplier,
      addProduct,
      addWarehouse,
      addStockMovement,
      addStockMovements,
      transferStock,
    ],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = React.useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}

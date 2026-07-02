// Supabase-backed company/inventory store.
// Keeps the original CompanyProvider/useCompany API so existing components
// keep working without changes.
import * as React from "react";
import { supabase } from "@/integrations/supabase/custom-client";
import { toast } from "sonner";
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

  addSupplier: (s: Supplier) => Promise<void>;
  addProduct: (
    p: Product,
    initialStock?: { warehouseId: ID; quantity: number; unitCost: number }[],
  ) => Promise<Product | null>;
  addWarehouse: (w: Warehouse) => Promise<void>;
  deleteWarehouse: (id: ID) => Promise<void>;
  addStockMovement: (m: StockMovement) => Promise<void>;
  addStockMovements: (m: StockMovement[]) => Promise<void>;
  transferStock: (args: {
    fromWarehouseId: ID;
    toWarehouseId: ID;
    date: string;
    items: { productId: ID; quantity: number }[];
    reference: string;
  }) => Promise<void>;
  deleteProduct: (id: ID) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
};

const CompanyContext = React.createContext<CompanyContextValue | null>(null);

const EMPTY_COMPANY: Company = {
  id: "",
  name: "",
  legalName: "",
  currency: "USD",
};

function mapCompany(r: Record<string, unknown>): Company {
  return {
    id: r.id as string,
    name: r.name as string,
    legalName: r.legal_name as string,
    currency: r.currency as string,
    taxId: (r.tax_id as string) ?? undefined,
  };
}
function mapWarehouse(r: Record<string, unknown>): Warehouse {
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    name: r.name as string,
    code: r.code as string,
    address: (r.address as string) ?? "",
    isDefault: !!r.is_default,
  };
}
function mapProduct(r: Record<string, unknown>): Product {
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    sku: r.sku as string,
    name: r.name as string,
    category: (r.category as string) ?? "",
    unit: r.unit as string,
    avgCost: Number(r.avg_cost ?? 0),
    price: Number(r.price ?? 0),
    reorderLevel: Number(r.reorder_level ?? 0),
  };
}
function mapSupplier(r: Record<string, unknown>): Supplier {
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    name: r.name as string,
    email: (r.email as string) ?? "",
    phone: (r.phone as string) ?? "",
    address: (r.address as string) ?? "",
    balance: Number(r.balance ?? 0),
  };
}
function mapMovement(r: Record<string, unknown>): StockMovement {
  const d = r.date as string;
  return {
    id: r.id as string,
    companyId: r.company_id as string,
    date: typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10),
    productId: r.product_id as string,
    warehouseId: r.warehouse_id as string,
    type: r.type as StockMovement["type"],
    quantity: Number(r.quantity),
    unitCost: Number(r.unit_cost ?? 0),
    reference: (r.reference as string) ?? "",
    fromQty: r.from_qty == null ? undefined : Number(r.from_qty),
    toQty: r.to_qty == null ? undefined : Number(r.to_qty),
  };
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = React.useState<string>("");
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>([]);
  const [ready, setReady] = React.useState(false);

  // Bootstrap: load companies; auto-create default if none exist.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        toast.error(`Failed to load companies: ${error.message}`);
        setReady(true);
        return;
      }
      let list = (data ?? []).map(mapCompany);
      if (list.length === 0) {
        const { data: created, error: cErr } = await supabase
          .from("companies")
          .insert({ name: "My Company", legal_name: "My Company", currency: "USD" })
          .select()
          .single();
        if (cErr || !created) {
          toast.error(`Failed to create initial company: ${cErr?.message ?? ""}`);
          setReady(true);
          return;
        }
        list = [mapCompany(created)];
      }
      if (cancelled) return;
      setCompanies(list);
      setActiveCompanyId((cur) => cur || list[0].id);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadWarehouses = React.useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (error) return toast.error(`Warehouses: ${error.message}`);
    setWarehouses((data ?? []).map(mapWarehouse));
  }, []);

  const reloadProducts = React.useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) return toast.error(`Products: ${error.message}`);
    setProducts((data ?? []).map(mapProduct));
  }, []);

  const reloadSuppliers = React.useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) return toast.error(`Suppliers: ${error.message}`);
    setSuppliers((data ?? []).map(mapSupplier));
  }, []);

  const reloadMovements = React.useCallback(async (companyId: string) => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("company_id", companyId)
      .order("date", { ascending: false })
      .limit(1000);
    if (error) return toast.error(`Stock movements: ${error.message}`);
    setStockMovements((data ?? []).map(mapMovement));
  }, []);

  // Load all data scoped to active company.
  React.useEffect(() => {
    if (!activeCompanyId) return;
    void reloadWarehouses(activeCompanyId);
    void reloadProducts(activeCompanyId);
    void reloadSuppliers(activeCompanyId);
    void reloadMovements(activeCompanyId);
  }, [activeCompanyId, reloadWarehouses, reloadProducts, reloadSuppliers, reloadMovements]);

  const activeCompany = React.useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? EMPTY_COMPANY,
    [companies, activeCompanyId],
  );

  const addWarehouse: CompanyContextValue["addWarehouse"] = React.useCallback(
    async (w) => {
      const { data, error } = await supabase
        .from("warehouses")
        .insert({
          company_id: activeCompanyId,
          name: w.name,
          code: w.code,
          address: w.address || null,
          is_default: !!w.isDefault,
        })
        .select()
        .single();
      if (error || !data) { toast.error(`Warehouse: ${error?.message ?? "insert failed"}`); return; }
      setWarehouses((prev) => [mapWarehouse(data), ...prev]);
    },
    [activeCompanyId],
  );

  const deleteWarehouse: CompanyContextValue["deleteWarehouse"] = React.useCallback(
    async (id) => {
      const { error: mErr } = await supabase.from("stock_movements").delete().eq("warehouse_id", id);
      if (mErr) { toast.error(`Delete movements: ${mErr.message}`); return; }
      const { error: lErr } = await supabase.from("stock_levels").delete().eq("warehouse_id", id);
      if (lErr) { toast.error(`Delete stock levels: ${lErr.message}`); return; }
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) { toast.error(`Delete warehouse: ${error.message}`); return; }
      setWarehouses((prev) => prev.filter((w) => w.id !== id));
      setStockMovements((prev) => prev.filter((m) => m.warehouseId !== id));
      toast.success("Warehouse deleted");
    },
    [],
  );


  const addSupplier: CompanyContextValue["addSupplier"] = React.useCallback(
    async (s) => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          company_id: activeCompanyId,
          name: s.name,
          email: s.email || null,
          phone: s.phone || null,
          address: s.address || null,
          balance: s.balance ?? 0,
        })
        .select()
        .single();
      if (error || !data) { toast.error(`Supplier: ${error?.message ?? "insert failed"}`); return; }
      setSuppliers((prev) => [mapSupplier(data), ...prev]);
    },
    [activeCompanyId],
  );

  const insertMovementsRaw = React.useCallback(
    async (rows: StockMovement[]) => {
      if (!rows.length) return [];
      const payload = rows.map((m) => ({
        company_id: activeCompanyId,
        date: m.date,
        product_id: m.productId,
        warehouse_id: m.warehouseId,
        type: m.type,
        quantity: m.quantity,
        unit_cost: m.unitCost ?? 0,
        reference: m.reference || null,
        from_qty: m.fromQty ?? null,
        to_qty: m.toQty ?? null,
      }));
      const { data, error } = await supabase
        .from("stock_movements")
        .insert(payload)
        .select();
      if (error) { toast.error(`Stock movement: ${error.message}`); return []; }
      const mapped = (data ?? []).map(mapMovement);
      setStockMovements((prev) => [...mapped, ...prev]);
      return mapped;
    },
    [activeCompanyId],
  );

  const addStockMovement: CompanyContextValue["addStockMovement"] = React.useCallback(
    async (m) => {
      await insertMovementsRaw([m]);
    },
    [insertMovementsRaw],
  );

  const addStockMovements: CompanyContextValue["addStockMovements"] = React.useCallback(
    async (ms) => {
      await insertMovementsRaw(ms);
    },
    [insertMovementsRaw],
  );

  const addProduct: CompanyContextValue["addProduct"] = React.useCallback(
    async (p, initialStock) => {
      const { data, error } = await supabase
        .from("products")
        .insert({
          company_id: activeCompanyId,
          sku: p.sku,
          name: p.name,
          category: p.category || null,
          unit: p.unit || "pcs",
          avg_cost: p.avgCost ?? 0,
          price: p.price ?? 0,
          reorder_level: p.reorderLevel ?? 0,
        })
        .select()
        .single();
      if (error || !data) { toast.error(`Product: ${error?.message ?? "insert failed"}`); return null; }
      const created = mapProduct(data);
      setProducts((prev) => [created, ...prev]);

      if (initialStock && initialStock.length) {
        const today = new Date().toISOString().slice(0, 10);
        const movements: StockMovement[] = initialStock
          .filter((s) => s.warehouseId && s.quantity > 0)
          .map((s) => ({
            id: "",
            companyId: activeCompanyId,
            date: today,
            productId: created.id,
            warehouseId: s.warehouseId,
            type: "adjustment",
            quantity: s.quantity,
            unitCost: s.unitCost,
            reference: "OPENING",
          }));
        if (movements.length) await insertMovementsRaw(movements);
      }
      return created;
    },
    [activeCompanyId, insertMovementsRaw],
  );

  const transferStock: CompanyContextValue["transferStock"] = React.useCallback(
    async ({ fromWarehouseId, toWarehouseId, date, items, reference }) => {
      const movements: StockMovement[] = [];
      items.forEach((it) => {
        if (it.quantity <= 0) return;
        movements.push({
          id: "",
          companyId: activeCompanyId,
          date,
          productId: it.productId,
          warehouseId: fromWarehouseId,
          type: "transfer",
          quantity: -it.quantity,
          unitCost: 0,
          reference,
        });
        movements.push({
          id: "",
          companyId: activeCompanyId,
          date,
          productId: it.productId,
          warehouseId: toWarehouseId,
          type: "transfer",
          quantity: it.quantity,
          unitCost: 0,
          reference,
        });
      });
      if (movements.length) await insertMovementsRaw(movements);
    },
    [activeCompanyId, insertMovementsRaw],
  );

  const deleteProduct: CompanyContextValue["deleteProduct"] = React.useCallback(
    async (id) => {
      // remove movements first (FK-free but logically related)
      const { error: mErr } = await supabase.from("stock_movements").delete().eq("product_id", id);
      if (mErr) { toast.error(`Delete movements: ${mErr.message}`); return; }
      const { error: lErr } = await supabase.from("stock_levels").delete().eq("product_id", id);
      if (lErr) { toast.error(`Delete stock levels: ${lErr.message}`); return; }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) { toast.error(`Delete product: ${error.message}`); return; }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setStockMovements((prev) => prev.filter((m) => m.productId !== id));
      toast.success("Product deleted");
    },
    [],
  );

  const updateProduct: CompanyContextValue["updateProduct"] = React.useCallback(
    async (p) => {
      const { data, error } = await supabase
        .from("products")
        .update({
          sku: p.sku,
          name: p.name,
          category: p.category || null,
          unit: p.unit || "pcs",
          avg_cost: p.avgCost ?? 0,
          price: p.price ?? 0,
          reorder_level: p.reorderLevel ?? 0,
        })
        .eq("id", p.id)
        .select()
        .single();
      if (error || !data) { toast.error(`Update product: ${error?.message ?? "failed"}`); return; }
      const updated = mapProduct(data);
      setProducts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("Product updated");
    },
    [],
  );


  const value = React.useMemo<CompanyContextValue>(
    () => ({
      companies,
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
      deleteWarehouse,
      addStockMovement,
      addStockMovements,
      transferStock,
      deleteProduct,
      updateProduct,
    }),
    [
      companies,
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
      deleteProduct,
      updateProduct,
    ],
  );

  if (!ready || !activeCompanyId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = React.useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}

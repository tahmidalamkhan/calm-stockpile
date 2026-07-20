// Domain types for the inventory management app.
export type ID = string;

export type Company = {
  id: ID;
  name: string;
  legalName: string;
  currency: string;
  taxId?: string;
};

export type Warehouse = {
  id: ID;
  companyId: ID;
  name: string;
  code: string;
  address: string;
  isDefault: boolean;
};

export type Product = {
  id: ID;
  companyId: ID;
  sku: string;
  name: string;
  category: string;
  unit: string;
  avgCost: number;
  price: number;
  reorderLevel: number;
};

export type StockLevel = {
  productId: ID;
  warehouseId: ID;
  quantity: number;
};

export type StockMovementType = "purchase" | "sale" | "adjustment" | "transfer";

export type StockMovement = {
  id: ID;
  companyId: ID;
  createdAt?: string;
  date: string;
  productId: ID;
  warehouseId: ID;
  type: StockMovementType;
  quantity: number;
  unitCost: number;
  reference: string;
  fromQty?: number;
  toQty?: number;
};

export type Supplier = {
  id: ID;
  companyId: ID;
  name: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
};

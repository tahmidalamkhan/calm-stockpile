import type {
  Company,
  Warehouse,
  Product,
  StockMovement,
  Supplier,
} from "../types";

export const companies: Company[] = [
  { id: "c1", name: "Acme Trading Co.", legalName: "Acme Trading Co. Pvt Ltd", currency: "BDT", taxId: "TX-001" },
  { id: "c2", name: "Bluewave Imports", legalName: "Bluewave Imports LLC", currency: "BDT", taxId: "TX-002" },
  { id: "c3", name: "GreenLeaf Retail", legalName: "GreenLeaf Retail Inc.", currency: "BDT", taxId: "TX-003" },
];

export const warehouses: Warehouse[] = [
  { id: "w1", companyId: "c1", name: "Main Warehouse", code: "WH-01", address: "12 Industrial Ave", isDefault: true },
  { id: "w2", companyId: "c1", name: "Downtown Store", code: "WH-02", address: "44 Market St", isDefault: false },
  { id: "w3", companyId: "c2", name: "Port Warehouse", code: "WH-01", address: "Pier 7", isDefault: true },
  { id: "w4", companyId: "c3", name: "Retail Floor", code: "WH-01", address: "9 Greenway", isDefault: true },
];

export const products: Product[] = [
  { id: "p1", companyId: "c1", sku: "WIDGET-001", name: "Premium Widget", category: "Widgets", unit: "pcs", avgCost: 12.5, price: 25, reorderLevel: 20 },
  { id: "p2", companyId: "c1", sku: "WIDGET-002", name: "Standard Widget", category: "Widgets", unit: "pcs", avgCost: 7.25, price: 15, reorderLevel: 50 },
  { id: "p3", companyId: "c1", sku: "GADGET-001", name: "Smart Gadget", category: "Gadgets", unit: "pcs", avgCost: 45, price: 89, reorderLevel: 10 },
  { id: "p4", companyId: "c1", sku: "BOLT-M8", name: "M8 Bolt Pack", category: "Hardware", unit: "box", avgCost: 3.2, price: 8, reorderLevel: 30 },
  { id: "p5", companyId: "c1", sku: "CABLE-USB-C", name: "USB-C Cable 1m", category: "Accessories", unit: "pcs", avgCost: 2.1, price: 7.5, reorderLevel: 100 },
  { id: "p6", companyId: "c2", sku: "IMP-TEA-01", name: "Imported Tea 500g", category: "Beverages", unit: "pack", avgCost: 6, price: 14, reorderLevel: 25 },
  { id: "p7", companyId: "c3", sku: "RETAIL-MUG", name: "Ceramic Mug", category: "Homeware", unit: "pcs", avgCost: 4, price: 12, reorderLevel: 40 },
];

export const stockMovements: StockMovement[] = [
  { id: "sm1", companyId: "c1", date: "2026-03-01", productId: "p1", warehouseId: "w1", type: "purchase", quantity: 100, unitCost: 12.5, reference: "PO-001" },
  { id: "sm2", companyId: "c1", date: "2026-03-15", productId: "p1", warehouseId: "w1", type: "sale", quantity: -25, unitCost: 12.5, reference: "INV-001" },
  { id: "sm3", companyId: "c1", date: "2026-03-20", productId: "p3", warehouseId: "w1", type: "purchase", quantity: 30, unitCost: 45, reference: "PO-002" },
  { id: "sm4", companyId: "c1", date: "2026-04-01", productId: "p2", warehouseId: "w2", type: "purchase", quantity: 200, unitCost: 7.25, reference: "PO-003" },
  { id: "sm5", companyId: "c1", date: "2026-04-10", productId: "p5", warehouseId: "w1", type: "sale", quantity: -40, unitCost: 2.1, reference: "INV-002" },
  { id: "sm6", companyId: "c1", date: "2026-04-12", productId: "p4", warehouseId: "w1", type: "adjustment", quantity: -5, unitCost: 3.2, reference: "ADJ-001" },
];

export const suppliers: Supplier[] = [
  { id: "su1", companyId: "c1", name: "Stark Industries", email: "po@stark.com", phone: "+1 555 0901", address: "10880 Malibu Pt", balance: 4200 },
  { id: "su2", companyId: "c1", name: "Wayne Enterprises", email: "vendor@wayne.com", phone: "+1 555 0902", address: "1007 Mountain Dr", balance: 0 },
  { id: "su3", companyId: "c1", name: "Acme Supplies", email: "sales@acmesup.com", phone: "+1 555 0903", address: "Desert Rd", balance: 980 },
  { id: "su4", companyId: "c2", name: "Oceanic Goods", email: "ops@oceanic.com", phone: "+1 555 0904", address: "Pier 9", balance: 1500 },
  { id: "su5", companyId: "c3", name: "Local Crafts Co", email: "hi@localcrafts.com", phone: "+1 555 0905", address: "12 Maker St", balance: 0 },
];

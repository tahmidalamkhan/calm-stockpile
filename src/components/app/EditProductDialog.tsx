import * as React from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/lib/mock/store";
import type { Product } from "@/lib/types";
import { toast } from "sonner";

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateProduct } = useCompany();
  const [sku, setSku] = React.useState(product.sku);
  const [name, setName] = React.useState(product.name);
  const [category, setCategory] = React.useState(product.category);
  const [unit, setUnit] = React.useState(product.unit);
  const [price, setPrice] = React.useState(product.price);
  const [avgCost, setAvgCost] = React.useState(product.avgCost);
  const [reorderLevel, setReorderLevel] = React.useState(product.reorderLevel);

  React.useEffect(() => {
    if (open) {
      setSku(product.sku);
      setName(product.name);
      setCategory(product.category);
      setUnit(product.unit);
      setPrice(product.price);
      setAvgCost(product.avgCost);
      setReorderLevel(product.reorderLevel);
    }
  }, [open, product]);

  const submit = async () => {
    if (!sku || !name) return toast.error("SKU and name are required");
    await updateProduct({
      ...product,
      sku, name, category, unit, price, avgCost, reorderLevel,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>SKU</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Avg cost</Label><Input type="number" min={0} step="0.01" value={avgCost || ""} onChange={(e) => setAvgCost(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Price</Label><Input type="number" min={0} step="0.01" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          <div className="grid gap-1.5"><Label>Reorder level</Label><Input type="number" min={0} value={reorderLevel || ""} onChange={(e) => setReorderLevel(Number(e.target.value))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

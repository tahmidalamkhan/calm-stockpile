import * as React from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompany } from "@/lib/mock/store";
import { toast } from "sonner";

export function NewWarehouseDialog() {
  const { activeCompanyId, addWarehouse } = useCompany();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);

  const submit = () => {
    if (!name || !code) return toast.error("Name and code are required");
    addWarehouse({
      id: `w-${Date.now()}`,
      companyId: activeCompanyId,
      name, code, address, isDefault,
    });
    toast.success(`Warehouse ${name} added`);
    setName(""); setCode(""); setAddress(""); setIsDefault(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> New warehouse</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New warehouse</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
            Default warehouse
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

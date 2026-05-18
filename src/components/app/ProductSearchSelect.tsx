"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Product = {
  id: string;
  sku: string;
  name: string;
};

export function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = "Select product",
  disabledIds = [],
}: {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabledIds?: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between px-2 font-normal"
        >
          <span className="truncate">
            {selected ? `${selected.sku} — ${selected.name}` : placeholder}
          </span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or SKU…" />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const disabled = disabledIds.includes(p.id);
                return (
                  <CommandItem
                    key={p.id}
                    value={`${p.sku} ${p.name}`}
                    disabled={disabled}
                    onSelect={() => {
                      if (!disabled) {
                        onChange(p.id);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between",
                      disabled && "opacity-40 pointer-events-none"
                    )}
                  >
                    <span className="truncate">
                      <span className="font-medium">{p.sku}</span>
                      <span className="text-muted-foreground"> — {p.name}</span>
                    </span>
                    {value === p.id && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

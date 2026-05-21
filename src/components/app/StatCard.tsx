import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card
      className={cn(
        "transition-all",
        "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
        "cursor-pointer",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint && (
          <p
            className={cn(
              "mt-1 text-xs",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              (!trend || trend === "neutral") && "text-muted-foreground",
            )}
          >
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

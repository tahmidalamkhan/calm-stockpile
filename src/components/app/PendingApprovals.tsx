import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/access";
import { formatDate } from "@/lib/format";

export function PendingApprovals() {
  const qc = useQueryClient();
  const [roles, setRoles] = React.useState<Record<string, "admin" | "staff">>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["access-requests"],
    queryFn: listAccessRequests,
  });

  const approve = useMutation({
    mutationFn: (v: { id: string; role: "admin" | "staff" }) =>
      approveAccessRequest(v.id, v.role),
    onSuccess: () => {
      toast.success("Access granted");
      qc.invalidateQueries({ queryKey: ["access-requests"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectAccessRequest(id),
    onSuccess: () => {
      toast.success("Access denied");
      qc.invalidateQueries({ queryKey: ["access-requests"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (data ?? []).filter((r) => r.status === "pending");

  if (error) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Pending approvals
          {pending.length > 0 && <Badge>{pending.length}</Badge>}
        </CardTitle>
        <CardDescription>
          New sign-ups can't use the app until you grant them permission.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Grant role</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : pending.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No accounts waiting for approval.
                </TableCell>
              </TableRow>
            ) : (
              pending.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={roles[r.id] ?? "staff"}
                      onValueChange={(v) =>
                        setRoles((s) => ({ ...s, [r.id]: v as "admin" | "staff" }))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="sm"
                      disabled={approve.isPending}
                      onClick={() =>
                        approve.mutate({ id: r.id, role: roles[r.id] ?? "staff" })
                      }
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(r.id)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

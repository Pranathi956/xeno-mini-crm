import { useState } from "react";
import { useListCustomers, getListCustomersQueryKey } from "../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { format } from "date-fns";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ search }, {
    query: { queryKey: getListCustomersQueryKey({ search }) },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
      </div>

      <Card>
        <div className="p-4 border-b border-border/50 flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, email, or city..."
              className="pl-9 bg-secondary/30 border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right pr-6">Last Purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : customers?.length ? (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="pl-6 font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                    <TableCell>{customer.city}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      ₹{customer.totalSpent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{customer.visitCount}</TableCell>
                    <TableCell className="text-right pr-6 text-muted-foreground">
                      {customer.lastPurchaseDate
                        ? format(new Date(customer.lastPurchaseDate), "MMM d, yyyy")
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No customers found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

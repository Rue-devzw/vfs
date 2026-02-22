import { Search, Mail, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function AdminCustomersPage() {
    // This is a placeholder for real customer data from Firestore
    const customers = [
        { id: "1", name: "John Doe", email: "john@example.com", phone: "+263 771 000 000", orders: 3 },
        { id: "2", name: "Jane Smith", email: "jane@example.com", phone: "+263 788 111 222", orders: 1 },
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Customer Directory</h2>
                <p className="text-muted-foreground">View and manage your store customers.</p>
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers by name or email..."
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Orders</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Mail className="h-3 w-3 text-muted-foreground" />
                                            {customer.email}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Phone className="h-3 w-3 text-muted-foreground" />
                                            {customer.phone}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{customer.orders}</TableCell>
                                <TableCell className="text-right">
                                    <span className="text-xs text-muted-foreground italic">Coming Soon</span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No customers found yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

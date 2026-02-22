import { listProducts } from "@/lib/firestore/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Plus, Search, Edit, Tag, AlertTriangle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { DeleteProductButton } from "./components/delete-product-button"
import { isFirebaseConfigured } from "@/lib/firebase-admin"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminProductsPage() {
    if (!isFirebaseConfigured()) {
        return (
            <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                    <div className="flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Configuration Required</CardTitle>
                    </div>
                    <CardDescription className="text-yellow-600">
                        Firestore must be configured to manage products.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const { items: products } = await listProducts()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Product Management</h2>
                <Button asChild>
                    <Link href="/admin/products/new">
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products by name, SNR, or category..."
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            <div className="bg-card rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <div className="relative h-12 w-12 rounded overflow-hidden border">
                                        <Image
                                            src={product.image || "/images/placeholder.webp"}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {product.name}
                                    <div className="text-xs text-muted-foreground">{product.unit}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">{product.category}</div>
                                    <div className="text-xs text-muted-foreground">{product.subcategory || "No subcategory"}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-semibold">${product.price.toFixed(2)}</div>
                                    {product.oldPrice && (
                                        <div className="text-xs text-muted-foreground line-through">${product.oldPrice.toFixed(2)}</div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {product.onSpecial ? (
                                        <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                                            <Tag className="h-3 w-3" /> Special
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Standard</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/products/${product.id}`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <DeleteProductButton productId={product.id} productName={product.name} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No products found. Start by adding a new product or migrating existing data.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

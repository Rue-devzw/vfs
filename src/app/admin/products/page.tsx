import { listCategories, listProducts } from "@/lib/firestore/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Tag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DeleteProductButton } from "./components/delete-product-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAdminImageSrc } from "@/lib/admin-images";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim().toLowerCase() ?? "";
  const category = firstParam(params.category) ?? "all";
  const special = firstParam(params.special) ?? "all";
  const stock = firstParam(params.stock) ?? "all";

  const [{ items: products, source }, categoryResult] = await Promise.all([
    listProducts(category !== "all" ? { category } : {}),
    listCategories(),
  ]);

  const filteredProducts = products.filter(product => {
    const haystack = [product.name, product.category, product.subcategory, product.sku]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (special === "special" && !product.onSpecial) return false;
    if (special === "standard" && product.onSpecial) return false;
    if (stock === "unavailable" && product.availableForSale) return false;
    if (stock === "available" && !product.availableForSale) return false;
    return true;
  });

  const unavailableCount = products.filter(product => !product.availableForSale).length;
  const specialsCount = products.filter(product => product.onSpecial).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Management</h2>
          <p className="text-sm text-muted-foreground">
            Search, filter, and edit the live catalog. Source: {source}.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visible Products</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{products.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{unavailableCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Special Offers</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{specialsCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow the catalog by search, category, promotion, or availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" method="get">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={query} placeholder="Search by name, SKU, or category..." className="pl-9" />
            </div>
            <select
              name="category"
              defaultValue={category}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All categories</option>
              {categoryResult.categories.map(item => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              name="special"
              defaultValue={special}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All promotions</option>
              <option value="special">Special only</option>
              <option value="standard">Standard only</option>
            </select>
            <select
              name="stock"
              defaultValue={stock}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All stock states</option>
              <option value="available">Available only</option>
              <option value="unavailable">Unavailable only</option>
            </select>
            <div className="flex gap-2 md:col-span-4">
              <Button type="submit">Apply Filters</Button>
              <Button variant="outline" asChild>
                <Link href="/admin/products">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[84px]">Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(product => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="relative h-12 w-12 overflow-hidden rounded border">
                    <Image
                      src={resolveAdminImageSrc(product.image, product.name)}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.sku || "No SKU"} • {product.unit}
                  </div>
                </TableCell>
                <TableCell>
                  <div>{product.category}</div>
                  <div className="text-xs text-muted-foreground">{product.subcategory || "No subcategory"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold">${product.price.toFixed(2)}</div>
                  {product.oldPrice ? (
                    <div className="text-xs text-muted-foreground line-through">${product.oldPrice.toFixed(2)}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {product.onSpecial ? (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
                        <Tag className="h-3 w-3" /> Special
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard</span>
                    )}
                    <span className={`text-xs ${product.availableForSale ? "text-green-700" : "text-red-700"}`}>
                      {product.availableForSale ? product.inventoryStatus.replace(/_/g, " ") : "Unavailable"}
                    </span>
                  </div>
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
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No products match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

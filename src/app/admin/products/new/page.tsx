import { createProduct } from "@/lib/firestore/products"
import { ProductForm } from "../components/product-form"
import { revalidatePath } from "next/cache"
import type { ProductFormValues } from "../components/product-form"

export default function NewProductPage() {
    async function handleCreate(data: ProductFormValues) {
        "use server"
        await createProduct(data)
        revalidatePath("/store")
        revalidatePath("/admin/products")
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">New Product</h2>
                <p className="text-muted-foreground">Add a new item to your store inventory.</p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
                <ProductForm onSubmit={handleCreate} />
            </div>
        </div>
    )
}

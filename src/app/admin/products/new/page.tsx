import { createProduct } from "@/lib/firestore/products"
import { ProductForm } from "../components/product-form"
import { revalidatePath } from "next/cache"

export default function NewProductPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function handleCreate(data: any) {
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

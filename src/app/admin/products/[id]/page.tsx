import { getProductById, updateProduct } from "@/lib/firestore/products"
import { ProductForm } from "../components/product-form"
import { notFound } from "next/navigation"

interface EditProductPageProps {
    params: {
        id: string
    }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = params
    const { product } = await getProductById(id)

    if (!product) {
        notFound()
    }

    async function handleUpdate(data: any) {
        "use server"
        await updateProduct(id, data)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Edit Product: {product.name}</h2>
                <p className="text-muted-foreground">Update product details, pricing, and availability.</p>
            </div>

            <div className="bg-card p-6 rounded-lg border">
                <ProductForm initialData={product} onSubmit={handleUpdate} />
            </div>
        </div>
    )
}

"use server"

import { deleteProduct } from "@/lib/firestore/products"
import { revalidatePath } from "next/cache"

export async function deleteProductAction(productId: string) {
    await deleteProduct(productId)
    revalidatePath("/store")
    revalidatePath("/admin/products")
}

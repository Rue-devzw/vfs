"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { categories, subCategories } from "@/app/store/data"
import { StoreProduct } from "@/lib/firestore/products"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Loader2, Upload, X, ImageIcon } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

const PLACEHOLDER_IMAGE = "/images/placeholder.webp"

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    price: z.coerce.number().positive("Price must be positive"),
    oldPrice: z.coerce.number().optional(),
    unit: z.string().min(1, "Unit is required"),
    category: z.string().min(1, "Category is required"),
    subcategory: z.string().optional(),
    image: z
        .string()
        .refine(
            (val) => val === "" || val.startsWith("/") || val.startsWith("http"),
            "Must be a valid path or URL"
        )
        .refine(
            (val) => val === "" || val.toLowerCase().includes(".webp"),
            "Image must be in WebP format (.webp)"
        ),
    onSpecial: z.boolean().default(false),
})

type ProductFormValues = z.infer<typeof formSchema>

interface ProductFormProps {
    initialData?: StoreProduct | null
    onSubmit: (data: ProductFormValues) => Promise<void>
}

export function ProductForm({ initialData, onSubmit }: ProductFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData
            ? {
                name: initialData.name,
                price: initialData.price,
                oldPrice: initialData.oldPrice,
                unit: initialData.unit,
                category: initialData.category,
                subcategory: initialData.subcategory || "None",
                image: initialData.image,
                onSpecial: initialData.onSpecial,
            }
            : {
                name: "",
                price: 0,
                unit: "per kg",
                category: "",
                subcategory: "None",
                image: PLACEHOLDER_IMAGE,
                onSpecial: false,
            },
    })

    const currentImage = form.watch("image")

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== "image/webp") {
            toast({
                title: "Invalid file type",
                description: "Only WebP images (.webp) are accepted. Please convert your image first.",
                variant: "destructive",
            })
            // Reset the file input
            if (fileInputRef.current) fileInputRef.current.value = ""
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/admin/upload-image", {
                method: "POST",
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error ?? "Upload failed")
            }

            form.setValue("image", data.path, { shouldValidate: true })
            toast({
                title: "Image uploaded",
                description: "Product image updated successfully.",
            })
        } catch (err) {
            toast({
                title: "Upload failed",
                description: err instanceof Error ? err.message : "Could not upload image.",
                variant: "destructive",
            })
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleRemoveImage = () => {
        form.setValue("image", PLACEHOLDER_IMAGE, { shouldValidate: true })
    }

    const handleFormSubmit = async (values: ProductFormValues) => {
        try {
            setLoading(true)
            await onSubmit(values)
            router.push("/admin/products")
            router.refresh()
        } catch (error) {
            console.error("Error submitting form:", error)
        } finally {
            setLoading(false)
        }
    }

    const isPlaceholder =
        !currentImage || currentImage === PLACEHOLDER_IMAGE

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Product Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Fresh Tomatoes" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. per kg, 500g pack" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="oldPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Old Price ($) - Optional</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormDescription>Shows a line-through price if set</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subcategory</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a subcategory" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {subCategories.map((sub) => (
                                            <SelectItem key={sub} value={sub}>
                                                {sub}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Image Management */}
                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Image</FormLabel>
                            <FormDescription>
                                Only <strong>WebP</strong> format images are accepted.
                            </FormDescription>

                            {/* Image Preview */}
                            <div className="flex items-start gap-4">
                                <div className="relative w-32 h-32 rounded-lg border bg-muted overflow-hidden flex-shrink-0">
                                    {currentImage && !isPlaceholder ? (
                                        <Image
                                            src={currentImage}
                                            alt="Product preview"
                                            fill
                                            className="object-cover"
                                            onError={() =>
                                                form.setValue("image", PLACEHOLDER_IMAGE)
                                            }
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                            <ImageIcon className="h-10 w-10" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    {/* Hidden file input - WebP only */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".webp,image/webp"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full sm:w-auto"
                                    >
                                        {uploading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        {uploading ? "Uploading..." : "Upload WebP Image"}
                                    </Button>

                                    {!isPlaceholder && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleRemoveImage}
                                            className="w-full sm:w-auto text-destructive hover:text-destructive"
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Remove Image
                                        </Button>
                                    )}

                                    {/* Manual URL input as fallback */}
                                    <FormControl>
                                        <Input
                                            placeholder="/images/product-name.webp"
                                            {...field}
                                            className="text-xs text-muted-foreground"
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        Or enter a path/URL manually. Must end in <code>.webp</code>
                                    </p>
                                </div>
                            </div>

                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="onSpecial"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">On Special</FormLabel>
                                <FormDescription>
                                    Mark this product as a special offer to highlight it in the store.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex gap-4">
                    <Button type="submit" disabled={loading || uploading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Update Product" : "Create Product"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    )
}

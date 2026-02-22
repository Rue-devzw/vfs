import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "./components/admin-sidebar"

// Force all admin pages to render dynamically (never statically prerendered).
// This prevents build-time Firebase connection attempts which fail on Vercel.
export const dynamic = 'force-dynamic'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-muted/40 w-full">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="flex items-center mb-8">
                        <SidebarTrigger className="mr-4" />
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    </div>
                    {children}
                </main>
            </div>
        </SidebarProvider>
    )
}

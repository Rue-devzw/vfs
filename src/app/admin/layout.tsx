import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "./components/admin-sidebar"
import { Badge } from "@/components/ui/badge"
import { verifyAdminSession } from "@/lib/auth"

// Force all admin pages to render dynamically (never statically prerendered).
// This prevents build-time Firebase connection attempts which fail on Vercel.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await verifyAdminSession()
    if (!session) {
        return <>{children}</>
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-muted/40 w-full">
                <AdminSidebar role={session.role} permissions={session.permissions} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="flex items-center justify-between mb-8 gap-4">
                      <div className="flex items-center">
                        <SidebarTrigger className="mr-4" />
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{session.staffLabel}</Badge>
                        <Badge variant="secondary" className="capitalize">
                          {session.role.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                    {children}
                </main>
            </div>
        </SidebarProvider>
    )
}

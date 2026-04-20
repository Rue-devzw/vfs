"use client"

import {
    LayoutDashboard,
    Package,
    ReceiptText,
    ShoppingCart,
    Settings,
    Store,
    Users,
    LogOut,
    Bell,
    History,
    Zap,
    Truck,
    Undo2,
    ShieldCheck
} from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logoutAction } from "../login/actions"
import type { StaffPermission, StaffRole } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

const items = [
    {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
        permission: "dashboard.view",
    },
    {
        title: "Products",
        url: "/admin/products",
        icon: Package,
        permission: "products.view",
    },
    {
        title: "Orders",
        url: "/admin/orders",
        icon: ShoppingCart,
        permission: "orders.view",
    },
    {
        title: "Payments",
        url: "/admin/payments",
        icon: ReceiptText,
        permission: "payments.view",
    },
    {
        title: "Shipments",
        url: "/admin/shipments",
        icon: Truck,
        permission: "shipments.view",
    },
    {
        title: "Refunds",
        url: "/admin/refunds",
        icon: Undo2,
        permission: "refunds.view",
    },
    {
        title: "Customers",
        url: "/admin/customers",
        icon: Users,
        permission: "customers.view",
    },
    {
        title: "Notifications",
        url: "/admin/notifications",
        icon: Bell,
        permission: "notifications.view",
    },
    {
        title: "Audit Log",
        url: "/admin/audit",
        icon: History,
        permission: "audit.view",
    },
    {
        title: "Digital Ops",
        url: "/admin/digital",
        icon: Zap,
        permission: "digital.view",
    },
    {
        title: "Reconciliation",
        url: "/admin/reconciliation",
        icon: ShieldCheck,
        permission: "dashboard.view",
    },
    {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
        permission: "settings.manage",
    },
]

type AdminSidebarProps = {
    role: StaffRole
    permissions: StaffPermission[]
}

export function AdminSidebar({ role, permissions }: AdminSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const visibleItems = items.filter(item => permissions.includes(item.permission as StaffPermission))

    const handleLogout = async () => {
        await logoutAction()
        router.push("/")
        router.refresh()
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b px-6 py-4">
                <div className="space-y-2">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl uppercase tracking-tighter">
                        <Store className="h-6 w-6 text-primary" />
                        <span className="group-data-[collapsible=icon]:hidden">VFS Admin</span>
                    </Link>
                    <Badge variant="outline" className="group-data-[collapsible=icon]:hidden capitalize">
                        {role.replace(/_/g, " ")}
                    </Badge>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                    >
                                        <Link href={item.url}>
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                            <span>Exit Admin</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, AlertTriangle } from "lucide-react"
import { listProducts } from "@/lib/firestore/products"
import { listOrders } from "@/lib/firestore/orders"
import { isFirebaseConfigured } from "@/lib/firebase-admin"

export default async function AdminDashboardPage() {
    if (!isFirebaseConfigured()) {
        return (
            <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                    <div className="flex items-center gap-2 text-yellow-700">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Firebase Not Configured</CardTitle>
                    </div>
                    <CardDescription className="text-yellow-600">
                        To use the full control features, you need to set up your Firebase environment variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-yellow-700">
                        Create a <code>.env.local</code> file in your project root with the following variables:
                    </p>
                    <pre className="p-4 bg-muted rounded text-xs font-mono overflow-auto">
                        FIREBASE_PROJECT_ID=your-project-id{"\n"}
                        FIREBASE_CLIENT_EMAIL=your-client-email{"\n"}
                        FIREBASE_PRIVATE_KEY=&quot;-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n&quot;
                    </pre>
                    <p className="text-xs text-yellow-600">
                        Note: You can get these from your Firebase Console &gt; Project Settings &gt; Service Accounts.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const products = await listProducts()
    const orders = await listOrders()

    const totalRevenue = orders.reduce((acc, order) => acc + (order.total || 0), 0)
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const totalProducts = products.items.length

    const stats = [
        {
            title: "Total Revenue",
            value: `$${totalRevenue.toFixed(2)}`,
            icon: DollarSign,
            description: "Lifetime revenue",
            color: "text-green-600"
        },
        {
            title: "Orders",
            value: orders.length.toString(),
            icon: ShoppingCart,
            description: `${pendingOrders} pending`,
            color: "text-blue-600"
        },
        {
            title: "Products",
            value: totalProducts.toString(),
            icon: Package,
            description: "In inventory",
            color: "text-purple-600"
        },
        {
            title: "Active Users",
            value: "12",
            icon: Users,
            description: "Logged in recently",
            color: "text-orange-600"
        }
    ]

    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>Recent sales performance</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                        {/* Chart component would go here */}
                        <div className="flex flex-col items-center gap-2">
                            <TrendingUp className="h-8 w-8 opacity-20" />
                            <p>Sales Chart (Placeholder)</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>You have {pendingOrders} pending orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {orders.slice(0, 5).map((order) => (
                                <div key={order.id} className="flex items-center gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {order.customerName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {order.items.length} items • ${order.total?.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className={`text-xs px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {order.status}
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <p className="text-sm text-center py-4 text-muted-foreground">No recent orders</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

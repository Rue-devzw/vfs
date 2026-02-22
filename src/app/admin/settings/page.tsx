import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold">Store Settings</h2>
                <p className="text-muted-foreground">Configure your store information and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Public contact details for your store.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="storeName">Store Name</Label>
                            <Input id="storeName" defaultValue="Valley Farm Secrets" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Support Email</Label>
                            <Input id="email" defaultValue="support@valleyfarmsecrets.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Contact Phone</Label>
                            <Input id="phone" defaultValue="+263 788 679 000" />
                        </div>
                        <Button className="w-full">
                            <Save className="mr-2 h-4 w-4" /> Save General Settings
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Controls</CardTitle>
                        <CardDescription>Manage how products are displayed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b">
                            <div>
                                <div className="font-medium">Auto-Archive Products</div>
                                <div className="text-sm text-muted-foreground">Archive when stock reaches zero.</div>
                            </div>
                            <div className="h-6 w-10 bg-primary/20 rounded-full relative">
                                <div className="absolute right-1 top-1 h-4 w-4 bg-primary rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                            <div>
                                <div className="font-medium">Show &quot;Out of Stock&quot;</div>
                                <div className="text-sm text-muted-foreground">Display unavailable items in store.</div>
                            </div>
                            <div className="h-6 w-10 bg-muted rounded-full relative">
                                <div className="absolute left-1 top-1 h-4 w-4 bg-background rounded-full" />
                            </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4">
                            Advanced Inventory Settings
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

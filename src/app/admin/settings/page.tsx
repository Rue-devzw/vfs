import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, AlertTriangle } from "lucide-react";
import { getStoreSettings, updateStoreSettings } from "@/lib/firestore/settings";
import { DEFAULT_ZONES, listDeliveryZones, updateDeliveryZones } from "@/lib/firestore/shipping";
import { revalidatePath } from "next/cache";
import { isFirebaseConfigured } from "@/lib/firebase-admin";

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();
  const deliveryZones = await listDeliveryZones();

  async function saveSettings(formData: FormData) {
    "use server";

    await updateStoreSettings({
      storeName: String(formData.get("storeName") || settings.storeName),
      supportEmail: String(formData.get("supportEmail") || settings.supportEmail),
      supportPhone: String(formData.get("supportPhone") || settings.supportPhone),
      supportWhatsapp: String(formData.get("supportWhatsapp") || settings.supportWhatsapp),
      address: String(formData.get("address") || settings.address),
      currencyCode: (String(formData.get("currencyCode") || settings.currencyCode) === "ZWG" ? "ZWG" : "USD"),
      showOutOfStock: formData.get("showOutOfStock") === "on",
      autoArchiveProducts: formData.get("autoArchiveProducts") === "on",
      taxLabel: String(formData.get("taxLabel") || settings.taxLabel),
      taxRatePercent: Number(formData.get("taxRatePercent") || settings.taxRatePercent),
      pricesIncludeTax: formData.get("pricesIncludeTax") === "on",
      invoicePrefix: String(formData.get("invoicePrefix") || settings.invoicePrefix),
    });
    const zoneIds = formData.getAll("zoneId");
    const zoneNames = formData.getAll("zoneName");
    const zoneCities = formData.getAll("zoneCities");
    const zoneFees = formData.getAll("zoneFee");
    const zoneEtaMins = formData.getAll("zoneEtaMin");
    const zoneEtaMaxes = formData.getAll("zoneEtaMax");
    const zoneActives = new Set(formData.getAll("zoneActive").map(String));

    await updateDeliveryZones(zoneIds.map((value, index) => ({
      id: String(value).trim(),
      name: String(zoneNames[index] ?? "").trim(),
      cities: String(zoneCities[index] ?? "")
        .split(",")
        .map(city => city.trim())
        .filter(Boolean),
      baseFeeUsd: Number(zoneFees[index] ?? 0),
      etaMinHours: Number(zoneEtaMins[index] ?? 0),
      etaMaxHours: Number(zoneEtaMaxes[index] ?? 0),
      active: zoneActives.has(String(value).trim()),
    })));

    revalidatePath("/admin/settings");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Store Settings</h2>
        <p className="text-muted-foreground">Configure operational and storefront settings persisted in Firestore.</p>
      </div>

      {!isFirebaseConfigured() ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Firestore Not Configured</CardTitle>
            </div>
            <CardDescription className="text-yellow-700">
              You can view defaults here, but saving requires a configured Firebase admin connection.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <AdminActionForm
        action={saveSettings}
        className="grid grid-cols-1 gap-6 xl:grid-cols-2"
        pendingTitle="Saving admin settings"
        pendingMessage="We are updating store settings and delivery zone controls."
      >
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Public contact and business identity shown to customers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input id="storeName" name="storeName" defaultValue={settings.storeName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input id="supportEmail" name="supportEmail" defaultValue={settings.supportEmail} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhone">Contact Phone</Label>
              <Input id="supportPhone" name="supportPhone" defaultValue={settings.supportPhone} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportWhatsapp">WhatsApp</Label>
              <Input id="supportWhatsapp" name="supportWhatsapp" defaultValue={settings.supportWhatsapp} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={settings.address} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Controls</CardTitle>
            <CardDescription>Inventory and currency behaviour used by the storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Default Currency</Label>
              <select
                id="currencyCode"
                name="currencyCode"
                defaultValue={settings.currencyCode}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="USD">USD</option>
                <option value="ZWG">ZWG</option>
              </select>
            </div>
            <label className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <div className="font-medium">Show out-of-stock products</div>
                <div className="text-sm text-muted-foreground">Keep zero-priced or unavailable items visible in storefront listings.</div>
              </div>
              <input name="showOutOfStock" type="checkbox" defaultChecked={settings.showOutOfStock} className="mt-1 h-4 w-4" />
            </label>
            <label className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <div className="font-medium">Auto-archive unavailable products</div>
                <div className="text-sm text-muted-foreground">Flag products for archival workflows when they become unavailable.</div>
              </div>
              <input name="autoArchiveProducts" type="checkbox" defaultChecked={settings.autoArchiveProducts} className="mt-1 h-4 w-4" />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance Settings</CardTitle>
            <CardDescription>Controls used for invoice numbering and tax treatment on orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.invoicePrefix} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxLabel">Tax Label</Label>
              <Input id="taxLabel" name="taxLabel" defaultValue={settings.taxLabel} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRatePercent">Tax Rate (%)</Label>
              <Input id="taxRatePercent" name="taxRatePercent" type="number" min="0" step="0.01" defaultValue={settings.taxRatePercent} />
            </div>
            <label className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <div className="font-medium">Catalog prices already include tax</div>
                <div className="text-sm text-muted-foreground">If enabled, order tax is derived from the stored total instead of added on top.</div>
              </div>
              <input name="pricesIncludeTax" type="checkbox" defaultChecked={settings.pricesIncludeTax} className="mt-1 h-4 w-4" />
            </label>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Delivery Zones</CardTitle>
            <CardDescription>Control delivery pricing and ETA by service area. Cities should be comma-separated labels for internal guidance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(deliveryZones.length > 0 ? deliveryZones : DEFAULT_ZONES).map((zone, index) => (
              <div key={zone.id} className="grid gap-4 rounded-xl border p-4 md:grid-cols-6">
                <div className="space-y-2">
                  <Label htmlFor={`zone-id-${index}`}>Zone ID</Label>
                  <Input id={`zone-id-${index}`} name="zoneId" defaultValue={zone.id} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`zone-name-${index}`}>Name</Label>
                  <Input id={`zone-name-${index}`} name="zoneName" defaultValue={zone.name} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`zone-cities-${index}`}>Cities / Suburbs</Label>
                  <Input id={`zone-cities-${index}`} name="zoneCities" defaultValue={zone.cities.join(", ")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`zone-fee-${index}`}>Fee USD</Label>
                  <Input id={`zone-fee-${index}`} name="zoneFee" type="number" min="0" step="0.01" defaultValue={zone.baseFeeUsd} />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium">
                  <input name="zoneActive" type="checkbox" value={zone.id} defaultChecked={zone.active} className="h-4 w-4" />
                  Active
                </label>
                <div className="space-y-2">
                  <Label htmlFor={`zone-eta-min-${index}`}>ETA Min (hrs)</Label>
                  <Input id={`zone-eta-min-${index}`} name="zoneEtaMin" type="number" min="0" step="1" defaultValue={zone.etaMinHours} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`zone-eta-max-${index}`}>ETA Max (hrs)</Label>
                  <Input id={`zone-eta-max-${index}`} name="zoneEtaMax" type="number" min="0" step="1" defaultValue={zone.etaMaxHours} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="xl:col-span-2">
          <Button type="submit" disabled={!isFirebaseConfigured()}>
            <Save className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </div>
      </AdminActionForm>
    </div>
  );
}

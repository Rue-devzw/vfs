import { Order } from "@/lib/firestore/orders";
type OrderStatus = Order['status'] | "PAID" | "EXPIRED";

export async function savePollUrl(reference: string, pollUrl: string) {
  // TODO: Implement database logic to save the pollUrl against the order reference
  console.log(`Saving pollUrl for order ${reference}: ${pollUrl}`);
}

export async function setOrderStatus(reference: string, status: OrderStatus, meta?: Record<string, unknown>) {
  // TODO: Implement database logic to update the order status
  console.log(`Setting status for order ${reference} to ${status}`, meta);
}

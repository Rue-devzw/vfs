import { getDb } from "../firebase-admin";

export type OrderItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
};

export type Order = {
    id: string;
    items: OrderItem[];
    total: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: string;
    updatedAt: string;
    paymentMethod?: string;
    notes?: string;
};

export async function listOrders(): Promise<Order[]> {
    const db = getDb();
    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
        } as Order;
    });
}

export async function getOrderById(id: string): Promise<Order | null> {
    const db = getDb();
    const doc = await db.collection("orders").doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data();
    return {
        id: doc.id,
        ...data,
    } as Order;
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    const db = getDb();
    await db.collection("orders").doc(id).update({
        status,
        updatedAt: new Date().toISOString(),
    });
}

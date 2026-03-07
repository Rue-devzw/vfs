import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { z } from 'zod';

const createOrderSchema = z.object({
  reference: z.string().min(1),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().nonnegative(),
      quantity: z.number().int().min(1),
      image: z.string(),
    }),
  ).min(1),
  total: z.number().nonnegative(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get("x-idempotency-key");
    const payload = await req.json();
    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const db = getDb();

    if (idempotencyKey) {
      const idemRef = db.collection("idempotency_keys").doc(idempotencyKey);
      await db.runTransaction(async tx => {
        const existing = await tx.get(idemRef);
        if (existing.exists) {
          return;
        }

        tx.set(db.collection('orders').doc(data.reference), {
          ...data,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
        tx.set(idemRef, { reference: data.reference, createdAt: now });
      });
    } else {
      await db.collection('orders').doc(data.reference).set({
        ...data,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving order:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

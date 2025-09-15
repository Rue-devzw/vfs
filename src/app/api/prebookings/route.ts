import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const db = getDb();
    await db.collection('prebookings').add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prebooking:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

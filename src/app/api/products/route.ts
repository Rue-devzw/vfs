import { NextResponse } from 'next/server';
import { products } from '@/app/store/data';

export async function GET() {
  return NextResponse.json(products);
}

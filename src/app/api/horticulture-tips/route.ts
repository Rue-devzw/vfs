import { NextResponse } from 'next/server';
import { horticultureTips } from '@/lib/data';

export async function GET() {
  return NextResponse.json(horticultureTips);
}

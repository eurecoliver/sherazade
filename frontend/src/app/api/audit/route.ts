import { NextRequest, NextResponse } from 'next/server';
import { fetchBackend } from '@/lib/fetchBackend';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params = searchParams.toString();
  const res = await fetchBackend(request, `/api/v1/audit/log/${params ? '?' + params : ''}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

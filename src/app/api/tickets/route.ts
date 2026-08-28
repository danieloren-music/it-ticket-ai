import { NextRequest, NextResponse } from 'next/server';
import { getTicketsContainer } from '@/lib/azureCosmos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const container = getTicketsContainer();
    const querySpec = {
      query: 'SELECT * FROM c ORDER BY c._ts DESC'
    };
    const { resources: tickets } = await container.items.query(querySpec).fetchAll();
    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Error fetching tickets from Cosmos DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const container = getTicketsContainer();
    const body = await req.json();
    const newTicket = {
      ...body,
      id: body.id || `TICK-${Date.now()}`,
      category: body.category || 'General',
      status: body.status || 'Open',
      created_at: new Date().toISOString()
    };

    const { resource: createdItem } = await container.items.create(newTicket);
    return NextResponse.json(createdItem, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket in Cosmos DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
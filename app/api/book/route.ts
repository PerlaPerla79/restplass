import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/book  body: { id: number }
export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: number };
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // 1) Hent gjeldende status
    const { data: slot, error: getErr } = await supabase
      .from('time_slots')
      .select('id, seats_total, seats_taken')
      .eq('id', id)
      .single();

    if (getErr) {
      return NextResponse.json({ error: getErr.message }, { status: 400 });
    }
    if (!slot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (slot.seats_taken >= slot.seats_total) {
      return NextResponse.json({ error: 'Ingen ledige seter' }, { status: 409 });
    }

    // 2) Øk seats_taken med 1
    const { error: updErr } = await supabase
      .from('time_slots')
      .update({ seats_taken: slot.seats_taken + 1 })
      .eq('id', id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    // Realtime sender endringen til klientene automatisk
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

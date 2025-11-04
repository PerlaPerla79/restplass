export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import SlotsClient, { TimeSlot } from './SlotsClient';
import { supabaseAdmin } from '@/lib/supabase';
export default async function SlotsPage() {
  const now = new Date();
  const to = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const fromISO = now.toISOString();
  const toISO = to.toISOString();

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('time_slots')
    .select('id, venue, starts_at, ends_at, seats_total, seats_taken, available')
    .gte('starts_at', fromISO)
    .lte('starts_at', toISO)
    .order('starts_at', { ascending: true });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Ledige bord – neste 6 timer</h1>
        <p style={{ color: 'crimson' }}>Feil ved henting av slots: {error.message}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <SlotsClient initialSlots={(data ?? []) as TimeSlot[]} fromISO={fromISO} toISO={toISO} />
    </main>
  );
}
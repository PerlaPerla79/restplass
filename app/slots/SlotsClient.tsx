'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
  seats: number;
  status: 'open' | 'held' | 'booked' | string;
};

export default function SlotsClient() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const subscribed = useRef(false);

  // 1) Initial fetch
  useEffect(() => {
    let isActive = true;

    (async () => {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .order('starts_at', { ascending: true });

      if (!isActive) return;

      if (error) {
        setError(`Initial fetch error: ${error.message}`);
        return;
      }
      setSlots(data ?? []);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  // 2) Realtime subscription (kun én gang)
  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    const channel = supabase
      .channel('time_slots-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_slots' },
        (payload) => {
          setSlots((prev) => {
            const next = [...prev];

            if (payload.eventType === 'INSERT') {
              next.push(payload.new as Slot);
              next.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              return next;
            }

            if (payload.eventType === 'UPDATE') {
              const idx = next.findIndex((r) => r.id === (payload.new as any).id);
              if (idx !== -1) next[idx] = payload.new as Slot;
              return next;
            }

            if (payload.eventType === 'DELETE') {
              return next.filter((r) => r.id !== (payload.old as any).id);
            }

            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime: CHANNEL_ERROR (sjekk publikasjon/URL/anon key)');
        } else if (status === 'TIMED_OUT') {
          setError('Realtime: TIMED_OUT (nett/WS blokkert?)');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  if (error) {
   
  return <div className="p-4 text-red-600">Initial fetch error: {error}</div>;
}


  return (
    <div className="p-4 space-y-3">
      {slots.length === 0 ? (
        <div>Ingen ledige bord akkurat nå.</div>
      ) : (
        <ul className="space-y-2">
          {slots.map((s) => (
            <li key={s.id} className="rounded-xl border p-3">
              <div className="font-medium">
                {new Date(s.starts_at).toLocaleString()} — {new Date(s.ends_at).toLocaleString()}
              </div>
              <div className="text-sm opacity-80">
                {s.seats} plasser • status: {s.status}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

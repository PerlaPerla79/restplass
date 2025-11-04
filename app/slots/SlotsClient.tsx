'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase';

export type TimeSlot = {
  id: number; // bigint hos deg
  venue: string;
  starts_at: string;
  ends_at: string;
  seats_total: number;
  seats_taken: number;
  available: number;
};

type Props = { initialSlots: TimeSlot[]; fromISO: string; toISO: string };

export default function SlotsClient({ initialSlots, fromISO, toISO }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>(
    [...initialSlots].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
  );
  const [rtStatus, setRtStatus] = useState('CONNECTING');
  const [pendingId, setPendingId] = useState<number | null>(null);

  const supabase = useMemo(() => supabaseBrowser(), []);

  function inWindow(s: TimeSlot) {
    const t = +new Date(s.starts_at);
    return t >= +new Date(fromISO) && t <= +new Date(toISO);
  }

  useEffect(() => {
    const channel = supabase
      .channel('time_slots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_slots' }, (payload) => {
        console.log('Realtime endring:', payload);
        setSlots((prev) => {
          const { eventType, new: rowNew, old: rowOld } = payload as any;

          if (eventType === 'INSERT') {
            if (!inWindow(rowNew)) return prev;
            const exists = prev.some((s) => s.id === rowNew.id);
            const next = exists ? prev.map((s) => (s.id === rowNew.id ? rowNew : s)) : [...prev, rowNew];
            return next.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
          }

          if (eventType === 'UPDATE') {
            if (!inWindow(rowNew)) return prev.filter((s) => s.id !== rowNew.id);
            const next = prev.map((s) => (s.id === rowNew.id ? rowNew : s));
            return next.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
          }

          if (eventType === 'DELETE') {
            const id = (rowOld?.id ?? rowNew?.id) as number | undefined;
            return id ? prev.filter((s) => s.id !== id) : prev;
          }

          return prev;
        });
      })
      .subscribe((status) => {
        setRtStatus(status as string);
        console.log('Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fromISO, toISO]);

  async function bookOne(id: number) {
    try {
      setPendingId(id);
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body?.error ?? 'Noe gikk galt ved booking.');
      }
      // Ingen manuell state-oppdatering her — Realtime vil pushe endringen
    } catch (e) {
      alert('Nettverksfeil ved booking.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Ledige bord – neste 6 timer</h2>
        <small>
          Realtime: <code>{rtStatus}</code>
        </small>
      </div>

      {slots.length === 0 ? (
        <p>Ingen ledige bord i tidsrommet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {slots.map((s) => {
            const available = s.available; // felt fra DB
            const disabled = available <= 0 || pendingId === s.id;

            return (
              <li key={s.id} style={{ padding: '10px 0', borderTop: '1px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.venue}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {new Date(s.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{' '}
                      {new Date(s.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginRight: 8 }}>
                    <div>
                      ledige: <strong>{available}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {s.seats_taken}/{s.seats_total} opptatt
                    </div>
                  </div>

                  <button
                    onClick={() => bookOne(s.id)}
                    disabled={disabled}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #ccc',
                      background: disabled ? '#eee' : '#f5f5f5',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      minWidth: 120,
                    }}
                    aria-disabled={disabled}
                  >
                    {pendingId === s.id ? 'Booker…' : 'Book 1 sete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

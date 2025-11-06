'use client';

import { createClient } from '@supabase/supabase-js';
console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE KEY (short):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 15));


const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

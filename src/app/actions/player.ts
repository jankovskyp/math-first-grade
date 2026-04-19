'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function updatePlayerProfile(id: string, username: string, avatar: string) {
  if (!supabaseServiceKey) return { error: 'Chybí klíč SUPABASE_SERVICE_ROLE_KEY' };

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check uniqueness only when name is changing
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .ilike('username', username)
    .neq('id', id)
    .maybeSingle();

  if (existing) return { error: 'Tato přezdívka už někdo používá. Zkus jinou!' };

  const { error } = await supabase
    .from('players')
    .update({ username, avatar })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

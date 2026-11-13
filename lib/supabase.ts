import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lktglsxmulicoivjjfxf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_QiPB3Myv37XrZIRCuFxZTQ_Wx23rbvD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

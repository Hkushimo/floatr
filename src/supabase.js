import { createClient } from "@supabase/supabase-js";

const txtUrl = "https://jsixsqiotsqgpgmmhqgn.supabase.co";
const txtKey = "sb_publishable_m89s2f7TM2WVupQsRJhx7A_ljZOkBJ3";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || txtUrl;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || txtKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

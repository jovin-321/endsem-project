import { createClient } from '@supabase/supabase-js'

/*
  Supabase connection.

  The two values come from environment variables (see .env.example):

    VITE_SUPABASE_URL        – your project URL
    VITE_SUPABASE_ANON_KEY   – the public "anon" / "publishable" key

  Both are safe to ship in a browser app: what protects the data is
  Row Level Security inside the database (see supabase/schema.sql),
  not secrecy of this key.

  NEVER put the "service_role" / "secret" key in this app.

  If the variables are missing, `supabase` is null and the app falls back
  to saving in the browser only (the original MVP behaviour).
*/

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
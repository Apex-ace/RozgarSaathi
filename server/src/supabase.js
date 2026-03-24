import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rdlfnhkrwmkrkfrliywg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbGZuaGtyd21rcmtmcmxpeXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDg1NjAsImV4cCI6MjA4NzkyNDU2MH0.arES4u0Tea7lGqeeP_910_KimfxsScJ20Ad8zyQXwKQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gpomrugfulrrfbbjptaa.supabase.co";
const supabaseKey = "sb_publishable_Cw_b0FxQMdSNE7-kn-352w_Z7_1Kqdp";

export const supabase = createClient(supabaseUrl, supabaseKey); 
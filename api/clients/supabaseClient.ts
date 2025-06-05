import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hcrezrypvkmtzxldvsvm.supabase.co";
const supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjcmV6cnlwdmttdHp4bGR2c3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODMzNDAsImV4cCI6MjA2NDQ1OTM0MH0.WX4w8hLr2qeINW5Gr14cmQn-cP-ml9PhpHXrd1Xgn5c";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

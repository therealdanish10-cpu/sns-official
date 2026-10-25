/**
 * SNS Official — Stitch n Style
 * Shared Supabase Client Configuration
 *
 * Requires @supabase/supabase-js UMD bundle loaded via jsDelivr CDN before this script.
 */

(function () {
  "use strict";

  const SUPABASE_URL = "https://afjhfgwwymfovhxjpbeb.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_FR5sI9rD_jtpc_d_bCNnpw_nc9aReam";

  let client = null;

  if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (err) {
      console.warn("Supabase client initialization failed:", err);
    }
  } else {
    console.warn("Supabase SDK not loaded; falling back to local data where applicable.");
  }

  // Export shared client for storefront, review page, and admin panel
  window.supabaseClient = client;
  window.SNS_SUPABASE = {
    client: client,
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    buckets: {
      products: "product-images",
      reviews: "review-photos"
    }
  };
})();

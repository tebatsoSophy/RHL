const { createClient } = require("@supabase/supabase-js");

// Service role key — server-side only, never expose to the frontend.
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
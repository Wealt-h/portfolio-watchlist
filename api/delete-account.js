import { createClient } from "@supabase/supabase-js";

// Deletes a user's account and all associated data. This must live server-side
// because deleting the actual auth user (their login credentials) requires
// Supabase's admin API and a SERVICE ROLE KEY, which must never be exposed to
// the client — anyone holding it could delete or modify any user's account.
//
// Required environment variables (set in Vercel):
//   REACT_APP_SUPABASE_URL    — same project URL already used by the frontend
//   SUPABASE_SERVICE_ROLE_KEY — the secret service role key from
//                                Supabase dashboard → Project Settings → API.
//                                NEVER the anon/public key.

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: "Server not configured for account deletion" });
  }

  // The client sends the user's own access token (from their active session).
  // We verify it server-side rather than trusting a userId passed in the body —
  // otherwise anyone could pass an arbitrary userId and delete someone else's
  // account.
  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) return res.status(401).json({ error: "Missing access token" });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify the token and get the real user id it belongs to.
  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData?.user?.id) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  const userId = userData.user.id;

  try {
    // Delete all rows owned by this user across every table the app writes to.
    const tables = ["watchlist", "trades", "cash_accounts", "properties", "alerts", "user_preferences"];
    for (const table of tables) {
      const { error } = await adminClient.from(table).delete().eq("user_id", userId);
      if (error) console.error(`delete-account: failed clearing ${table}:`, error.message);
      // Continue even if one table fails, so a single bad row doesn't block
      // the rest of the deletion — the auth user removal below is the part
      // that must not silently fail.
    }

    // Delete the actual login/auth record last, once data cleanup is done.
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return res.status(500).json({ error: deleteUserError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

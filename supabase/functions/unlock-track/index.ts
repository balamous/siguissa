// Unlock a track for HQ download. Costs credits unless user is premium or
// the track is already unlocked.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNLOCK_COST = 3;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { trackId } = await req.json().catch(() => ({}));
    if (!trackId) return json({ error: "trackId required" }, 400);

    const { data: track, error: tErr } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", trackId)
      .eq("user_id", userId)
      .single();
    if (tErr || !track) return json({ error: "Track not found" }, 404);

    if (track.is_unlocked) return json({ track, cost: 0, balance: null });

    const { data: prof } = await supabase
      .from("profiles")
      .select("credits, is_premium")
      .eq("id", userId)
      .single();

    if (!prof) return json({ error: "Profile not found" }, 404);

    const cost = prof.is_premium ? 0 : UNLOCK_COST;
    if (prof.credits < cost) {
      return json({ error: "Insufficient credits", required: cost, balance: prof.credits }, 402);
    }

    if (cost > 0) {
      await supabase
        .from("profiles")
        .update({ credits: prof.credits - cost })
        .eq("id", userId);
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -cost,
        reason: "download",
        metadata: { track_id: trackId },
      });
    }

    const { data: updated } = await supabase
      .from("tracks")
      .update({ is_unlocked: true })
      .eq("id", trackId)
      .select()
      .single();

    return json({ track: updated, cost, balance: prof.credits - cost });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

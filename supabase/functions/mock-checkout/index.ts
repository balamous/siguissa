// Mock checkout: grants credits or premium subscription instantly.
// Replace with real Stripe webhook once payments are enabled in this workspace.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PACKS: Record<string, { credits: number; price: number; label: string }> = {
  starter: { credits: 60, price: 5, label: "Starter Pack" },
  creator: { credits: 150, price: 10, label: "Creator Pack" },
  pro: { credits: 360, price: 20, label: "Pro Pack" },
};

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

    const { type, packId } = await req.json().catch(() => ({}));

    const { data: prof } = await supabase
      .from("profiles")
      .select("credits, is_premium")
      .eq("id", userId)
      .single();
    if (!prof) return json({ error: "Profile not found" }, 404);

    if (type === "subscription") {
      await supabase
        .from("profiles")
        .update({ is_premium: true, credits: prof.credits + 500 })
        .eq("id", userId);
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: 500,
        reason: "subscription",
        metadata: { plan: "premium_monthly" },
      });
      return json({ ok: true, premium: true });
    }

    const pack = PACKS[packId];
    if (!pack) return json({ error: "Unknown pack" }, 400);

    await supabase
      .from("profiles")
      .update({ credits: prof.credits + pack.credits })
      .eq("id", userId);
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: pack.credits,
      reason: "purchase",
      metadata: { pack: packId, price: pack.price },
    });

    return json({ ok: true, added: pack.credits });
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

// Mock AI music generation. Deducts credits, simulates delay, then writes the
// track row with a sample audio URL. Designed so the implementation can be
// swapped for a real provider (MusicGen / Suno) without touching the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERATION_COST = 5;

// Pool of royalty-free sample tracks. SoundHelix serves audio with permissive CORS,
// so the <audio> element can load and play them in the browser without issues.
// In production this is replaced by the AI provider's returned URL.
const SAMPLE_TRACKS = [
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration: 372 },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration: 425 },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", duration: 466 },
  { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3", duration: 412 },
];

const COVERS = ["cover-1", "cover-2", "cover-3"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user from JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { prompt, genre, mood, tempo, language, title } = body ?? {};

    if (!prompt || typeof prompt !== "string" || prompt.length < 3 || prompt.length > 500) {
      return json({ error: "Prompt must be 3-500 characters" }, 400);
    }

    // Check credits (use service role to bypass RLS for the read+update atomicity)
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("credits, is_premium")
      .eq("id", userId)
      .single();

    if (profErr) return json({ error: "Profile not found" }, 404);

    const cost = prof.is_premium ? Math.ceil(GENERATION_COST / 2) : GENERATION_COST;
    if ((prof.credits ?? 0) < cost) {
      return json({ error: "Insufficient credits", required: cost, balance: prof.credits }, 402);
    }

    // Deduct credits
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ credits: (prof.credits ?? 0) - cost })
      .eq("id", userId);
    if (updErr) return json({ error: "Failed to deduct credits" }, 500);

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -cost,
      reason: "generation",
      metadata: { prompt: prompt.slice(0, 200), genre, mood },
    });

    // Simulate provider latency (short, so UX feels snappy in mock mode)
    await new Promise((r) => setTimeout(r, 1500));

    const sample = SAMPLE_TRACKS[Math.floor(Math.random() * SAMPLE_TRACKS.length)];
    const cover = COVERS[Math.floor(Math.random() * COVERS.length)];
    const safeTitle = (title && String(title).trim()) || `${genre ?? "Track"} — ${prompt.slice(0, 28)}`;

    const { data: track, error: trackErr } = await supabase
      .from("tracks")
      .insert({
        user_id: userId,
        title: safeTitle.slice(0, 120),
        prompt,
        genre,
        mood,
        tempo,
        language,
        duration_seconds: sample.duration,
        audio_url: sample.url,
        cover_url: cover,
        status: "ready",
        is_unlocked: false,
      })
      .select()
      .single();

    if (trackErr) return json({ error: trackErr.message }, 500);

    return json({ track, cost, balance: (prof.credits ?? 0) - cost });
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

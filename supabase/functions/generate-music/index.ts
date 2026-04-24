// Real AI music generation via sunoapi.org. Submits the prompt, polls until the
// track is ready, then writes the row with the final audio URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERATION_COST = 5;
const SUNO_BASE = "https://api.sunoapi.org/api/v1";
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 45; // ~3 minutes max
const COVERS = ["cover-1", "cover-2", "cover-3"];

type SunoTrack = {
  id: string;
  audioUrl?: string;
  streamAudioUrl?: string;
  imageUrl?: string;
  title?: string;
  tags?: string;
  duration?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
    if (!SUNO_API_KEY) return json({ error: "Music provider not configured" }, 500);

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

    const body = await req.json().catch(() => ({}));
    const { prompt, genre, mood, tempo, language, title } = body ?? {};

    if (!prompt || typeof prompt !== "string" || prompt.length < 3 || prompt.length > 500) {
      return json({ error: "Prompt must be 3-500 characters" }, 400);
    }

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

    // ---------- Submit job to Suno ----------
    const styleParts = [genre, mood, tempo, language].filter(Boolean).join(", ");
    const safeTitle = (title && String(title).trim()) || `${genre ?? "Track"} — ${prompt.slice(0, 28)}`;

    const submitRes = await fetch(`${SUNO_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUNO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: false,
        model: "V4_5",
        prompt,
        style: styleParts || "Pop",
        title: safeTitle.slice(0, 80),
        callBackUrl: "https://example.com/none", // required field; we poll instead
      }),
    });

    const submitData = await submitRes.json().catch(() => ({}));
    if (!submitRes.ok || submitData?.code !== 200 || !submitData?.data?.taskId) {
      const msg = submitData?.msg || `Suno submit failed (${submitRes.status})`;
      console.error("Suno submit error:", submitRes.status, submitData);
      return json({ error: msg }, 502);
    }
    const taskId: string = submitData.data.taskId;

    // ---------- Deduct credits up-front (will refund on failure) ----------
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ credits: (prof.credits ?? 0) - cost })
      .eq("id", userId);
    if (updErr) return json({ error: "Failed to deduct credits" }, 500);

    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -cost,
      reason: "generation",
      metadata: { prompt: prompt.slice(0, 200), genre, mood, taskId },
    });

    // ---------- Poll for completion ----------
    let suno: SunoTrack | null = null;
    let lastStatus = "PENDING";
    let lastErr: string | null = null;

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const pollRes = await fetch(`${SUNO_BASE}/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${SUNO_API_KEY}` },
      });
      const pollData = await pollRes.json().catch(() => ({}));
      if (!pollRes.ok || pollData?.code !== 200) {
        console.warn("Suno poll non-200:", pollRes.status, pollData);
        continue;
      }

      const status: string = pollData.data?.status ?? "PENDING";
      lastStatus = status;
      lastErr = pollData.data?.errorMessage ?? null;
      const tracks: SunoTrack[] = pollData.data?.response?.sunoData ?? [];

      if (status === "SUCCESS" && tracks.length > 0) {
        // Pick the first track that has an audio URL
        suno = tracks.find((t) => t.audioUrl || t.streamAudioUrl) ?? tracks[0];
        break;
      }
      if (["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "CALLBACK_EXCEPTION", "SENSITIVE_WORD_ERROR"].includes(status)) {
        break;
      }
    }

    if (!suno || !(suno.audioUrl || suno.streamAudioUrl)) {
      // Refund
      await supabase
        .from("profiles")
        .update({ credits: prof.credits ?? 0 })
        .eq("id", userId);
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: cost,
        reason: "refund_failed_generation",
        metadata: { taskId, status: lastStatus, error: lastErr },
      });
      return json({
        error: lastErr || `Generation ${lastStatus === "SUCCESS" ? "returned no audio" : `failed (${lastStatus})`}`,
      }, 502);
    }

    const cover = COVERS[Math.floor(Math.random() * COVERS.length)];
    const audioUrl = suno.audioUrl || suno.streamAudioUrl!;
    const duration = Math.round(suno.duration ?? 120);

    const { data: track, error: trackErr } = await supabase
      .from("tracks")
      .insert({
        user_id: userId,
        title: (suno.title || safeTitle).slice(0, 120),
        prompt,
        genre,
        mood,
        tempo,
        language,
        duration_seconds: duration,
        audio_url: audioUrl,
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
    console.error("generate-music fatal:", msg);
    return json({ error: msg }, 500);
  }
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

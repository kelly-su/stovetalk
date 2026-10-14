import { useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import type { Recipe } from "./types";
import ReviewScreen from "./ReviewScreen";
import CookingScreen from "./CookingScreen";

type Screen = "upload" | "review" | "cooking";

export default function App() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [video, setVideo] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<"idle" | "transcribing" | "building">("idle");
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const loading = stage !== "idle";

  async function handleSubmit() {
    if (!video) return;
    setError(null);

    try {
      // Stage 1: transcribe
      setStage("transcribing");
      const form = new FormData();
      form.append("video", video);
      const res1 = await fetch("http://localhost:8000/transcribe", { method: "POST", body: form });
      const data1 = await res1.json();
      if (!res1.ok) throw new Error(data1.detail ?? "Something went wrong.");

      // Stage 2: build the recipe
      setStage("building");
      const res2 = await fetch("http://localhost:8000/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: data1.transcript, description }),
      });
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2.detail ?? "Something went wrong.");

      setRecipe(data2.recipe);
      setScreen("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStage("idle");
    }
  }

  return (
    <main className="app">
      <h1 className="wordmark">Stovetalk</h1>

      {screen === "upload" && (
        <>
          <p className="intro">Turn a cooking video into a recipe you can cook along with, hands-free.</p>

          <label>
            Cooking video
            <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
          </label>

          <label>
            Caption or description (optional, often has measurements)
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the recipe caption or pinned comment here"
            />
          </label>

          <button className="primary" onClick={handleSubmit} disabled={!video || loading}>
            {loading ? "Working…" : "Get recipe"}
          </button>

          {loading && (
            <div className="loading">
              <p className="loading-label">
                {stage === "transcribing"
                  ? "Step 1 of 2 · Transcribing your video…"
                  : "Step 2 of 2 · Building your recipe…"}
              </p>
              <div className="loading-track">
                <div className={`loading-fill ${stage}`} />
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </>
      )}

      {screen === "review" && recipe && (
        <ReviewScreen
          recipe={recipe}
          onChange={setRecipe}
          onStartCooking={() => setScreen("cooking")}
          onBack={() => setScreen("upload")}
        />
      )}

      {screen === "cooking" && recipe && (
        <ConversationProvider>
          <CookingScreen recipe={recipe} onExit={() => setScreen("review")} />
        </ConversationProvider>
      )}
    </main>
  );
}
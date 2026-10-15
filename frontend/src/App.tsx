import { useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import type { Recipe } from "./types";
import ReviewScreen from "./ReviewScreen";
import CookingScreen from "./CookingScreen";

import { api, getPasscode, setPasscode } from "./api";

type Screen = "upload" | "review" | "cooking";

export default function App() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [video, setVideo] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<"idle" | "transcribing" | "building">("idle");
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const [unlocked, setUnlocked] = useState(() => getPasscode() !== "");
  const [code, setCode] = useState("");

  const loading = stage !== "idle";

  async function unlock() {
    setPasscode(code);
    try {
      await api("/check");
      setUnlocked(true);
      setError(null);
    } catch {
      setPasscode("");
      setError("That passcode didn't work.");
    }
  }

  async function handleSubmit() {
    if (!video) return;
    setError(null);

    try {
      setStage("transcribing");
      const form = new FormData();
      form.append("video", video);
      const data1 = await api("/transcribe", { method: "POST", body: form });

      setStage("building");
      const data2 = await api("/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: data1.transcript, description }),
      });

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

      {!unlocked ? (
        <>
          <p className="intro">Enter the passcode to try Stovetalk:</p>
          <label>
            Passcode
            <input type="password" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button className="primary" onClick={unlock} disabled={!code}>
            Continue
          </button>
          {error && <p className="error">{error}</p>}
        </>
      ) : (
        <>
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
        </>
      )}
    </main>
  );
}
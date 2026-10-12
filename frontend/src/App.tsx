import { useState } from "react";
import type { Recipe } from "./types";
import ReviewScreen from "./ReviewScreen";

type Screen = "upload" | "review" | "cooking";

export default function App() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [video, setVideo] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  async function handleSubmit() {
    if (!video) return;
    setLoading(true);
    setError(null);

    const form = new FormData();
    form.append("video", video);
    form.append("description", description);

    try {
      const res = await fetch("http://localhost:8000/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Something went wrong.");
      setRecipe(data.recipe);
      setScreen("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1>Stovetalk</h1>

      {screen === "upload" && (
        <>
          <p>Upload a cooking video to turn it into a voice-guided recipe.</p>

          <label>
            Cooking video
            <br />
            <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
          </label>

          <br /><br />

          <label>
            Caption or description (optional, often has measurements)
            <br />
            <textarea
              rows={6}
              style={{ width: "100%" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the recipe caption or pinned comment here"
            />
          </label>

          <br /><br />

          <button onClick={handleSubmit} disabled={!video || loading}>
            {loading ? "Building your recipe… (this can take a minute)" : "Get recipe"}
          </button>

          {error && <p style={{ color: "crimson" }}>{error}</p>}
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
        <section>
          <p>Cooking Mode coming next.</p>
          <button onClick={() => setScreen("review")}>← Back to recipe</button>
        </section>
      )}
    </main>
  );
}
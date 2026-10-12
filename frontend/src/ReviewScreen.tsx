import type { Recipe, Source } from "./types";

type Props = {
  recipe: Recipe;
  onChange: (recipe: Recipe) => void;
  onStartCooking: () => void;
  onBack: () => void;
};

const SOURCE_LABELS: Record<Source, string> = {
  spoken: "from video",
  description: "from caption",
  none: "not in video",
  user: "added by you",
};

export default function ReviewScreen({ recipe, onChange, onStartCooking, onBack }: Props) {
  function updateQuantity(index: number, value: string) {
    const filled = value.trim() !== "";
    const ingredients = recipe.ingredients.map((ing, i) =>
      i === index
        ? { ...ing, quantity: filled ? value : "not specified", source: (filled ? "user" : "none") as Source }
        : ing
    );
    onChange({ ...recipe, ingredients });
  }

  function updateStep(index: number, instruction: string) {
    const steps = recipe.steps.map((step, i) => (i === index ? { ...step, instruction } : step));
    onChange({ ...recipe, steps });
  }

  const missingCount = recipe.ingredients.filter((ing) => ing.quantity === "not specified").length;

  return (
    <section>
      <button onClick={onBack}>← Use a different video</button>

      <input
        value={recipe.title}
        onChange={(e) => onChange({ ...recipe, title: e.target.value })}
        style={{ display: "block", width: "100%", fontSize: "1.5rem", margin: "16px 0" }}
      />

      {missingCount > 0 && (
        <p>
          {missingCount} amount{missingCount > 1 ? "s weren't" : " wasn't"} in the video or caption. Fill in
          what you know, or leave blank to cook to taste.
        </p>
      )}

      <h2>Ingredients</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {recipe.ingredients.map((ing, i) => {
          const missing = ing.quantity === "not specified";
          return (
            <li key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ flex: 1 }}>{ing.name}</span>
              <input
                value={missing ? "" : ing.quantity}
                placeholder="not specified"
                onChange={(e) => updateQuantity(i, e.target.value)}
                style={{ width: 140, border: missing ? "2px solid orange" : undefined }}
              />
              <small style={{ width: 100, color: "gray" }}>{SOURCE_LABELS[ing.source]}</small>
            </li>
          );
        })}
      </ul>

      <h2>Steps</h2>
      <ol>
        {recipe.steps.map((step, i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <textarea
              rows={2}
              value={step.instruction}
              onChange={(e) => updateStep(i, e.target.value)}
              style={{ width: "100%" }}
            />
          </li>
        ))}
      </ol>

      <button onClick={onStartCooking} style={{ fontSize: "1.1rem", padding: "8px 16px" }}>
        Start Cooking
      </button>
    </section>
  );
}
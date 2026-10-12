import { useEffect, useState } from "react";
import type { Recipe } from "./types";

type Props = {
  recipe: Recipe;
  onExit: () => void;
};

export default function CookingScreen({ recipe, onExit }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const total = recipe.steps.length;
  const step = recipe.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;

  function next() {
    setCurrentStep((s) => Math.min(s + 1, total - 1));
  }

  function back() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  // Arrow keys also work, handy for testing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section>
      <button onClick={onExit}>← Back to recipe</button>

      <p style={{ fontSize: "1.1rem", color: "gray", marginTop: 24 }}>
        Step {currentStep + 1} of {total}
      </p>

      <p style={{ fontSize: "2rem", lineHeight: 1.4, margin: "8px 0 24px" }}>{step.instruction}</p>

      {step.ingredients.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.2rem" }}>For this step</h2>
          <ul style={{ fontSize: "1.3rem", lineHeight: 1.6 }}>
            {step.ingredients.map((ing) => (
              <li key={ing.name}>
                {ing.amount === "not specified" ? `${ing.name} (to taste)` : `${ing.amount} ${ing.name}`}
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <button onClick={back} disabled={isFirst} style={{ fontSize: "1.3rem", padding: "12px 24px" }}>
          Back
        </button>
        <button onClick={isLast ? onExit : next} style={{ fontSize: "1.3rem", padding: "12px 24px" }}>
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </section>
  );
}
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
            <button className="link" onClick={onBack}>← Use a different video</button>

            <input
                className="title-input"
                value={recipe.title}
                onChange={(e) => onChange({ ...recipe, title: e.target.value })}
            />

            {missingCount > 0 && (
                <p className="note">
                    {missingCount} amount{missingCount > 1 ? "s weren't" : " wasn't"} in the video or caption. Fill in
                    what you know, or leave blank to cook to taste.
                </p>
            )}

            <h2>Ingredients</h2>
            <ul className="ingredients">
                {recipe.ingredients.map((ing, i) => {
                    const missing = ing.quantity === "not specified";
                    return (
                        <li key={i}>
                            <span className="name">{ing.name}</span>
                            <input
                                className={missing ? "missing" : ""}
                                value={missing ? "" : ing.quantity}
                                placeholder="add amount"
                                onChange={(e) => updateQuantity(i, e.target.value)}
                            />
                            <small className="source">{SOURCE_LABELS[ing.source]}</small>
                        </li>
                    );
                })}
            </ul>

            <h2>Steps</h2>
            <ol className="steps">
                {recipe.steps.map((step, i) => (
                    <li key={i}>
                        <textarea rows={2} value={step.instruction} onChange={(e) => updateStep(i, e.target.value)} />
                    </li>
                ))}
            </ol>

            <button className="primary" onClick={onStartCooking}>Start cooking</button>
        </section>
    );
}
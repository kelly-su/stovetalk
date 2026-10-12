export type Source = "spoken" | "description" | "none" | "user";

export type Ingredient = { name: string; quantity: string; source: Source };
export type StepIngredient = { name: string; amount: string };
export type Step = { instruction: string; ingredients: StepIngredient[] };
export type Recipe = { title: string; ingredients: Ingredient[]; steps: Step[] };
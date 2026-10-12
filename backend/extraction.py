import os
import json
from typing import Literal
from dotenv import load_dotenv
from pydantic import BaseModel
from google import genai
from google.genai import errors
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
]


# --- The shape we want back ---
class Ingredient(BaseModel):
    name: str
    quantity: str  # e.g. "2 tbsp", or "not specified"
    source: Literal["spoken", "description", "none"]

class StepIngredient(BaseModel):
    name: str    # must match a name in the main ingredient list
    amount: str  # amount used in THIS step, or "not specified"

class Step(BaseModel):
    instruction: str
    ingredients: list[StepIngredient]


class Recipe(BaseModel):
    title: str
    ingredients: list[Ingredient]
    steps: list[Step]


# --- The rules for the model ---
INSTRUCTIONS = """
You convert cooking video transcripts into structured recipes.

You are given:
1. TRANSCRIPT: what the creator said in the video.
2. DESCRIPTION: optional caption or comment text, often containing measurements.

Sources and quantities:
- Take the steps and their order mainly from the TRANSCRIPT.
- Take quantities from the DESCRIPTION first, then the TRANSCRIPT.
- If they disagree on a quantity, use the DESCRIPTION.
- Set "source" to where the quantity came from: "description", "spoken", or "none".
- If no quantity is given anywhere, set quantity to "not specified" and source to "none".
- NEVER guess or invent a quantity, ingredient, or step that is not in the inputs.

Ingredients:
- List each ingredient once in the main ingredient list, with the TOTAL quantity for the whole recipe.

Steps:
- Ignore filler (greetings, "like and subscribe", jokes).
- Each step should have one main action and be short enough to say aloud in about 10 seconds.
- Split long steps into multiple steps.
- Merge trivial follow-up actions into the step before them instead of making them their own step.
  Examples: "remove and set aside", "transfer to a plate", "turn off the heat", "let it rest briefly".
- Keep a cooking or waiting time in the same step as the action that starts it
  (e.g. "Put the potato in the air fryer at 200°C for 50 minutes").
- Use the fewest steps possible while keeping each step short enough to say aloud.
- Write steps as clear, direct instructions someone can follow while cooking.
"""

def clean_recipe(recipe: Recipe) -> Recipe:
    # A missing quantity always has no source
    for ing in recipe.ingredients:
        if ing.quantity.strip().lower() == "not specified":
            ing.source = "none"
    return recipe

def extract_recipe(transcript: str, description: str = "") -> Recipe:
    prompt = f"{INSTRUCTIONS}\n\nTRANSCRIPT:\n{transcript}\n\nDESCRIPTION:\n{description or '(none provided)'}"

    for model in MODELS:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=Recipe,
                    temperature=0,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            print(f"Used model: {model}")
            return clean_recipe(response.parsed)
        except errors.ServerError as e:
            print(f"{model} unavailable ({e.code}), trying next...")

    raise RuntimeError("All models are unavailable right now. Try again later.")


# --- Run directly to test with local files ---
if __name__ == "__main__":
    with open("transcript.txt") as f:
        transcript = f.read()

    description = ""
    if os.path.exists("description.txt"):
        with open("description.txt") as f:
            description = f.read()

    recipe = extract_recipe(transcript, description)

    print(json.dumps(recipe.model_dump(), indent=2, ensure_ascii=False))
    with open("recipe.json", "w", encoding="utf-8") as out:
        json.dump(recipe.model_dump(), out, indent=2, ensure_ascii=False)
# Stovetalk

Stovetalk lets you cook along with a recipe video without touching your screen. It turns the video into a step-by-step recipe, then reads it to you and answers questions while you cook.

## Why I built it

I built Stovetalk to make cooking from short recipe videos easier. They're a great way to discover recipes, but awkward to actually cook from: you replay the video, scrub back to catch a measurement, and end up tapping your phone with messy hands. I wanted to see whether voice could fix that, and to build something with the ElevenLabs platform along the way.

## How it works

1. **Upload** a cooking video, and optionally paste the post's caption. Creators often put measurements there instead of saying them out loud.
2. **Transcribe.** The backend sends the video to ElevenLabs Scribe to get a transcript.
3. **Extract.** Gemini turns the transcript and caption into a structured recipe. If an amount isn't given anywhere, it's marked "not specified" rather than guessed.
4. **Review.** You see the recipe before cooking, including where each amount came from (the video, the caption, or you). Missing amounts are highlighted so you can fill them in.
5. **Cook.** Cooking Mode shows one step at a time. Start voice, and an ElevenLabs agent reads each step aloud. You can say "next," "go back," "repeat," or ask "how much garlic?" and it answers from the recipe.

## Tech stack

| Part | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Python, FastAPI |
| Transcription | ElevenLabs Scribe |
| Recipe extraction | Google Gemini (structured JSON output) |
| Voice assistant | ElevenLabs Agents with client tools |

## Design decisions

- **The AI shouldn't make things up.** Missing quantities stay missing, every amount is tagged with its source, and you review the recipe before cooking. Simple rules, like "a missing amount has no source," are enforced in code rather than left to the model.
- **The agent only answers from the recipe.** It moves through steps and looks up ingredients by calling functions in the app, so the screen and the voice always agree. If an amount wasn't given, it says so instead of estimating.
- **Steps are written to be heard.** Each step has one main action and is short enough to say in a few seconds. Ingredients split across steps (say, two garlic cloves used one at a time) show the right amount for each step.
- **Amounts are read with every step.** The app attaches each step's amounts before the agent reads it, so you hear what you need without looking at the screen, and the voice always matches the recipe you reviewed.
- **Progress reflects what's actually happening.** Transcription and extraction are separate requests, so the loading screen switches stages only when each one really finishes.
- **Kept small on purpose.** No accounts, database, or link scraping. The app only ever needs one recipe at a time, and uploading a file works with any platform.

## What I learned

- Most short cooking videos don't say measurements out loud, which is why the caption box exists.
- Some creators list only the ingredients in the caption and hold back the full method, so the app can only be as complete as the video. It marks gaps instead of filling them in.
- Lighter models were noticeably less reliable at following the extraction rules, so they're only used as a last resort.
- Free-tier models are often overloaded, so extraction automatically falls back to other models when one is busy.
- The same input can produce slightly different recipes from run to run. A temperature of 0 helps, and the review step catches the rest.

## Running it locally

You'll need Python 3.10+, Node 18+, an [ElevenLabs](https://elevenlabs.io) account, and a [Google AI Studio](https://aistudio.google.com) API key.

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Add your keys to `backend/.env`:

```
ELEVENLABS_API_KEY=your_key
GEMINI_API_KEY=your_key
```

Then start the server:

```bash
uvicorn main:app --reload
```

You can try the API from the interactive docs at `/docs` on the address uvicorn prints.

### 2. Voice agent

Create an agent in the ElevenLabs Agents dashboard and give it a system prompt that keeps answers short and only states amounts that come from tool results. Then add four **client tools**, with "wait for response" turned on:

| Tool | Parameters | What it does |
| --- | --- | --- |
| `next_step` | none | Moves to the next step and returns it |
| `previous_step` | none | Moves back a step and returns it |
| `get_current_step` | none | Returns the current step without moving |
| `get_ingredient` | `ingredient_name` (string) | Returns the amount for the current step and the whole recipe |

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` with your agent's ID:

```
VITE_ELEVENLABS_AGENT_ID=your_agent_id
```

Then run:

```bash
npm run dev
```

Open the local address Vite prints, with the backend running in a separate terminal.

## Project structure

```
backend/
  main.py            API routes (/transcribe, /recipe)
  transcription.py   ElevenLabs Scribe call
  extraction.py      Gemini extraction, schema, and cleanup rules
frontend/src/
  App.tsx            Upload screen and screen switching
  ReviewScreen.tsx   Editable recipe review
  CookingScreen.tsx  Step-by-step Cooking Mode and voice agent tools
  types.ts           Shared recipe types
  index.css          Design tokens and styles
```

## What's next

- **Mobile.** People realistically cook with a phone or tablet on the counter. The first step would be deploying the backend and making the web app fully responsive, so the microphone works in a phone's browser. A React Native version could reuse most of the app logic.
- **Timers.** "Set a timer for ten minutes" is the most natural thing to ask mid-recipe.
- **On-screen text.** Some measurements only appear as text in the video. Reading them from video frames would cover what the transcript and caption miss.

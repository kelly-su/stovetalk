from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from transcription import transcribe
from extraction import extract_recipe

app = FastAPI()

# Allow the React dev server (Vite runs on port 5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/extract")
def extract(video: UploadFile = File(...), description: str = Form("")):
    data = video.file.read()
    transcript = transcribe(data, video.filename)

    # Catch videos with little or no speech (e.g. music-only Reels)
    if len(transcript.split()) < 15:
        raise HTTPException(
            status_code=422,
            detail="Couldn't hear enough speech in this video to build a recipe.",
        )

    recipe = extract_recipe(transcript, description)
    return {"transcript": transcript, "recipe": recipe.model_dump()}
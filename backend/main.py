import os
import secrets

import httpx
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware

from transcription import transcribe
from extraction import extract_recipe
from pydantic import BaseModel

load_dotenv()
APP_PASSCODE = os.getenv("APP_PASSCODE", "")
AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

def require_passcode(x_passcode: str = Header(default="")):
    if not APP_PASSCODE or not secrets.compare_digest(x_passcode, APP_PASSCODE):
        raise HTTPException(status_code=401, detail="Wrong passcode.")
    
app = FastAPI(dependencies=[Depends(require_passcode)])

# Allow the React dev server (Vite runs on port 5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecipeRequest(BaseModel):
    transcript: str
    description: str = ""


@app.post("/transcribe")
def transcribe_video(video: UploadFile = File(...)):
    data = video.file.read()
    transcript = transcribe(data, video.filename)
    if len(transcript.split()) < 15:
        raise HTTPException(
            status_code=422,
            detail="Couldn't hear enough speech in this video to build a recipe.",
        )
    return {"transcript": transcript}


@app.post("/recipe")
def build_recipe(req: RecipeRequest):
    recipe = extract_recipe(req.transcript, req.description)
    return {"recipe": recipe.model_dump()}

@app.get("/check")
def check():
    return {"ok": True}

@app.get("/agent-token")
def agent_token():
    res = httpx.get(
        "https://api.elevenlabs.io/v1/convai/conversation/token",
        params={"agent_id": AGENT_ID},
        headers={"xi-api-key": os.getenv("ELEVENLABS_API_KEY", "")},
        timeout=15,
    )
    if res.status_code != 200:
        print("ElevenLabs token error:", res.status_code, res.text)
        raise HTTPException(status_code=502, detail="Couldn't start a voice session.")
    return {"token": res.json()["token"]}
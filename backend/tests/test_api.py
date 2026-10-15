from fastapi.testclient import TestClient

import main
from extraction import Ingredient, Recipe, Step, StepIngredient

client = TestClient(main.app)
PASSCODE = {"X-Passcode": "test-passcode"}
FAKE_VIDEO = {"video": ("clip.mp4", b"not a real video", "video/mp4")}


# --- Passcode ---

def test_missing_passcode_is_rejected():
    assert client.get("/check").status_code == 401


def test_wrong_passcode_is_rejected():
    assert client.get("/check", headers={"X-Passcode": "nope"}).status_code == 401


def test_correct_passcode_is_accepted():
    res = client.get("/check", headers=PASSCODE)
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_other_routes_need_the_passcode_too():
    assert client.post("/recipe", json={"transcript": "hi"}).status_code == 401


# --- Transcription ---

def test_video_with_too_little_speech_is_rejected(monkeypatch):
    monkeypatch.setattr(main, "transcribe", lambda data, filename: "just music")
    res = client.post("/transcribe", headers=PASSCODE, files=FAKE_VIDEO)
    assert res.status_code == 422
    assert "speech" in res.json()["detail"]


def test_video_with_speech_returns_transcript(monkeypatch):
    spoken = "first slice the onion and then simmer it in the broth for about ten minutes until it is soft"
    monkeypatch.setattr(main, "transcribe", lambda data, filename: spoken)
    res = client.post("/transcribe", headers=PASSCODE, files=FAKE_VIDEO)
    assert res.status_code == 200
    assert res.json() == {"transcript": spoken}


# --- Recipe extraction ---

def test_recipe_passes_inputs_through_and_returns_recipe(monkeypatch):
    fake = Recipe(
        title="Toast",
        ingredients=[Ingredient(name="bread", quantity="2 slices", source="spoken")],
        steps=[Step(instruction="Toast the bread.", ingredients=[StepIngredient(name="bread", amount="2 slices")])],
    )
    received = {}

    def fake_extract(transcript, description):
        received["args"] = (transcript, description)
        return fake

    monkeypatch.setattr(main, "extract_recipe", fake_extract)
    res = client.post("/recipe", headers=PASSCODE, json={"transcript": "make toast", "description": "2 slices bread"})

    assert res.status_code == 200
    assert res.json()["recipe"]["title"] == "Toast"
    assert received["args"] == ("make toast", "2 slices bread")


# --- Voice session tokens ---

class FakeResponse:
    def __init__(self, status_code, body=None):
        self.status_code = status_code
        self.text = str(body)
        self._body = body

    def json(self):
        return self._body


def test_agent_token_is_returned(monkeypatch):
    monkeypatch.setattr(main.httpx, "get", lambda *args, **kwargs: FakeResponse(200, {"token": "abc123"}))
    res = client.get("/agent-token", headers=PASSCODE)
    assert res.status_code == 200
    assert res.json() == {"token": "abc123"}


def test_agent_token_error_is_hidden_from_the_browser(monkeypatch):
    monkeypatch.setattr(main.httpx, "get", lambda *args, **kwargs: FakeResponse(401, {"detail": "secret details"}))
    res = client.get("/agent-token", headers=PASSCODE)
    assert res.status_code == 502
    assert "secret" not in res.text
import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))


def transcribe(data: bytes, filename: str) -> str:
    result = client.speech_to_text.convert(
        file=(filename, data),
        model_id="scribe_v2",
    )
    return result.text
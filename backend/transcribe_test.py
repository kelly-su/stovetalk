
import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

with open("test_video.mp4", "rb") as f:
    result = client.speech_to_text.convert(file=f, model_id="scribe_v2")

print(result.text)

with open("transcript.txt", "w") as out:
    out.write(result.text)
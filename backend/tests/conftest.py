import os

# Set fake settings before the app is imported, so tests never use real keys or the real passcode.
os.environ["APP_PASSCODE"] = "test-passcode"
os.environ["ELEVENLABS_API_KEY"] = "test-key"
os.environ["GEMINI_API_KEY"] = "test-key"
os.environ["ELEVENLABS_AGENT_ID"] = "test-agent"
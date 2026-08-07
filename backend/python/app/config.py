import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_PATH = os.environ.get("JOSHROB_DB", str(BASE_DIR / "data" / "joshrob.db"))

HOST = os.environ.get("JOSHROB_HOST", "0.0.0.0")
PORT = int(os.environ.get("JOSHROB_PYTHON_PORT", "5001"))
DEBUG = os.environ.get("JOSHROB_DEBUG", "1") == "1"

JWT_SECRET = os.environ.get("JOSHROB_JWT_SECRET", "joshrob-dev-secret-change-me")

# External GIS providers (OpenStreetMap ecosystem)
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
OSRM_URL = "https://router.project-osrm.org"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

USER_AGENT = "JoshRobAI/1.0 (student portfolio project)"

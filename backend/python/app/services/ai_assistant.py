import math
import re
from typing import Any

from app.services import gis

INTENT_GREETING = "greeting"
INTENT_NAVIGATE = "navigate"
INTENT_NEARBY = "nearby"
INTENT_WHERE_AM_I = "where_am_i"
INTENT_SOS = "sos"
INTENT_ROBOT = "robot"
INTENT_ROBOT_STATUS = "robot_status"
INTENT_ROUTE_STEP = "route_step"
INTENT_MAIN_MENU = "main_menu"
INTENT_FALLBACK = "fallback"

GREETINGS = [
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
    "how are you", "what's up", "yo",
]

SOS_PATTERNS = [
    r"(emergency|help me|call (for )?help|in danger|i('m| am) lost|lost my way|stuck|accident|i need help)",
    r"(sos|alert the authorities|police now)",
]

NAVIGATE_PATTERNS = [
    r"(navigate|take me|guide me|route|directions|how do i get|way to|go to|drive to|lead me|show me the way)\b",
]

NEARBY_PATTERNS = [
    r"(nearest|nearby|closest|find|around)",
    r"(hospital|clinic|police|station|fuel|gas|petrol|hotel|pharmacy|drugstore|restaurant|food)",
]

ROBOT_PATTERNS = {
    "forward": r"\b(forward|move forward|go forward|straight)\b",
    "backward": r"\b(backward|move back|reverse|back up)\b",
    "left": r"\b(turn left|go left|left)\b",
    "right": r"\b(turn right|go right|right)\b",
    "stop": r"\b(stop|halt|brake|park the robot)\b",
    "scan": r"\b(scan|explore|patrol|survey)\b",
}

ROBOT_STATUS_PATTERNS = [
    r"(robot status|robot battery|robot state|robot health|battery level)",
]

ROUTE_STEP_PATTERNS = [
    r"(next step|next turn|where do i go next|what now|turn by turn)",
]

PLACE_TYPES = {
    "hospital": ["hospital", "clinic"],
    "police": ["police", "police station"],
    "fuel": ["fuel", "gas", "petrol", "fuel station"],
    "hotel": ["hotel", "lodge", "inn"],
    "pharmacy": ["pharmacy", "drugstore"],
    "restaurant": ["restaurant", "food", "eat"],
}


def _extract_destination(text: str) -> str:
    """Pull the destination out of a navigation phrase."""
    cleaned = text.lower()
    for prefix in [
        "take me to", "navigate to", "guide me to", "go to", "drive to", "route to",
        "how do i get to", "way to", "directions to", "lead me to", "show me the way to",
    ]:
        if prefix in cleaned:
            dest = cleaned.split(prefix, 1)[1].strip()
            dest = re.sub(r"^(please|kindly)\s*", "", dest)
            dest = re.sub(r"\.+$", "", dest).strip()
            if dest:
                return dest.title()
    # last-resort: strip navigation verbs
    for token in ["navigate", "take me", "go to", "route", "directions", "how do i get"]:
        cleaned = cleaned.replace(token, " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .!?")
    return cleaned.title() if cleaned else ""


def _detect_place_type(text: str) -> str:
    for place_type, keywords in PLACE_TYPES.items():
        if any(k in text for k in keywords):
            return place_type
    return "hospital"


def _format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"about {int(seconds)} seconds"
    minutes = int(seconds / 60)
    if minutes < 60:
        return f"about {minutes} minutes"
    hours = minutes / 60
    return f"about {hours:.1f} hours"


def _format_distance(meters: float) -> str:
    if meters < 1000:
        return f"{int(meters)} metres"
    return f"{meters / 1000:.2f} kilometres"


def assist(message: str, user_id: int, context: dict[str, Any] | None = None) -> dict[str, Any]:
    context = context or {}
    text = " ".join(message.lower().split())

    if not text:
        return {"intent": INTENT_FALLBACK, "text": "I didn't catch that. Try asking me to navigate, or say \"help\"."}

    if any(g in text for g in GREETINGS):
        name = context.get("user_name", "friend")
        return {
            "intent": INTENT_GREETING,
            "text": (
                f"Hello {name}! I'm JoshRob, your AI navigation and safety assistant. "
                "I can guide you with directions, find nearby hospitals or fuel stations, "
                "control your robot, and call for help in an emergency. What do you need?"
            ),
        }

    if any(re.search(p, text) for p in SOS_PATTERNS):
        return {
            "intent": INTENT_SOS,
            "text": (
                "I'm activating the SOS protocol now. Hold steady — I'll locate you, contact your "
                "emergency contact and show the nearest help you can reach. Stay on the line with me."
            ),
        }

    # Navigation intent (before generic nearby so "navigate to nearest hospital" routes)
    if re.search("|".join(NAVIGATE_PATTERNS), text) or any(p in text for p in ["get to", "to the"]):
        destination = _extract_destination(message)
        return {
            "intent": INTENT_NAVIGATE,
            "destination": destination,
            "text": (
                f"Great, let's get you to {destination or 'your destination'}. "
                "I'll search the map and lay out the best route on your dashboard."
            ),
        }

    if re.search("|".join(ROBOT_STATUS_PATTERNS), text):
        return {
            "intent": INTENT_ROBOT_STATUS,
            "text": "Fetching live robot telemetry — battery, GPS and sensor readings from the ESP32 unit.",
        }

    if any(re.search(p, text) for p in ROUTE_STEP_PATTERNS):
        return {
            "intent": INTENT_ROUTE_STEP,
            "text": "I'll advance the turn-by-turn instructions to your next manoeuvre.",
        }

    if re.search("|".join(ROBOT_PATTERNS["stop"]), text) or "robot" in text:
        for cmd, pattern in ROBOT_PATTERNS.items():
            if re.search(pattern, text):
                return {
                    "intent": INTENT_ROBOT,
                    "robot_command": cmd,
                    "text": f"Commanding the robot to {cmd.replace('_', ' ')} now.",
                }
        return {"intent": INTENT_ROBOT, "robot_command": "scan", "text": "Scanning the area with the robot."}

    if any(re.search(p, text) for p in NEARBY_PATTERNS):
        place_type = _detect_place_type(text)
        return {
            "intent": INTENT_NEARBY,
            "place_type": place_type,
            "text": f"Searching for the nearest {place_type} around your location.",
        }

    if any(p in text for p in ["where am i", "my location", "my position", "locate me"]):
        return {"intent": INTENT_WHERE_AM_I, "text": "Pinning your live GPS position on the map now."}

    if any(p in text for p in ["menu", "what can you do", "options", "features"]):
        return {"intent": INTENT_MAIN_MENU, "text": (
            "Here's what I can do:\n"
            "• \"Navigate to Abuja city mall\" — route planning\n"
            "• \"Find nearest hospital\" — nearby places\n"
            "• \"Where am I?\" — live location\n"
            "• \"Move forward / Turn left\" — robot control\n"
            "• \"Emergency, I need help\" — SOS alert"
        )}

    return {
        "intent": INTENT_FALLBACK,
        "text": (
            "I'm not sure I understood that. You can say things like "
            "\"navigate to the stadium\", \"find nearest fuel station\", "
            "\"move the robot forward\", or \"help, I'm lost\"."
        ),
    }


def build_route_summary(route: dict, destination: str | None, lat: float | None, lng: float | None) -> str:
    """Turn a route response into a natural-language summary."""
    d = route.get("distance_m", 0)
    t = route.get("duration_s", 0)
    lines = [
        f"Route ready — {_format_distance(d)} • {_format_duration(t)} of driving time."
    ]
    steps = route.get("steps", [])
    if steps:
        lines.append("Here are your first moves:")
        for step in steps[:3]:
            name = step.get("name") or "unnamed road"
            lines.append(f"• {step.get('instruction', 'continue').replace('_', ' ').title()} onto {name}")
        if len(steps) > 3:
            lines.append(f"…and {len(steps) - 3} more. Say \"next step\" when you're ready.")
    if destination:
        lines.append(f"Destination: {destination}.")
    return "\n".join(lines)


def estimate_eta(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Rough driving ETA (seconds) using haversine + average urban speed."""
    km = gis.haversine_km(lat1, lng1, lat2, lng2)
    speed_kmh = 30.0
    return (km / speed_kmh) * 3600.0 if km > 0 else 0.0

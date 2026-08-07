from flask import Blueprint, jsonify, request

from app.database import get_db
from app.services import ai_assistant, gis

bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@bp.post("/assist")
def assist():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    context = data.get("context") or {}
    user_id = context.get("user_id")

    if not message:
        return jsonify({"error": "message is required."}), 400

    result = ai_assistant.assist(message, user_id, context)

    # Persist the conversation for the user history if authenticated.
    if user_id:
        db = get_db()
        db.execute(
            "INSERT INTO assistant_messages (user_id, role, content) VALUES (?, ?, ?)",
            (user_id, "user", message),
        )
        db.execute(
            "INSERT INTO assistant_messages (user_id, role, content) VALUES (?, ?, ?)",
            (user_id, "assistant", result["text"]),
        )
        db.commit()

    # Fulfil action intents that require live GIS data.
    if result["intent"] == ai_assistant.INTENT_NAVIGATE:
        destination = result.get("destination")
        lat = context.get("lat")
        lng = context.get("lng")
        if destination and lat and lng:
            try:
                geocoded = gis.retry(gis.geocode, destination, 1)
                if geocoded:
                    target = geocoded[0]
                    route = gis.retry(gis.get_route, lat, lng, target["lat"], target["lng"])
                    result["route"] = {
                        "destination": target["display_name"],
                        "dest_lat": target["lat"],
                        "dest_lng": target["lng"],
                        "distance_m": route["distance_m"],
                        "duration_s": route["duration_s"],
                        "geometry": route["geometry"],
                    }
                    result["text"] = ai_assistant.build_route_summary(route, target["display_name"], lat, lng)
                else:
                    result["text"] = f"I couldn't find \"{destination}\" on the map. Try a more specific name."
            except Exception as exc:  # noqa: BLE001
                result["text"] = (
                    f"I had trouble reaching the routing service: {exc}. "
                    "Check the map and try again in a moment."
                )

    if result["intent"] == ai_assistant.INTENT_NEARBY:
        lat = context.get("lat")
        lng = context.get("lng")
        if lat and lng:
            try:
                places = gis.retry(gis.find_nearby, lat, lng, result.get("place_type", "hospital"))
                result["nearby"] = places
                if places:
                    first = places[0]
                    result["text"] = (
                        f"The nearest {result.get('place_type')} is {first['name']} "
                        f"({gis.haversine_km(lat, lng, first['lat'], first['lng']):.1f} km away). "
                        "I've pinned it on your map."
                    )
                else:
                    result["text"] = f"No {result.get('place_type')} found within range of your location."
            except Exception as exc:  # noqa: BLE001
                result["text"] = f"Couldn't search nearby places right now: {exc}"

    if result["intent"] == ai_assistant.INTENT_WHERE_AM_I:
        lat = context.get("lat")
        lng = context.get("lng")
        if lat and lng:
            try:
                place = gis.retry(gis.reverse_geocode, lat, lng)
                result["address"] = place["address"]
                result["text"] = f"You are near {place['address']}. I've marked your position on the map."
            except Exception:  # noqa: BLE001
                result["text"] = f"Your live coordinates are {lat:.5f}, {lng:.5f}."

    if result["intent"] == ai_assistant.INTENT_ROUTE_STEP:
        steps = context.get("steps")
        step_index = int(context.get("step_index", 0))
        if isinstance(steps, list) and steps:
            if step_index < len(steps):
                step = steps[step_index]
                name = step.get("name") or "unnamed road"
                result["text"] = (
                    f"Move {step.get('instruction', 'continue').replace('_', ' ')} onto {name}, "
                    f"about {int(step.get('distance_m', 0))} metres."
                )
                result["step_index"] = step_index + 1
            else:
                result["text"] = "You've reached the end of your route. Nice work!"
                result["step_index"] = len(steps)

    return jsonify(result)


@bp.get("/history")
def history():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id query parameter is required."}), 400
    db = get_db()
    rows = db.execute(
        "SELECT role, content, created_at FROM assistant_messages "
        "WHERE user_id = ? ORDER BY id DESC LIMIT 50",
        (user_id,),
    ).fetchall()
    return jsonify({"messages": [dict(r) for r in rows]})

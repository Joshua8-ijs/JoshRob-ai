from flask import Blueprint, jsonify, request

from app.services import gis

bp = Blueprint("gis", __name__, url_prefix="/api/gis")


@bp.get("/geocode")
def geocode():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify({"error": "q query parameter is required."}), 400
    try:
        results = gis.retry(gis.geocode, query, 5)
        return jsonify({"results": results})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Geocoding failed: {exc}"}), 502


@bp.get("/reverse")
def reverse():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng query parameters are required."}), 400
    try:
        result = gis.retry(gis.reverse_geocode, lat, lng)
        return jsonify(result)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Reverse geocoding failed: {exc}"}), 502


@bp.get("/route")
def route():
    start_lat = request.args.get("start_lat", type=float)
    start_lng = request.args.get("start_lng", type=float)
    end_lat = request.args.get("end_lat", type=float)
    end_lng = request.args.get("end_lng", type=float)
    if None in (start_lat, start_lng, end_lat, end_lng):
        return jsonify({"error": "start_lat, start_lng, end_lat and end_lng are required."}), 400
    try:
        result = gis.retry(gis.get_route, start_lat, start_lng, end_lat, end_lng)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Routing failed: {exc}"}), 502


@bp.get("/nearby")
def nearby():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    place_type = (request.args.get("type") or "hospital").strip().lower()
    radius_m = request.args.get("radius", type=int) or 5000
    if lat is None or lng is None:
        return jsonify({"error": "lat and lng query parameters are required."}), 400
    try:
        results = gis.retry(gis.find_nearby, lat, lng, place_type, radius_m)
        return jsonify({"places": results})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Nearby search failed: {exc}"}), 502


@bp.get("/types")
def place_types():
    return jsonify({"types": [{"key": k, "label": v["label"]} for k, v in gis.AMENITY_TYPES.items()]})

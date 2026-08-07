import time
import urllib.parse

import requests

from app.config import NOMINATIM_URL, OSRM_URL, OVERPASS_URL, USER_AGENT

_HEADERS = {"User-Agent": USER_AGENT}


def geocode(query: str, limit: int = 5) -> list[dict]:
    """Search for a place by name using OpenStreetMap Nominatim."""
    params = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 1,
    }
    resp = requests.get(NOMINATIM_URL + "/search", params=params, headers=_HEADERS, timeout=15)
    resp.raise_for_status()
    results = []
    for item in resp.json():
        results.append(
            {
                "name": item.get("display_name", query),
                "display_name": item.get("display_name", ""),
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
                "type": item.get("type", ""),
                "category": item.get("category", ""),
            }
        )
    return results


def reverse_geocode(lat: float, lng: float) -> dict:
    """Return a human-readable address for a coordinate."""
    params = {"lat": lat, "lon": lng, "format": "json", "addressdetails": 1}
    resp = requests.get(NOMINATIM_URL + "/reverse", params=params, headers=_HEADERS, timeout=15)
    if resp.status_code != 200:
        return {"address": f"{lat:.5f}, {lng:.5f}"}
    data = resp.json()
    return {
        "address": data.get("display_name", f"{lat:.5f}, {lng:.5f}"),
        "house_number": data.get("address", {}).get("house_number", ""),
        "road": data.get("address", {}).get("road", ""),
        "city": data.get("address", {}).get("city", data.get("address", {}).get("town", "")),
        "state": data.get("address", {}).get("state", ""),
        "country": data.get("address", {}).get("country", ""),
    }


def get_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float):
    """Compute a driving route via OSRM. Returns geometry + summary."""
    coord_str = f"{start_lng:.6f},{start_lat:.6f};{end_lng:.6f},{end_lat:.6f}"
    params = {"overview": "full", "geometries": "geojson", "steps": "true", "alternatives": "false"}
    resp = requests.get(OSRM_URL + "/route/v1/driving/" + coord_str, params=params, headers=_HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("No route found between the given points.")
    route = data["routes"][0]
    return {
        "distance_m": route["distance"],
        "duration_s": route["duration"],
        "geometry": route.get("geometry", {"type": "LineString", "coordinates": []}),
        "steps": [
            {
                "instruction": step.get("maneuver", {}).get("modifier", ""),
                "name": step.get("name", ""),
                "distance_m": step.get("distance", 0),
                "duration_s": step.get("duration", 0),
            }
            for step in route.get("legs", [{}])[0].get("steps", [])
        ],
    }


AMENITY_TYPES = {
    "hospital": {"key": "amenity", "value": "hospital", "label": "Hospitals"},
    "police": {"key": "amenity", "value": "police", "label": "Police Stations"},
    "fuel": {"key": "amenity", "value": "fuel", "label": "Fuel Stations"},
    "hotel": {"key": "tourism", "value": "hotel", "label": "Hotels"},
    "pharmacy": {"key": "amenity", "value": "pharmacy", "label": "Pharmacies"},
    "restaurant": {"key": "amenity", "value": "restaurant", "label": "Restaurants"},
}


def find_nearby(lat: float, lng: float, place_type: str, radius_m: int = 5000, limit: int = 6) -> list[dict]:
    """Query Overpass API for nearby points of interest."""
    spec = AMENITY_TYPES.get(place_type.lower())
    if spec is None:
        raise ValueError(f"Unsupported place type: {place_type}")
    query = f"""
    [out:json][timeout:15];
    node(around:{radius_m},{lat:.6f},{lng:.6f})["{spec['key']}"="{spec['value']}"];
    out body 0{limit};
    """
    resp = requests.post(OVERPASS_URL, data={"data": query}, headers=_HEADERS, timeout=25)
    resp.raise_for_status()
    elements = resp.json().get("elements", [])
    results = []
    for el in elements[:limit]:
        tags = el.get("tags", {})
        results.append(
            {
                "name": tags.get("name") or tags.get("operator") or "Unnamed",
                "lat": el.get("lat"),
                "lng": el.get("lon"),
                "phone": tags.get("phone", ""),
                "opening_hours": tags.get("opening_hours", ""),
                "wheelchair": tags.get("wheelchair", ""),
            }
        )
    return results


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two coordinates in kilometres."""
    import math

    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def retry(fn, *args, attempts: int = 3, delay: float = 1.0, **kwargs):
    """Simple retry wrapper for flaky public GIS providers."""
    last_error = None
    for i in range(attempts):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(delay * (i + 1))
    raise last_error

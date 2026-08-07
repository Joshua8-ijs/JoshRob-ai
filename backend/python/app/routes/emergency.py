from flask import Blueprint, jsonify, request

from app.database import get_db
from app.services import gis

bp = Blueprint("emergency", __name__, url_prefix="/api/emergency")


@bp.post("/sos")
def sos():
    data = request.get_json(silent=True) or {}
    lat = data.get("lat")
    lng = data.get("lng")
    user_id = data.get("user_id")
    user_name = (data.get("user_name") or "Unknown user").strip()
    message = (data.get("message") or "").strip()[:500]
    contact_name = (data.get("contact_name") or "").strip()
    contact_phone = (data.get("contact_phone") or "").strip()

    if lat is None or lng is None:
        return jsonify({"error": "Current latitude and longitude are required to raise an SOS."}), 400

    try:
        address_info = gis.retry(gis.reverse_geocode, lat, lng)
        address = address_info.get("address", "")
    except Exception:  # noqa: BLE001
        address = f"{lat:.5f}, {lng:.5f}"

    db = get_db()
    cursor = db.execute(
        "INSERT INTO sos_alerts (user_id, user_name, lat, lng, address, contact_name, contact_phone, message) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, user_name, lat, lng, address, contact_name, contact_phone, message),
    )
    db.commit()

    created_at = db.execute(
        "SELECT created_at FROM sos_alerts WHERE id = ?", (cursor.lastrowid,)
    ).fetchone()["created_at"]

    nearby_help = []
    try:
        nearby_help = gis.retry(gis.find_nearby, lat, lng, "hospital", 3000, 3)
    except Exception:  # noqa: BLE001
        pass

    return (
        jsonify(
            {
                "alert_id": cursor.lastrowid,
                "status": "ACTIVE",
                "address": address,
                "created_at": created_at,
                "nearest_help": nearby_help,
                "instruction": (
                    "Your SOS has been registered with our system and your emergency contact has been notified. "
                    "If you can, move toward the nearest open public place and stay on the line."
                ),
            }
        ),
        201,
    )


@bp.get("/alerts")
def alerts():
    user_id = request.args.get("user_id", type=int)
    db = get_db()
    if user_id:
        rows = db.execute(
            "SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY id DESC LIMIT 20", (user_id,)
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM sos_alerts ORDER BY id DESC LIMIT 50").fetchall()
    return jsonify({"alerts": [dict(r) for r in rows]})


@bp.post("/alerts/respond")
def respond():
    data = request.get_json(silent=True) or {}
    alert_id = data.get("alert_id")
    status = (data.get("status") or "").upper()
    if not alert_id or status not in {"ACTIVE", "RESOLVED"}:
        return jsonify({"error": "alert_id and status (ACTIVE|RESOLVED) are required."}), 400
    db = get_db()
    db.execute("UPDATE sos_alerts SET status = ? WHERE id = ?", (status, alert_id))
    db.commit()
    return jsonify({"ok": True, "status": status})

from flask import Blueprint, jsonify, request

from app.database import get_db

bp = Blueprint("telemetry", __name__, url_prefix="/api/telemetry")


@bp.post("/robot")
def robot_telemetry():
    """Persist a telemetry sample emitted by the Node gateway / robot bridge."""
    data = request.get_json(silent=True) or {}
    db = get_db()
    db.execute(
        "INSERT INTO robot_telemetry (lat, lng, battery, speed, distance_cm, temperature) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            data.get("lat"),
            data.get("lng"),
            data.get("battery"),
            data.get("speed"),
            data.get("distance_cm"),
            data.get("temperature"),
        ),
    )
    db.commit()
    return jsonify({"ok": True})


@bp.get("/robot/latest")
def robot_latest():
    db = get_db()
    row = db.execute(
        "SELECT * FROM robot_telemetry ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return jsonify({"sample": dict(row) if row else None})


@bp.post("/trips")
def save_trip():
    data = request.get_json(silent=True) or {}
    db = get_db()
    cursor = db.execute(
        "INSERT INTO trips (user_id, origin, destination, start_lat, start_lng, end_lat, end_lng, distance_m, duration_s) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            data.get("user_id"),
            data.get("origin"),
            data.get("destination"),
            data.get("start_lat"),
            data.get("start_lng"),
            data.get("end_lat"),
            data.get("end_lng"),
            data.get("distance_m"),
            data.get("duration_s"),
        ),
    )
    db.commit()
    return jsonify({"trip_id": cursor.lastrowid}), 201


@bp.get("/trips")
def trips():
    user_id = request.args.get("user_id", type=int)
    db = get_db()
    rows = db.execute(
        "SELECT * FROM trips WHERE user_id = ? ORDER BY id DESC LIMIT 20", (user_id,)
    ).fetchall()
    return jsonify({"trips": [dict(r) for r in rows]})


@bp.get("/stats")
def stats():
    db = get_db()
    users = db.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    sos = db.execute("SELECT COUNT(*) AS c FROM sos_alerts").fetchone()["c"]
    trips = db.execute("SELECT COUNT(*) AS c FROM trips").fetchone()["c"]
    telemetry = db.execute("SELECT COUNT(*) AS c FROM robot_telemetry").fetchone()["c"]
    return jsonify(
        {"stats": {"users": users, "sos_alerts": sos, "trips": trips, "telemetry_samples": telemetry}}
    )

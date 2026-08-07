import re

from flask import Blueprint, jsonify, request

from app.database import get_db
from app.services.security import hash_password, verify_password

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _public_user(row) -> dict:
    return {
        "id": row["id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "emergency_contact": row["emergency_contact"],
        "emergency_phone": row["emergency_phone"],
        "created_at": row["created_at"],
    }


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    emergency_contact = (data.get("emergency_contact") or "").strip()
    emergency_phone = (data.get("emergency_phone") or "").strip()

    if not full_name or not email or not password:
        return jsonify({"error": "Full name, email and password are required."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Please provide a valid email address."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        return jsonify({"error": "An account with this email already exists."}), 409

    cursor = db.execute(
        "INSERT INTO users (full_name, email, password_hash, emergency_contact, emergency_phone) "
        "VALUES (?, ?, ?, ?, ?)",
        (full_name, email, hash_password(password), emergency_contact, emergency_phone),
    )
    db.commit()
    row = db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify({"user": _public_user(row)}), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    db = get_db()
    row = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if row is None or not verify_password(password, row["password_hash"]):
        return jsonify({"error": "Invalid email or password."}), 401

    return jsonify({"user": _public_user(row)})


@bp.get("/me")
def me():
    """Fetch a user by id passed as a query param (Node verifies the JWT)."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id query parameter is required."}), 400
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": _public_user(row)})


@bp.patch("/me")
def update_me():
    """Update emergency contact info (Node verifies the JWT)."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id query parameter is required."}), 400
    data = request.get_json(silent=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        return jsonify({"error": "User not found."}), 404

    emergency_contact = (data.get("emergency_contact") or row["emergency_contact"] or "").strip()
    emergency_phone = (data.get("emergency_phone") or row["emergency_phone"] or "").strip()
    db.execute(
        "UPDATE users SET emergency_contact = ?, emergency_phone = ? WHERE id = ?",
        (emergency_contact, emergency_phone, user_id),
    )
    db.commit()
    updated = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify({"user": _public_user(updated)})

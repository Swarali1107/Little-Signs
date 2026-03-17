"""
routes/auth.py — Signup, Login, /me
"""
from flask import Blueprint, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from bson import ObjectId
from datetime import datetime

from models import new_user

auth_bp = Blueprint("auth", __name__)
bcrypt  = Bcrypt()


def get_db():
    from app import mongo
    return mongo.db


# ── POST /api/auth/signup ─────────────────────────────────────────────────────
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    required = ["name", "email", "password", "role"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400

    role = data["role"].lower()
    if role not in ("learner", "parent", "teacher", "admin"):
        return jsonify({"error": "Invalid role"}), 400

    db = get_db()
    if db.users.find_one({"email": data["email"].lower().strip()}):
        return jsonify({"error": "Email already registered"}), 409

    hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    # Build role-specific extra fields
    extra = {}
    if role == "learner":
        extra["parent_email"] = data.get("parent_email", None)
        extra["age"]          = data.get("age", None)
        extra["total_score"]  = 0
        extra["streak"]       = 0
        extra["last_active"]  = datetime.utcnow()
    elif role == "parent":
        extra["children"] = []
    elif role == "teacher":
        extra["class_name"] = data.get("class_name", "My Class")

    user_doc = new_user(data["name"], data["email"], hashed, role, extra)
    result   = db.users.insert_one(user_doc)

    # If learner gave a parent_email, add them to parent's children list
    if role == "learner" and extra.get("parent_email"):
        db.users.update_one(
            {"email": extra["parent_email"].lower().strip(), "role": "parent"},
            {"$addToSet": {"children": data["email"].lower().strip()}}
        )

    token = create_access_token(identity=str(result.inserted_id))
    return jsonify({
        "token": token,
        "user": {
            "id":   str(result.inserted_id),
            "name": data["name"],
            "email": data["email"].lower().strip(),
            "role": role,
        }
    }), 201


# ── POST /api/auth/login ──────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Email and password required"}), 400

    db   = get_db()
    user = db.users.find_one({"email": data["email"].lower().strip()})

    if not user or not bcrypt.check_password_hash(user["password"], data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # Update last_active for learners
    if user["role"] == "learner":
        db.users.update_one({"_id": user["_id"]}, {"$set": {"last_active": datetime.utcnow()}})

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({
        "token": token,
        "user": {
            "id":    str(user["_id"]),
            "name":  user["name"],
            "email": user["email"],
            "role":  user["role"],
        }
    }), 200


# ── GET /api/auth/me ──────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    db      = get_db()
    user    = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id":    str(user["_id"]),
        "name":  user["name"],
        "email": user["email"],
        "role":  user["role"],
    }), 200

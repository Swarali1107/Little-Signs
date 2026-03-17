"""
routes/admin.py — Admin: full control panel
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime

admin_bp = Blueprint("admin", __name__)


def get_db():
    from app import mongo
    return mongo.db


def require_admin():
    from app import mongo
    uid  = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(uid)})
    if not user or user["role"] != "admin":
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


# ── GET /api/admin/stats ──────────────────────────────────────────────────────
@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def platform_stats():
    _, err = require_admin()
    if err: return err

    db = get_db()
    total_users    = db.users.count_documents({})
    learners       = db.users.count_documents({"role": "learner"})
    parents        = db.users.count_documents({"role": "parent"})
    teachers       = db.users.count_documents({"role": "teacher"})
    total_sessions = db.progress.count_documents({})
    correct        = db.progress.count_documents({"is_correct": True})
    accuracy       = round(correct / total_sessions * 100, 1) if total_sessions else 0

    return jsonify({
        "total_users":    total_users,
        "learners":       learners,
        "parents":        parents,
        "teachers":       teachers,
        "total_sessions": total_sessions,
        "platform_accuracy": accuracy,
    }), 200


# ── GET /api/admin/users ──────────────────────────────────────────────────────
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    _, err = require_admin()
    if err: return err

    db    = get_db()
    role  = request.args.get("role")
    query = {"role": role} if role else {}
    users = list(db.users.find(query, {"password": 0}).sort("created_at", -1).limit(100))

    out = []
    for u in users:
        out.append({
            "id":         str(u["_id"]),
            "name":       u["name"],
            "email":      u["email"],
            "role":       u["role"],
            "created_at": u.get("created_at", "").isoformat() if u.get("created_at") else None,
            "total_score": u.get("total_score", 0),
            "streak":     u.get("streak", 0),
        })
    return jsonify(out), 200


# ── DELETE /api/admin/user/<user_id> ──────────────────────────────────────────
@admin_bp.route("/user/<user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    _, err = require_admin()
    if err: return err

    db = get_db()
    db.users.delete_one({"_id": ObjectId(user_id)})
    db.progress.delete_many({"learner_id": user_id})
    db.class_members.delete_many({"learner_id": user_id})
    db.class_members.delete_many({"teacher_id": user_id})
    return jsonify({"message": "User deleted"}), 200


# ── PATCH /api/admin/user/<user_id>/role ──────────────────────────────────────
@admin_bp.route("/user/<user_id>/role", methods=["PATCH"])
@jwt_required()
def change_role(user_id):
    _, err = require_admin()
    if err: return err

    data = request.get_json()
    if "role" not in data or data["role"] not in ("learner", "parent", "teacher", "admin"):
        return jsonify({"error": "Invalid role"}), 400

    db = get_db()
    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": data["role"]}})
    return jsonify({"message": "Role updated"}), 200


# ── GET /api/admin/recent-activity ────────────────────────────────────────────
@admin_bp.route("/recent-activity", methods=["GET"])
@jwt_required()
def recent_activity():
    _, err = require_admin()
    if err: return err

    db      = get_db()
    records = list(db.progress.find({}).sort("session_date", -1).limit(20))

    out = []
    for r in records:
        out.append({
            "learner_email": r["learner_email"],
            "game_type":     r["game_type"],
            "letter":        r.get("letter"),
            "is_correct":    r["is_correct"],
            "session_date":  r["session_date"].isoformat(),
        })
    return jsonify(out), 200

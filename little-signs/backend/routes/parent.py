"""
routes/parent.py — Parent dashboard: see children's progress
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

parent_bp = Blueprint("parent", __name__)


def get_db():
    from app import mongo
    return mongo.db


def require_parent():
    from app import mongo
    uid  = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(uid)})
    if not user or user["role"] not in ("parent", "admin"):
        return None, (jsonify({"error": "Forbidden"}), 403)
    return user, None


# ── GET /api/parent/children ──────────────────────────────────────────────────
@parent_bp.route("/children", methods=["GET"])
@jwt_required()
def get_children():
    parent, err = require_parent()
    if err: return err

    db       = get_db()
    children = parent.get("children", [])

    result = []
    for email in children:
        child = db.users.find_one({"email": email, "role": "learner"})
        if not child:
            continue
        records = list(db.progress.find({"learner_id": str(child["_id"])}))
        total   = len(records)
        correct = sum(1 for r in records if r["is_correct"])
        accuracy = round(correct / total * 100, 1) if total else 0

        # Letters mastered (accuracy >= 80% with >= 3 attempts)
        from collections import Counter
        alpha   = [r for r in records if r["game_type"] == "alphabet" and r.get("letter")]
        l_att   = Counter(r["letter"] for r in alpha)
        l_cor   = Counter(r["letter"] for r in alpha if r["is_correct"])
        mastered = [
            l for l in l_att
            if l_att[l] >= 3 and (l_cor.get(l, 0) / l_att[l]) >= 0.8
        ]

        result.append({
            "id":            str(child["_id"]),
            "name":          child["name"],
            "email":         child["email"],
            "age":           child.get("age"),
            "total_score":   child.get("total_score", 0),
            "streak":        child.get("streak", 0),
            "total_attempts": total,
            "accuracy":      accuracy,
            "letters_mastered": sorted(mastered),
            "last_active":   child.get("last_active", "").isoformat() if child.get("last_active") else None,
        })

    return jsonify(result), 200


# ── GET /api/parent/child/<learner_id>/progress ────────────────────────────────
@parent_bp.route("/child/<learner_id>/progress", methods=["GET"])
@jwt_required()
def child_progress(learner_id):
    parent, err = require_parent()
    if err: return err

    db    = get_db()
    child = db.users.find_one({"_id": ObjectId(learner_id), "role": "learner"})
    if not child:
        return jsonify({"error": "Child not found"}), 404

    # Make sure this child belongs to the parent
    if child["email"] not in parent.get("children", []) and parent["role"] != "admin":
        return jsonify({"error": "Not your child"}), 403

    records = list(db.progress.find(
        {"learner_id": learner_id},
        {"_id": 0, "learner_id": 0}
    ).sort("session_date", -1).limit(50))

    for r in records:
        r["session_date"] = r["session_date"].isoformat()

    return jsonify({
        "child": {
            "name":        child["name"],
            "total_score": child.get("total_score", 0),
            "streak":      child.get("streak", 0),
        },
        "records": records,
    }), 200


# ── POST /api/parent/add-child ────────────────────────────────────────────────
@parent_bp.route("/add-child", methods=["POST"])
@jwt_required()
def add_child():
    parent, err = require_parent()
    if err: return err

    data = request.get_json()
    if "email" not in data:
        return jsonify({"error": "Child email required"}), 400

    db    = get_db()
    child = db.users.find_one({"email": data["email"].lower().strip(), "role": "learner"})
    if not child:
        return jsonify({"error": "No learner found with that email"}), 404

    db.users.update_one(
        {"_id": parent["_id"]},
        {"$addToSet": {"children": child["email"]}}
    )
    db.users.update_one(
        {"_id": child["_id"]},
        {"$set": {"parent_email": parent["email"]}}
    )

    return jsonify({"message": f"{child['name']} added to your children"}), 200

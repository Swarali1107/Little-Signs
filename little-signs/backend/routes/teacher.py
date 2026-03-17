"""
routes/teacher.py — Teacher dashboard: manage class, see all students
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from collections import Counter

teacher_bp = Blueprint("teacher", __name__)


def get_db():
    from app import mongo
    return mongo.db


def require_teacher():
    from app import mongo
    uid  = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(uid)})
    if not user or user["role"] not in ("teacher", "admin"):
        return None, (jsonify({"error": "Forbidden"}), 403)
    return user, None


# ── GET /api/teacher/students ─────────────────────────────────────────────────
@teacher_bp.route("/students", methods=["GET"])
@jwt_required()
def get_students():
    teacher, err = require_teacher()
    if err: return err

    db       = get_db()
    members  = list(db.class_members.find({"teacher_id": str(teacher["_id"])}))
    learner_ids = [m["learner_id"] for m in members]

    result = []
    for lid in learner_ids:
        learner = db.users.find_one({"_id": ObjectId(lid)})
        if not learner:
            continue

        records  = list(db.progress.find({"learner_id": lid}))
        total    = len(records)
        correct  = sum(1 for r in records if r["is_correct"])
        accuracy = round(correct / total * 100, 1) if total else 0

        alpha    = [r for r in records if r["game_type"] == "alphabet" and r.get("letter")]
        l_att    = Counter(r["letter"] for r in alpha)
        l_cor    = Counter(r["letter"] for r in alpha if r["is_correct"])
        mastered = [l for l in l_att if l_att[l] >= 3 and (l_cor.get(l, 0) / l_att[l]) >= 0.8]

        result.append({
            "id":               lid,
            "name":             learner["name"],
            "email":            learner["email"],
            "total_score":      learner.get("total_score", 0),
            "streak":           learner.get("streak", 0),
            "total_attempts":   total,
            "accuracy":         accuracy,
            "letters_mastered": len(mastered),
            "last_active":      learner.get("last_active", "").isoformat() if learner.get("last_active") else None,
        })

    # Sort by total_score desc
    result.sort(key=lambda x: x["total_score"], reverse=True)
    return jsonify(result), 200


# ── GET /api/teacher/class-summary ───────────────────────────────────────────
@teacher_bp.route("/class-summary", methods=["GET"])
@jwt_required()
def class_summary():
    teacher, err = require_teacher()
    if err: return err

    db      = get_db()
    members = list(db.class_members.find({"teacher_id": str(teacher["_id"])}))
    ids     = [m["learner_id"] for m in members]

    all_records = list(db.progress.find({"learner_id": {"$in": ids}}))

    total_sessions = len(all_records)
    correct        = sum(1 for r in all_records if r["is_correct"])
    class_accuracy = round(correct / total_sessions * 100, 1) if total_sessions else 0

    # Most practiced letters
    alpha   = [r for r in all_records if r["game_type"] == "alphabet" and r.get("letter")]
    top_letters = Counter(r["letter"] for r in alpha).most_common(5)

    # Hardest letters (lowest accuracy with >= 5 attempts)
    l_att = Counter(r["letter"] for r in alpha)
    l_cor = Counter(r["letter"] for r in alpha if r["is_correct"])
    hard  = sorted(
        [l for l in l_att if l_att[l] >= 5],
        key=lambda l: l_cor.get(l, 0) / l_att[l]
    )[:5]

    return jsonify({
        "class_name":      teacher.get("class_name", "My Class"),
        "total_students":  len(ids),
        "total_sessions":  total_sessions,
        "class_accuracy":  class_accuracy,
        "top_letters":     [{"letter": l, "count": c} for l, c in top_letters],
        "hardest_letters": hard,
    }), 200


# ── POST /api/teacher/add-student ─────────────────────────────────────────────
@teacher_bp.route("/add-student", methods=["POST"])
@jwt_required()
def add_student():
    teacher, err = require_teacher()
    if err: return err

    data = request.get_json()
    if "email" not in data:
        return jsonify({"error": "Student email required"}), 400

    db      = get_db()
    learner = db.users.find_one({"email": data["email"].lower().strip(), "role": "learner"})
    if not learner:
        return jsonify({"error": "No learner found with that email"}), 404

    # Check if already in class
    existing = db.class_members.find_one({
        "teacher_id": str(teacher["_id"]),
        "learner_id": str(learner["_id"]),
    })
    if existing:
        return jsonify({"error": "Student already in your class"}), 409

    from models import new_class_member
    db.class_members.insert_one(new_class_member(teacher["_id"], learner["_id"]))
    db.users.update_one({"_id": learner["_id"]}, {"$set": {"teacher_id": str(teacher["_id"])}})

    return jsonify({"message": f"{learner['name']} added to your class"}), 200


# ── DELETE /api/teacher/remove-student ───────────────────────────────────────
@teacher_bp.route("/remove-student", methods=["DELETE"])
@jwt_required()
def remove_student():
    teacher, err = require_teacher()
    if err: return err

    data = request.get_json()
    if "learner_id" not in data:
        return jsonify({"error": "learner_id required"}), 400

    db = get_db()
    db.class_members.delete_one({
        "teacher_id": str(teacher["_id"]),
        "learner_id": data["learner_id"],
    })
    return jsonify({"message": "Student removed"}), 200

"""
routes/learner.py — Learner game progress & personal stats
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timedelta
from collections import Counter

from models import new_progress

learner_bp = Blueprint("learner", __name__)


def get_db():
    from app import mongo
    return mongo.db


def require_role(*roles):
    """Helper — returns (user_doc, error_response). Call inside each route."""
    from app import mongo
    uid  = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(uid)})
    if not user or user["role"] not in roles:
        return None, (jsonify({"error": "Forbidden"}), 403)
    return user, None


# ── POST /api/learner/progress ────────────────────────────────────────────────
# Called by AlphabetPage / NumbersPage after each correct detection
@learner_bp.route("/progress", methods=["POST"])
@jwt_required()
def save_progress():
    user, err = require_role("learner")
    if err: return err

    data = request.get_json()
    required = ["game_type", "is_correct", "confidence"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400

    db = get_db()

    # Calculate score delta (streak bonus handled client-side, just store what's sent)
    score_delta = data.get("score_delta", 1 if data["is_correct"] else 0)
    new_total   = (user.get("total_score", 0) + score_delta)

    # Update user's total score & streak
    today   = datetime.utcnow().date()
    last    = user.get("last_active")
    last_date = last.date() if last else None
    streak  = user.get("streak", 0)

    if data["is_correct"]:
        if last_date == today:
            pass  # same day, streak unchanged
        elif last_date == today - timedelta(days=1):
            streak += 1  # consecutive day
        else:
            streak = 1   # reset

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "total_score": new_total,
            "streak":      streak,
            "last_active": datetime.utcnow(),
        }}
    )

    # Insert progress record
    rec = new_progress(
        learner_id    = user["_id"],
        learner_email = user["email"],
        game_type     = data["game_type"],
        is_correct    = data["is_correct"],
        confidence    = float(data["confidence"]),
        score_delta   = score_delta,
        total_score   = new_total,
        letter        = data.get("letter"),
        number        = data.get("number"),
    )
    db.progress.insert_one(rec)

    return jsonify({
        "total_score": new_total,
        "streak":      streak,
    }), 201


# ── GET /api/learner/stats ────────────────────────────────────────────────────
@learner_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    user, err = require_role("learner")
    if err: return err

    db      = get_db()
    records = list(db.progress.find({"learner_id": str(user["_id"])}))

    total_attempts  = len(records)
    correct         = [r for r in records if r["is_correct"]]
    accuracy        = round(len(correct) / total_attempts * 100, 1) if total_attempts else 0

    # Per-letter accuracy
    alpha_records   = [r for r in records if r["game_type"] == "alphabet" and r.get("letter")]
    letter_attempts = Counter(r["letter"] for r in alpha_records)
    letter_correct  = Counter(r["letter"] for r in alpha_records if r["is_correct"])
    letter_stats    = {
        l: {
            "attempts": letter_attempts[l],
            "correct":  letter_correct.get(l, 0),
            "accuracy": round(letter_correct.get(l, 0) / letter_attempts[l] * 100, 1)
        }
        for l in letter_attempts
    }

    # Per-number accuracy
    num_records     = [r for r in records if r["game_type"] == "numbers" and r.get("number") is not None]
    num_attempts    = Counter(r["number"] for r in num_records)
    num_correct     = Counter(r["number"] for r in num_records if r["is_correct"])
    number_stats    = {
        str(n): {
            "attempts": num_attempts[n],
            "correct":  num_correct.get(n, 0),
            "accuracy": round(num_correct.get(n, 0) / num_attempts[n] * 100, 1)
        }
        for n in num_attempts
    }

    # Recent sessions (last 10)
    recent = sorted(records, key=lambda r: r["session_date"], reverse=True)[:10]
    recent_out = [
        {
            "game_type":    r["game_type"],
            "letter":       r.get("letter"),
            "number":       r.get("number"),
            "is_correct":   r["is_correct"],
            "confidence":   r["confidence"],
            "session_date": r["session_date"].isoformat(),
        }
        for r in recent
    ]

    return jsonify({
        "name":           user["name"],
        "total_score":    user.get("total_score", 0),
        "streak":         user.get("streak", 0),
        "total_attempts": total_attempts,
        "accuracy":       accuracy,
        "letter_stats":   letter_stats,
        "number_stats":   number_stats,
        "recent_sessions": recent_out,
    }), 200


# ── GET /api/learner/leaderboard ──────────────────────────────────────────────
@learner_bp.route("/leaderboard", methods=["GET"])
@jwt_required()
def leaderboard():
    db = get_db()
    top = list(db.users.find(
        {"role": "learner"},
        {"name": 1, "total_score": 1, "streak": 1}
    ).sort("total_score", -1).limit(10))

    return jsonify([
        {
            "rank":        i + 1,
            "name":        u["name"],
            "total_score": u.get("total_score", 0),
            "streak":      u.get("streak", 0),
        }
        for i, u in enumerate(top)
    ]), 200

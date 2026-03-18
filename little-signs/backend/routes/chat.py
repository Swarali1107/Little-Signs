"""
ISL Buddy Chatbot — Role-aware Flask route using Groq API
Place this file at: little-signs/backend/routes/chat.py

Install dependency:
    pip install groq

Add to your .env:
    GROQ_API_KEY=gsk_your_key_from_console.groq.com
"""

import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from groq import Groq

chat_bp = Blueprint("chat", __name__)

GROQ_MODEL = "llama-3.1-8b-instant"

# ── Lazy client ───────────────────────────────────────────────────────────────
_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in .env")
        _client = Groq(api_key=api_key)
    return _client


# ── Fetch context based on role ───────────────────────────────────────────────
def fetch_context(role, user_id):
    from app import mongo
    from collections import Counter

    db = mongo.db

    if role == "learner":
        records = list(db.progress.find({"learner_id": str(user_id)}))
        total = len(records)
        correct = sum(1 for r in records if r["is_correct"])
        accuracy = round(correct / total * 100, 1) if total else 0

        alpha = [r for r in records if r["game_type"] == "alphabet" and r.get("letter")]
        l_att = Counter(r["letter"] for r in alpha)
        l_cor = Counter(r["letter"] for r in alpha if r["is_correct"])

        letter_stats = {
            l: {
                "attempts": l_att[l],
                "correct": l_cor.get(l, 0),
                "accuracy": round(l_cor.get(l, 0) / l_att[l] * 100, 1),
            }
            for l in l_att
        }

        weak_letters = sorted(
            [
                l
                for l, s in letter_stats.items()
                if s["accuracy"] < 60 and s["attempts"] >= 2
            ]
        )
        mastered_letters = sorted(
            [l for l, s in letter_stats.items() if s["accuracy"] >= 80]
        )

        user = db.users.find_one({"_id": user_id})
        return {
            "role": "learner",
            "total_score": user.get("total_score", 0),
            "streak": user.get("streak", 0),
            "total_attempts": total,
            "accuracy": accuracy,
            "weak_letters": weak_letters,
            "mastered_letters": mastered_letters,
        }

    elif role == "parent":
        user = db.users.find_one({"_id": user_id})
        children = user.get("children", [])
        kids_data = []

        for email in children:
            child = db.users.find_one({"email": email, "role": "learner"})
            if not child:
                continue
            records = list(db.progress.find({"learner_id": str(child["_id"])}))
            total = len(records)
            correct = sum(1 for r in records if r["is_correct"])
            acc = round(correct / total * 100, 1) if total else 0

            alpha = [
                r for r in records if r["game_type"] == "alphabet" and r.get("letter")
            ]
            l_att = Counter(r["letter"] for r in alpha)
            l_cor = Counter(r["letter"] for r in alpha if r["is_correct"])
            weak = sorted(
                [
                    l
                    for l in l_att
                    if l_att[l] >= 2 and (l_cor.get(l, 0) / l_att[l]) < 0.6
                ]
            )
            mastered = sorted(
                [
                    l
                    for l in l_att
                    if l_att[l] >= 3 and (l_cor.get(l, 0) / l_att[l]) >= 0.8
                ]
            )

            kids_data.append(
                {
                    "name": child["name"],
                    "total_score": child.get("total_score", 0),
                    "streak": child.get("streak", 0),
                    "total_attempts": total,
                    "accuracy": acc,
                    "weak_letters": weak,
                    "mastered_letters": mastered,
                }
            )

        return {
            "role": "parent",
            "children": kids_data,
            "schemes": [
                "ADIP Scheme: Free hearing aids for BPL families — apply at district disability office",
                "Divyangjan Scholarship: Financial aid for disabled students — apply on NSP portal (scholarships.gov.in)",
                "ISLRTC Free Courses: Free ISL certification programs — islrtc.nic.in",
                "ALIMCO Devices: Free/subsidized assistive devices for disabled persons",
                "Disability Certificate: Required for ALL benefits — get from CMO or Civil Hospital",
                "Railway Concession: 75% fare concession with disability certificate",
                "3% Job Reservation: In all central government jobs for disabled persons",
                "Swavalamban Pension: Monthly pension scheme — apply at district social welfare office",
                "RTE Act: Free education for disabled children up to age 18 in any school",
            ],
        }

    elif role == "teacher":
        user = db.users.find_one({"_id": user_id})
        members = list(db.class_members.find({"teacher_id": str(user_id)}))
        ids = [m["learner_id"] for m in members]

        all_records = list(db.progress.find({"learner_id": {"$in": ids}}))
        total = len(all_records)
        correct = sum(1 for r in all_records if r["is_correct"])
        class_acc = round(correct / total * 100, 1) if total else 0

        alpha = [
            r for r in all_records if r["game_type"] == "alphabet" and r.get("letter")
        ]
        l_att = Counter(r["letter"] for r in alpha)
        l_cor = Counter(r["letter"] for r in alpha if r["is_correct"])
        hard = sorted(
            [l for l in l_att if l_att[l] >= 5],
            key=lambda l: l_cor.get(l, 0) / l_att[l],
        )[:5]

        struggling = []
        for lid in ids:
            learner = db.users.find_one({"_id": ObjectId(lid)})
            if not learner:
                continue
            recs = [r for r in all_records if r["learner_id"] == lid]
            if not recs:
                continue
            acc = round(sum(1 for r in recs if r["is_correct"]) / len(recs) * 100, 1)
            if acc < 50:
                struggling.append({"name": learner["name"], "accuracy": acc})

        return {
            "role": "teacher",
            "class_name": user.get("class_name", "My Class"),
            "total_students": len(ids),
            "class_accuracy": class_acc,
            "total_sessions": total,
            "hardest_letters": hard,
            "struggling_students": struggling[:5],
        }

    return {}


# ── System prompts per role ───────────────────────────────────────────────────
def build_system_prompt(role, user_name, context):

    isl_alphabet = """
ISL Alphabet reference (Indian Sign Language — NOT ASL):
A=closed fist thumb on side, B=four fingers up thumb tucked across palm,
C=hand curved like C, D=index up other fingers curl thumb touches middle,
E=all fingers bent thumb tucked, F=index+thumb circle three fingers up,
G=index+thumb point horizontally, H=index+middle extended horizontally,
I=pinky raised fist, J=pinky raised draw J in air, K=V shape thumb between fingers,
L=index up thumb out L-shape, M=three fingers over thumb, N=two fingers over thumb,
O=all fingers+thumb curved O-shape, P=index points down thumb out,
Q=index+thumb point down, R=index+middle fingers crossed,
S=closed fist thumb over fingers, T=thumb tucked between index+middle,
U=index+middle straight up together, V=peace sign, W=three fingers spread,
X=index finger hooked, Y=pinky+thumb extended hang-loose, Z=index draws Z in air
"""

    if role == "learner":
        weak = context.get("weak_letters", [])
        mastered = context.get("mastered_letters", [])
        score = context.get("total_score", 0)
        streak = context.get("streak", 0)
        acc = context.get("accuracy", 0)

        return f"""You are ISL Buddy, a warm personal ISL coach in the LittleSigns app.
You are talking to a learner named {user_name}.

Their stats:
- Score: {score} pts | Streak: {streak} days | Accuracy: {acc}%
- Mastered letters: {', '.join(mastered) if mastered else 'none yet'}
- Weak letters (need practice): {', '.join(weak) if weak else 'none yet'}

Rules:
- Be SHORT, warm, encouraging (2-4 sentences)
- Use their actual stats to give specific advice
- When asked what to practice → focus on weak letters: {', '.join(weak[:3]) if weak else 'try the full alphabet'}
- Never reveal you are an AI — you are simply "ISL Buddy"
- Only discuss ISL learning topics
{isl_alphabet}"""

    elif role == "parent":
        children = context.get("children", [])
        schemes = context.get("schemes", [])

        kids_summary = ""
        for kid in children:
            kids_summary += f"""
  Child: {kid['name']}
  - Score: {kid['total_score']} | Streak: {kid['streak']} days | Accuracy: {kid['accuracy']}%
  - Mastered: {', '.join(kid['mastered_letters']) if kid['mastered_letters'] else 'none yet'}
  - Needs practice: {', '.join(kid['weak_letters']) if kid['weak_letters'] else 'doing well!'}"""

        schemes_text = "\n".join(f"- {s}" for s in schemes) if schemes else ""

        return f"""You are ISL Buddy, a helpful family assistant in the LittleSigns app.
You are talking to a parent named {user_name}.

Your job:
- Help parents understand their child's ISL learning progress
- Suggest simple home activities to support learning
- Answer questions about Indian Sign Language in simple non-technical terms
- Share information about government schemes and support for deaf/disabled persons
- Give encouraging, actionable advice

Children's progress:{kids_summary if kids_summary else ' No children linked yet. Ask them to add a child from their dashboard.'}

Indian Government Schemes for deaf/disabled persons (share when asked about help, support or benefits):
{schemes_text}
Important: Always tell parents that getting a Disability Certificate from CMO/Civil Hospital is the FIRST step — it unlocks ALL other government benefits.

Rules:
- Use simple, non-technical language — parents may not know ISL
- Be warm, supportive, and specific about each child
- Suggest practical home activities (e.g. practice at dinner, use flashcards)
- When asked about government help → share relevant scheme info clearly
- Keep responses SHORT (3-5 sentences)
- Never reveal you are an AI — you are simply "ISL Buddy"
{isl_alphabet}"""

    elif role == "teacher":
        hard = context.get("hardest_letters", [])
        struggling = context.get("struggling_students", [])
        students = context.get("total_students", 0)
        acc = context.get("class_accuracy", 0)
        sessions = context.get("total_sessions", 0)
        cls = context.get("class_name", "your class")

        struggling_names = (
            ", ".join([s["name"] for s in struggling]) if struggling else "none"
        )

        return f"""You are ISL Buddy, a professional teaching assistant in the LittleSigns app.
You are talking to a teacher named {user_name}.

Class: {cls}
- Students: {students} | Class accuracy: {acc}% | Total sessions: {sessions}
- Hardest letters for the class: {', '.join(hard) if hard else 'not enough data yet'}
- Students needing attention (<50% accuracy): {struggling_names}

Your job:
- Help teachers understand class-wide ISL learning trends
- Suggest targeted group exercises based on class weak spots
- Identify which students need 1-on-1 attention
- Recommend teaching strategies for difficult signs
- Help plan lessons and assignments

Rules:
- Be professional, data-driven, and concise
- Always reference actual class data when giving advice
- Suggest specific exercises for hardest letters: {', '.join(hard[:3]) if hard else 'focus on fundamentals'}
- Keep responses SHORT and actionable (3-5 sentences)
- Never reveal you are an AI — you are simply "ISL Buddy"
{isl_alphabet}"""

    return "You are ISL Buddy, a helpful ISL learning assistant."


# ── Chat endpoint ─────────────────────────────────────────────────────────────
@chat_bp.route("/chat/isl-buddy", methods=["POST"])
@jwt_required()
def isl_buddy_chat():
    from app import mongo

    uid = get_jwt_identity()
    user = mongo.db.users.find_one({"_id": ObjectId(uid)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    role = user.get("role", "learner")
    user_name = user.get("name", "there").split()[0]

    body = request.get_json(silent=True) or {}
    user_message = body.get("message", "").strip()
    history = body.get("history", [])

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    try:
        context = fetch_context(role, user["_id"])
        system_prompt = build_system_prompt(role, user_name, context)

        msgs = [{"role": "system", "content": system_prompt}]
        for msg in history[-8:]:
            r = msg.get("role", "user")
            parts = msg.get("parts", [])
            text = parts[0].get("text", "") if parts else ""
            if text:
                msgs.append(
                    {"role": "assistant" if r == "model" else "user", "content": text}
                )
        msgs.append({"role": "user", "content": user_message})

        c = get_client()
        response = c.chat.completions.create(
            model=GROQ_MODEL,
            messages=msgs,
            max_tokens=500,
            temperature=0.7,
        )

        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply, "role": role}), 200

    except Exception as e:
        print(f"[ISL Buddy] Groq error: {e}")
        return (
            jsonify({"reply": "Sorry, I'm having a moment! Try asking me again. 🙏"}),
            200,
        )


# ── Health check ──────────────────────────────────────────────────────────────
@chat_bp.route("/chat/health", methods=["GET"])
def chat_health():
    return jsonify({"status": "ok", "model": GROQ_MODEL}), 200

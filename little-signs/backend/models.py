"""
models.py — MongoDB document schemas for LittleSigns
All collections live in the 'littlesigns' database.

Collections:
  users         — all users (learner / parent / teacher / admin)
  progress      — per-session game results for learners
  class_members — teacher ↔ learner relationships
"""

from datetime import datetime


# ── User document shape ──────────────────────────────────────────────────────
# {
#   _id:          ObjectId  (auto)
#   name:         str
#   email:        str       (unique index)
#   password:     str       (bcrypt hash)
#   role:         str       ("learner" | "parent" | "teacher" | "admin")
#   created_at:   datetime
#
#   # learner-only fields
#   parent_email: str | None   (links learner → parent account)
#   teacher_id:   str | None   (ObjectId of assigned teacher)
#   age:          int | None
#
#   # parent-only fields
#   children:     list[str]    (list of learner emails)
#
#   # teacher-only fields
#   class_name:   str | None
# }

def new_user(name, email, hashed_pw, role, extra=None):
    doc = {
        "name":       name,
        "email":      email.lower().strip(),
        "password":   hashed_pw,
        "role":       role,
        "created_at": datetime.utcnow(),
    }
    if extra:
        doc.update(extra)
    return doc


# ── Progress document shape ──────────────────────────────────────────────────
# {
#   _id:           ObjectId
#   learner_id:    str   (ObjectId of the learner user)
#   learner_email: str
#   game_type:     str   ("alphabet" | "numbers" | "quiz")
#   letter:        str | None   (e.g. "A")
#   number:        int | None   (e.g. 3)
#   is_correct:    bool
#   confidence:    float  (0–1)
#   score_delta:   int    (+1 or +2 for streaks)
#   total_score:   int    (cumulative score at time of record)
#   session_date:  datetime
# }

def new_progress(learner_id, learner_email, game_type,
                 is_correct, confidence, score_delta, total_score,
                 letter=None, number=None):
    return {
        "learner_id":    str(learner_id),
        "learner_email": learner_email,
        "game_type":     game_type,
        "letter":        letter,
        "number":        number,
        "is_correct":    is_correct,
        "confidence":    round(confidence, 4),
        "score_delta":   score_delta,
        "total_score":   total_score,
        "session_date":  datetime.utcnow(),
    }


# ── Class-member document shape ──────────────────────────────────────────────
# {
#   _id:          ObjectId
#   teacher_id:   str   (ObjectId of teacher)
#   learner_id:   str   (ObjectId of learner)
#   joined_at:    datetime
# }

def new_class_member(teacher_id, learner_id):
    return {
        "teacher_id": str(teacher_id),
        "learner_id": str(learner_id),
        "joined_at":  datetime.utcnow(),
    }

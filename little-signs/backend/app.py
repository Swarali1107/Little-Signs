"""
app.py — LittleSigns Flask Backend
Runs on port 5001 (port 5000 is used by the ML detection server)
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from dotenv import load_dotenv

# ── Load .env FIRST before anything else ─────────────────────────────────────
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Config ────────────────────────────────────────────────────────────────────
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False  # tokens don't expire during dev

# ── Extensions ────────────────────────────────────────────────────────────────
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/littlesigns")
client = MongoClient(MONGO_URI)
mongo = client.get_default_database()

# Create indexes
mongo.db.users.create_index("email", unique=True)
mongo.db.progress.create_index("learner_id")
mongo.db.class_members.create_index([("teacher_id", 1), ("learner_id", 1)])


# ── Blueprints ────────────────────────────────────────────────────────────────
from routes.auth import auth_bp, bcrypt as auth_bcrypt
from routes.learner import learner_bp
from routes.parent import parent_bp
from routes.teacher import teacher_bp
from routes.admin import admin_bp
from routes.chat import chat_bp  # ✅ imported AFTER load_dotenv()

# Inject bcrypt into auth blueprint
auth_bcrypt.init_app(app)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(learner_bp, url_prefix="/api/learner")
app.register_blueprint(parent_bp, url_prefix="/api/parent")
app.register_blueprint(teacher_bp, url_prefix="/api/teacher")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(chat_bp, url_prefix="/api")  # ✅ /api/chat/isl-buddy


# ── Health check ──────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    try:
        client.admin.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return jsonify({"status": "ok", "database": db_status}), 200


# ── JWT error handlers ────────────────────────────────────────────────────────
@jwt.unauthorized_loader
def missing_token(reason):
    return jsonify({"error": "Token missing", "reason": reason}), 401


@jwt.invalid_token_loader
def invalid_token(reason):
    return jsonify({"error": "Invalid token", "reason": reason}), 422


@jwt.expired_token_loader
def expired_token(header, payload):
    return jsonify({"error": "Token expired"}), 401


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    print(f"\n🚀 LittleSigns API running on http://localhost:{port}")
    print(f"📦 MongoDB: {MONGO_URI}\n")
    app.run(debug=True, port=port)

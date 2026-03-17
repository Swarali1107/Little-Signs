# 🤟 Little Signs — Full Stack React + Flask + MongoDB

Hackathon-grade ISL learning app with 4-role auth, real-time sign detection, and live dashboards.

## Quick Start

### 1. Start MongoDB
```bash
net start MongoDB        # Windows
# or use MongoDB Atlas free tier
```

### 2. Start Auth/Data Backend (port 5001)
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 3. Start ML Detection Server (port 5000)
```bash
# In your original LittleSigns-main folder
python app.py
```

### 4. Start React Frontend
```bash
npm start     # opens http://localhost:3000
```

## Roles After Login

| Role | Dashboard |
|------|-----------|
| 🧒 Learner | Score, streak, alphabet heatmap, leaderboard |
| 👨‍👩‍👧 Parent | Children cards, per-child session history |
| 👩‍🏫 Teacher | Class roster, hardest letters, class accuracy |
| 🛡️ Admin | All users, platform stats, live activity feed |

## API Endpoints (port 5001)

```
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/learner/progress
GET  /api/learner/stats
GET  /api/learner/leaderboard
GET  /api/parent/children
POST /api/parent/add-child
GET  /api/teacher/students
GET  /api/teacher/class-summary
POST /api/teacher/add-student
GET  /api/admin/stats
GET  /api/admin/users
GET  /api/admin/recent-activity
```

## MongoDB Collections
- `users` — all accounts with role, score, streak
- `progress` — every game attempt with letter, correct/wrong, confidence
- `class_members` — teacher ↔ learner links

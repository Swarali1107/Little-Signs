# 🤟 LittleSigns — India's First AI-Powered ISL Learning Platform

<div align="center">

![ISL](https://img.shields.io/badge/Indian%20Sign%20Language-ISL-purple?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-Python-green?style=for-the-badge&logo=flask)
![TensorFlow](https://img.shields.io/badge/TensorFlow-ML-orange?style=for-the-badge&logo=tensorflow)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?style=for-the-badge&logo=mongodb)
![Accuracy](https://img.shields.io/badge/Model%20Accuracy-99.96%25-success?style=for-the-badge)


**Making Indian Sign Language accessible to 1.8 crore deaf and hard-of-hearing people in India**

[🚀 Features](#-features) · [🤖 AI Model](#-ai-model) · [🛠️ Tech Stack](#️-tech-stack) · [⚙️ Setup](#️-setup--installation) · [📸 Screenshots](#-screenshots)

</div>

---

## 🌟 What is LittleSigns?

LittleSigns is a **full-stack AI-powered web platform** that makes Indian Sign Language (ISL) learning free, interactive and personalized. Built on official **ISLRTC government content**, it combines real-time hand sign detection, school subject videos, a word dictionary, sentence building with text-to-speech, and a personalized AI chatbot — all in one platform.

> *"India has 1.8 crore deaf and hard-of-hearing citizens. Before LittleSigns, there was no free, interactive, AI-powered platform to learn ISL."*

---

## ✨ Features

### 🧒 For Learners

| Feature | Description |
|---|---|
| 🤖 **Alphabet Detection** | Real-time ISL A–Z hand sign detection using camera — 99.96% AI accuracy |
| 🔢 **Number Signs** | Learn and practice ISL number signs 0–9 with interactive cards |
| 📚 **ISL Library** | 41 official ISLRTC subject videos — Maths, Science, English, History, Geography, Civics |
| 📖 **Word Dictionary** | 1000+ official ISLRTC word sign videos, searchable by letter or keyword |
| ✍️ **Sentence Builder** | Sign letters continuously → auto-forms words → speaks sentences aloud (Indian English TTS) |
| 🧠 **ISL Buddy AI** | Personalized AI coach powered by Groq — knows your progress, weak signs, streaks |
| 📊 **Progress Dashboard** | Track score, streak, accuracy per letter, mastered signs, session history |

### 👨‍👩‍👧 For Parents

| Feature | Description |
|---|---|
| 📊 **Child Progress Report** | Full accuracy breakdown, weak signs, mastered letters, session history |
| 🏠 **Practice Tips** | ISL Buddy suggests home activities based on child's weak areas |
| 🇮🇳 **Govt Scheme Guide** | AI chatbot provides info on ADIP, Divyangjan Scholarship, RTE Act, Railway Concession & more |
| ➕ **Add Child** | Link learner accounts to parent account for monitoring |

### 👩‍🏫 For Teachers

| Feature | Description |
|---|---|
| 📈 **Class Analytics** | Class-wide accuracy, total sessions, participation tracking |
| ⚠️ **Weak Spot Detection** | Identifies hardest letters for the class + students needing attention |
| 📋 **Task Assignment** | Assign alphabet practice, dictionary exploration, sentence building |
| 👥 **Student Roster** | Add/remove students, per-student progress tracking |

---

## 🤖 AI Model

| Detail | Info |
|---|---|
| **Architecture** | Deep Dense Network with Residual connections + BatchNormalization |
| **Input** | 42 landmarks — 21 MediaPipe hand keypoints × (x, y) |
| **Output** | 35 classes — A–Z alphabets + 0–9 numbers |
| **Dataset** | Indian Sign Language — prathumarikeri (Kaggle) |
| **Training Samples** | 87,260 (after 4× augmentation) |
| **Test Accuracy** | **99.96%** |
| **Framework** | TensorFlow / Keras |
| **Inference** | MediaPipe Hands → keypoint extraction → model prediction |

### Detection Logic
- Requires **70%+ confidence** to count as a correct sign
- Needs **2 consecutive correct frames** (~1.6s) to confirm
- **Never saves incorrect frames** mid-session — only saves one result per attempt
- **30-second give-up timer** saves one incorrect if the learner can't complete the sign

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, CSS Modules |
| **Backend** | Flask (Python 3.11), JWT Authentication |
| **ML Server** | TensorFlow, MediaPipe, OpenCV, NumPy |
| **Database** | MongoDB Atlas |
| **AI Chatbot** | Groq API (llama-3.1-8b-instant) |
| **Dictionary** | Google Drive API v3 |
| **Text-to-Speech** | Web Speech API (built into Chrome) |
| **Fonts** | Orbitron, Exo 2, Space Mono, Syne |

---

## 🧠 ISL Buddy — AI Chatbot

ISL Buddy is a **role-aware personalized chatbot** powered by Groq AI:

- **Learner mode** — Analyzes weak letters, streak, accuracy → gives targeted practice advice
- **Parent mode** — Summarizes child's progress + provides government scheme information (ADIP, Divyangjan Scholarship, ISLRTC courses, RTE Act, Railway concession etc.)
- **Teacher mode** — Class analytics, struggling student identification, lesson planning suggestions

> ISL Buddy fetches live data from MongoDB on every message — responses are always personalized to real progress data.

---

## 📚 ISL Library — 41 Official Videos

Subject videos sourced from ISLRTC YouTube channel:

| Subject | Videos |
|---|---|
| 📐 Maths | 7 videos |
| 🔬 Science | 6 videos |
| 📖 English | 7 videos |
| 🏺 History | 6 videos |
| 🌍 Geography | 7 videos |
| ⚖️ Civics | 8 videos |

> *All video content sourced from ISLRTC (islrtc.nic.in) — Indian Sign Language Research & Training Centre, Govt of India, DEPwD, Ministry of Social Justice & Empowerment*

---

## 👥 User Roles

| Role | Access | Redirect after login |
|---|---|---|
| 🧒 **Learner** | All 5 learning features + ISL Buddy + badges | `/home` |
| 👨‍👩‍👧 **Parent** | Child progress dashboards + scheme info | `/dashboard/parent` |
| 👩‍🏫 **Teacher** | Class management + task assignment | `/dashboard/teacher` |

---

## 📁 Project Structure

```
Little-Signs/
│
├── little-signs/                          # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LearnerHome.js             # Main home with galaxy UI
│   │   │   ├── AlphabetPage.js            # Real-time sign detection
│   │   │   ├── NumbersPage.js             # Number signs + quiz
│   │   │   ├── ISLLibrary.js              # Subject videos + dictionary
│   │   │   ├── WordDictionary.js          # ISLRTC word sign videos
│   │   │   ├── SentenceBuilder.js         # Sign → sentence → speech
│   │   │   ├── AboutPage.js               # Platform info + ISLRTC
│   │   │   └── dashboards/
│   │   │       ├── LearnerDashboard.js
│   │   │       ├── ParentDashboard.js
│   │   │       └── TeacherDashboard.js
│   │   ├── components/
│   │   │   ├── ISLBuddy.js                # AI chatbot UI
│   │   │   ├── ISLBuddyButton.js          # Floating chat button
│   │   │   └── ProtectedRoute.js
│   │   ├── context/
│   │   │   └── AuthContext.js             # JWT auth context
│   │   └── utils/
│   │       └── badges.js                  # Badge system
│   └── public/
│       └── images/
│           ├── sign/                      # ISL reference images A-Z
│           └── gifs/                      # Subject GIF animations
│
├── little-signs/backend/                  # Flask Backend
│   ├── app.py                             # Main Flask app
│   ├── models.py                          # MongoDB schemas
│   └── routes/
│       ├── auth.py                        # Login, signup, JWT
│       ├── learner.py                     # Progress tracking
│       ├── parent.py                      # Child progress APIs
│       ├── teacher.py                     # Class management APIs
│       ├── admin.py                       # Admin routes
│       └── chat.py                        # ISL Buddy (Groq AI)
│
└── LittleSigns-main/                      # ML Detection Server
    ├── detection_server.py                # Flask ML server
    ├── training.ipynb                     # Model training notebook
    └── model.h5                           # Trained model (download separately)
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB Atlas account
- Google Chrome (for camera + speech features)
- Groq API key (free at console.groq.com)
- Google Drive API key (for word dictionary)

---

### 1️⃣ Clone the repo

```bash
git clone https://github.com/Swarali1107/Little-Signs.git
cd Little-Signs
```

---

### 2️⃣ Frontend Setup

```bash
cd little-signs
npm install
```

Create `little-signs/.env`:
```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_DRIVE_API_KEY=your_google_drive_api_key
REACT_APP_LIBRARY_FOLDER_ID=your_drive_folder_id
```

```bash
npm start
# Runs on http://localhost:3000
```

---

### 3️⃣ Backend Setup

```bash
cd little-signs/backend
pip install -r requirements.txt
```

Create `little-signs/backend/.env`:
```env
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
```

```bash
python app.py
# Runs on http://localhost:5001
```

---

### 4️⃣ ML Detection Server

```bash
cd LittleSigns-main
pip install flask flask-cors tensorflow mediapipe opencv-python numpy pandas
```


```bash
python detection_server.py
# Runs on http://localhost:5000
You will get a `model.h5` separately after training the model as directed and then place it in `LittleSigns-main/`
```

---

### 5️⃣ Run All 3 Servers

Open **3 separate terminals**:

```bash
# Terminal 1 — Frontend
cd little-signs && npm start

# Terminal 2 — Backend  
cd little-signs/backend && python app.py

# Terminal 3 — ML Server
cd LittleSigns-main && python detection_server.py
```

Then open: **http://localhost:3000**

---

## 🔑 Environment Variables

| File | Variable | Description |
|---|---|---|
| `little-signs/.env` | `REACT_APP_API_URL` | Backend API URL |
| `little-signs/.env` | `REACT_APP_DRIVE_API_KEY` | Google Drive API key |
| `backend/.env` | `MONGO_URI` | MongoDB Atlas URI |
| `backend/.env` | `JWT_SECRET_KEY` | JWT signing secret |
| `backend/.env` | `GROQ_API_KEY` | Groq AI API key (free) |

---

## 🏛️ Content Attribution

All ISL video content is sourced from:
- **ISLRTC** — Indian Sign Language Research & Training Centre
- **Website** — [islrtc.nic.in](https://islrtc.nic.in)
- **Under** — Dept of Empowerment of Persons with Disabilities (DEPwD), Ministry of Social Justice & Empowerment, Govt of India
- **License** — Government Open Data License (GODL)

Partner institutions referenced: AYJNISHD, ALIMCO, NIEPMD, NIC

---

## 🇮🇳 Government Schemes for Deaf/Disabled Persons

LittleSigns ISL Buddy chatbot provides information on:
- **ADIP Scheme** — Free hearing aids for BPL families
- **Divyangjan Scholarship** — Financial aid via scholarships.gov.in
- **ISLRTC Free Courses** — Free ISL certification at islrtc.nic.in
- **RTE Act** — Free education for disabled children up to age 18
- **Railway Concession** — 75% fare concession with disability certificate
- **3% Job Reservation** — In all central government jobs

---

## 📸 Screenshots

<img width="1875" height="968" alt="image" src="https://github.com/user-attachments/assets/91020c80-50d2-4a13-90ec-8b85b064ab18" />

<img width="1868" height="1021" alt="image" src="https://github.com/user-attachments/assets/6deed34f-d82a-4bb4-ad9c-4e2d29043138" />

<img width="1885" height="985" alt="image" src="https://github.com/user-attachments/assets/e15c8825-12da-4586-b0ac-d5800d5da4d8" />

---

## 🚀 Quick Start (Demo)

Create these test accounts to explore all roles:

| Role | Email | Password |
|---|---|---|
| Learner | learner@demo.com | demo123 |
| Parent | parent@demo.com | demo123 |
| Teacher | teacher@demo.com | demo123 |

---

## 📄 License

MIT License — feel free to use, modify and distribute.

---

<div align="center">

**Made with ❤️ for the ISL community — for every deaf child in India**

🤟 *LittleSigns — Sign. Learn. Speak.*

</div>

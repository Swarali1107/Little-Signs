# 🤟 LittleSigns — Indian Sign Language Learning Platform

An AI-powered ISL learning platform with real-time sign detection,
official ISLRTC word dictionary, sentence builder and progress tracking.

## Features
- 🔤 Real-time ISL alphabet detection (A-Z) using AI
- 🔢 Number signs (0-9) with camera detection
- 📖 ISL Word Dictionary with ISLRTC official videos
- ✍️ Sentence Builder — sign letters, form words, hear them spoken
- 👨‍👩‍👧 Parent dashboard — track child progress
- 👩‍🏫 Teacher dashboard — manage class, assign tasks
- 🏅 Badge system with 16 achievements

## Tech Stack
- Frontend: React 18
- Backend: Flask (Python)
- ML: TensorFlow + MediaPipe
- Database: MongoDB Atlas

## Setup
### Frontend
cd little-signs
npm install
npm start

### Backend
cd little-signs/backend

pip install -r requirements.txt

python app.py

### ML Detection Server
cd LittleSigns-main

pip install flask tensorflow mediapipe opencv-python

python detection_server.py

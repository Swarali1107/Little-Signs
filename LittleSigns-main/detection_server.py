# detection_server.py
import cv2
import mediapipe as mp
import copy
import itertools
import numpy as np
import pandas as pd
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow import keras

app = Flask(__name__)
CORS(app)

# ── Load model ────────────────────────────────────────────────────────────────
print("Loading model...")
model = keras.models.load_model("model.h5")
print("✅ Model loaded!")

# ── EXACT class order from original isl_detection.py ─────────────────────────
import string

CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] + list(string.ascii_uppercase)
print(f"Classes: {CLASSES}")

# ── MediaPipe setup ───────────────────────────────────────────────────────────
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_draw_styles = mp.solutions.drawing_styles
hands = mp_hands.Hands(
    model_complexity=0,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)


# ── EXACT same preprocessing from original code ───────────────────────────────
def calc_landmark_list(image, landmarks):
    image_width, image_height = image.shape[1], image.shape[0]
    return [
        [
            min(int(lm.x * image_width), image_width - 1),
            min(int(lm.y * image_height), image_height - 1),
        ]
        for lm in landmarks.landmark
    ]


def pre_process_landmark(landmark_list):
    temp = copy.deepcopy(landmark_list)
    base_x, base_y = temp[0]
    for i in range(len(temp)):
        temp[i][0] -= base_x
        temp[i][1] -= base_y
    temp = list(itertools.chain.from_iterable(temp))
    max_val = max(map(abs, temp))
    return [n / max_val for n in temp] if max_val != 0 else temp


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/detect-sign", methods=["POST"])
def detect():
    try:
        data = request.get_json()
        img_data = data["image"].split(",")[1]
        target = data.get("target", "").upper().strip()

        # Decode base64 → OpenCV image
        img_bytes = base64.b64decode(img_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = hands.process(frame_rgb)

        if not results.multi_hand_landmarks:
            return jsonify({"success": False, "error": "No hand detected"})

        # Use first detected hand
        hand_landmarks = results.multi_hand_landmarks[0]

        # EXACT same preprocessing as original
        landmark_list = calc_landmark_list(frame, hand_landmarks)
        pre_processed = pre_process_landmark(landmark_list)

        # Predict
        df = pd.DataFrame(pre_processed).transpose()
        predictions = model.predict(df, verbose=0)
        pred_idx = int(np.argmax(predictions, axis=1)[0])
        confidence = float(np.max(predictions))
        prediction = CLASSES[pred_idx]
        is_correct = prediction == target

        return jsonify(
            {
                "success": True,
                "prediction": prediction,
                "confidence": confidence,
                "is_correct": is_correct,
            }
        )

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/signs")
def signs():
    return jsonify({"letters": CLASSES})


@app.route("/health")
def health():
    return jsonify({"status": "ok", "classes": CLASSES})


if __name__ == "__main__":
    print("🤟 ISL Detection Server running on port 5000")
    app.run(port=5000, debug=False)

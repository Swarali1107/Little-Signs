# detection_server.py
# ============================================================
#  Compatible with the advanced model from train.py
#  Supports:
#   - 84-feature two-hand input (or 42 single-hand fallback)
#   - 15-frame rolling sequence window for GRU
#   - Temperature-calibrated confidence scores
#   - .keras model format
#   - Exact same preprocessing as train.py
# ============================================================

import cv2
import copy
import itertools
import json
import os
import numpy as np
import base64
import collections
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────────────────────
#  LOAD CONFIG
# ─────────────────────────────────────────────────────────────
CONFIG_PATH = "config.json"
LABELS_PATH = "class_labels.json"
MODEL_PATH = "best_model.keras" if os.path.exists("best_model.keras") else "model.h5"

# Defaults if config.json not found
DEFAULT_CONFIG = {
    "feature_dim": 84,
    "seq_len": 15,
    "two_hands": True,
    "num_classes": 35,
    "temperature": 1.0,
}

if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH) as f:
        cfg = json.load(f)
    print(f"Loaded config: {cfg}")
else:
    cfg = DEFAULT_CONFIG
    print(f"config.json not found — using defaults: {cfg}")

FEATURE_DIM = cfg.get("feature_dim", DEFAULT_CONFIG["feature_dim"])
SEQ_LEN = cfg.get("seq_len", DEFAULT_CONFIG["seq_len"])
TWO_HANDS = cfg.get("two_hands", DEFAULT_CONFIG["two_hands"])
TEMPERATURE = cfg.get("temperature", DEFAULT_CONFIG["temperature"])
NUM_CLASSES = cfg.get("num_classes", DEFAULT_CONFIG["num_classes"])

# ─────────────────────────────────────────────────────────────
#  LOAD CLASS LABELS
# ─────────────────────────────────────────────────────────────
import string

if os.path.exists(LABELS_PATH):
    with open(LABELS_PATH) as f:
        CLASSES = json.load(f)
    print(f"Loaded {len(CLASSES)} classes from class_labels.json")
else:
    CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] + list(
        string.ascii_uppercase
    )
    print(f"class_labels.json not found — using default {len(CLASSES)} classes")

print(f"Classes: {CLASSES}")

# ─────────────────────────────────────────────────────────────
#  LOAD MODEL
# ─────────────────────────────────────────────────────────────
print(f"\nLoading model from {MODEL_PATH}...")
model = keras.models.load_model(MODEL_PATH)
print("✅ Model loaded!")
print(f"Input shape:  {model.input_shape}")
print(f"Output shape: {model.output_shape}")
print(f"Temperature:  {TEMPERATURE}")
print(f"Feature dim:  {FEATURE_DIM} ({'two-hand' if TWO_HANDS else 'one-hand'})")
print(f"Sequence len: {SEQ_LEN} frames")

# ─────────────────────────────────────────────────────────────
#  MEDIAPIPE SETUP
#  Exact same as train.py
# ─────────────────────────────────────────────────────────────
from mediapipe.python.solutions import hands as mp_hands_module

mp_hands = mp_hands_module
hands_live = mp_hands.Hands(
    static_image_mode=False,  # live mode — faster tracking
    max_num_hands=2 if TWO_HANDS else 1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    model_complexity=0,  # fastest model
)


def calc_landmark_list(image, landmarks):
    h, w = image.shape[:2]
    return [
        [min(int(lm.x * w), w - 1), min(int(lm.y * h), h - 1)]
        for lm in landmarks.landmark
    ]


def pre_process_landmark(landmark_list):
    """Wrist-relative, max-normalised — exact same as train.py."""
    temp = copy.deepcopy(landmark_list)
    base_x, base_y = temp[0]
    for p in temp:
        p[0] -= base_x
        p[1] -= base_y
    flat = list(itertools.chain.from_iterable(temp))
    max_val = max(map(abs, flat)) if flat else 1
    return [v / max_val for v in flat] if max_val != 0 else flat


def extract_features_from_frame(frame_rgb, result):
    """
    Extract FEATURE_DIM features from a MediaPipe result.
    Returns None if no hand detected.
    84 features: hand1 (42) + hand2 (42, zeros if absent)
    42 features: hand1 only
    """
    if not result.multi_hand_landmarks:
        return None

    lm1 = pre_process_landmark(
        calc_landmark_list(frame_rgb, result.multi_hand_landmarks[0])
    )

    if TWO_HANDS:
        if len(result.multi_hand_landmarks) > 1:
            lm2 = pre_process_landmark(
                calc_landmark_list(frame_rgb, result.multi_hand_landmarks[1])
            )
        else:
            lm2 = [0.0] * 42  # absent second hand → zeros
        return lm1 + lm2  # 84 floats

    return lm1  # 42 floats


# ─────────────────────────────────────────────────────────────
#  ROLLING FRAME BUFFER
#  Keeps last SEQ_LEN feature vectors for GRU input
# ─────────────────────────────────────────────────────────────
frame_buffer = collections.deque(maxlen=SEQ_LEN)


def get_sequence():
    """
    Returns (SEQ_LEN, FEATURE_DIM) array from buffer.
    Pads with first frame repeated if buffer not full yet.
    """
    buf = list(frame_buffer)
    if len(buf) == 0:
        return None
    # Pad by repeating first frame if buffer not full
    while len(buf) < SEQ_LEN:
        buf.insert(0, buf[0])
    return np.array(buf[-SEQ_LEN:], dtype=np.float32)


def apply_temperature(logits, temperature):
    """Scale logits by temperature then softmax."""
    scaled = logits / temperature
    e = np.exp(scaled - np.max(scaled))  # numerical stability
    return e / e.sum()


# ─────────────────────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────────────────────
@app.route("/detect-sign", methods=["POST"])
def detect():
    try:
        data = request.get_json()
        img_data = data["image"].split(",")[1]
        target = data.get("target", "").upper().strip()

        # ── Decode base64 image ──
        img_bytes = base64.b64decode(img_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # ── Run MediaPipe ──
        result = hands_live.process(frame_rgb)

        # ── No hand detected ──
        if not result.multi_hand_landmarks:
            frame_buffer.clear()  # reset sequence on hand loss
            return jsonify(
                {
                    "success": False,
                    "prediction": None,
                    "confidence": 0.0,
                    "is_correct": False,
                    "error": "No hand detected",
                }
            )

        # ── Extract features ──
        features = extract_features_from_frame(frame_rgb, result)
        if features is None or len(features) != FEATURE_DIM:
            return jsonify(
                {
                    "success": False,
                    "prediction": None,
                    "confidence": 0.0,
                    "is_correct": False,
                    "error": "Feature extraction failed",
                }
            )

        # ── Add to rolling buffer ──
        frame_buffer.append(features)

        # ── Build sequence for GRU ──
        sequence = get_sequence()
        if sequence is None:
            return jsonify(
                {
                    "success": False,
                    "prediction": None,
                    "confidence": 0.0,
                    "is_correct": False,
                    "error": "Buffer warming up",
                }
            )

        # ── Predict ──
        # Input shape: (1, SEQ_LEN, FEATURE_DIM)
        inp = sequence[np.newaxis, ...]  # (1, 15, 84)
        raw_preds = model.predict(inp, verbose=0)[0]  # (35,) softmax probs

        # ── Temperature calibration ──
        # Convert softmax back to logits, apply temperature, re-softmax
        # Use log to approximate logits from softmax output
        logits = np.log(np.clip(raw_preds, 1e-9, 1.0))
        cal_probs = apply_temperature(logits, TEMPERATURE)

        pred_idx = int(np.argmax(cal_probs))
        confidence = float(cal_probs[pred_idx])
        prediction = CLASSES[pred_idx]
        is_correct = (prediction == target) if target else False

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
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(e),
                    "prediction": None,
                    "confidence": 0.0,
                    "is_correct": False,
                }
            ),
            500,
        )


@app.route("/reset-buffer", methods=["POST"])
def reset_buffer():
    """Call this when user switches target letter."""
    frame_buffer.clear()
    return jsonify({"success": True, "message": "Frame buffer cleared"})


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "model": MODEL_PATH,
            "classes": CLASSES,
            "feature_dim": FEATURE_DIM,
            "seq_len": SEQ_LEN,
            "two_hands": TWO_HANDS,
            "temperature": TEMPERATURE,
            "buffer_size": len(frame_buffer),
        }
    )


@app.route("/signs", methods=["GET"])
def signs():
    return jsonify({"letters": CLASSES})


# ─────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n🤟 ISL Detection Server running on port 5000")
    print(f"   Model:       {MODEL_PATH}")
    print(f"   Classes:     {len(CLASSES)}")
    print(f"   Features:    {FEATURE_DIM}")
    print(f"   Sequence:    {SEQ_LEN} frames")
    print(f"   Temperature: {TEMPERATURE:.4f}")
    app.run(port=5000, debug=False)

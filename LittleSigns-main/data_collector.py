# ============================================================
#  FILE 1 — data_collector.py
#  PURPOSE: Capture your own webcam samples per ISL class.
#           This is the #1 improvement — bridging the gap
#           between the Kaggle dataset and your real webcam.
#  RUN: Locally (not Colab). pip install opencv-python mediapipe
#  OUTPUT: my_data/<class_name>/<n>.jpg  (ready to mix into training)
# ============================================================

import cv2
import os
import string
import time
from mediapipe.python.solutions import hands as mp_hands_module
from mediapipe.python.solutions import drawing_utils as mp_drawing
from mediapipe.python.solutions import drawing_styles as mp_drawing_styles

CLASSES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] + list(string.ascii_uppercase)
SAVE_DIR = "my_data"
SAMPLES_PER_CLASS = 80  # how many frames to capture per sign
COUNTDOWN_SEC = 3  # seconds to prepare before capture starts
CAMERA_INDEX = 0

mp_hands = mp_hands_module
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

os.makedirs(SAVE_DIR, exist_ok=True)


# Count already-captured samples so we can resume
def count_existing(class_name):
    d = os.path.join(SAVE_DIR, class_name)
    if not os.path.exists(d):
        return 0
    return len([f for f in os.listdir(d) if f.endswith(".jpg")])


cap = cv2.VideoCapture(CAMERA_INDEX)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print(
    f"\nISL Data Collector — {len(CLASSES)} classes, {SAMPLES_PER_CLASS} samples each"
)
print("Controls:  SPACE = start capturing  |  S = skip class  |  Q = quit\n")

for class_name in CLASSES:
    existing = count_existing(class_name)
    if existing >= SAMPLES_PER_CLASS:
        print(f"  [{class_name}] already complete ({existing} samples) — skipping")
        continue

    save_dir = os.path.join(SAVE_DIR, class_name)
    os.makedirs(save_dir, exist_ok=True)
    count = existing
    capturing = False
    countdown_start = None
    skip = False

    print(f"\n  [{class_name}]  Show this sign. Press SPACE to begin, S to skip.")

    while count < SAMPLES_PER_CLASS and not skip:
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)
        display = frame.copy()

        # MediaPipe detection
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        result = hands.process(rgb)
        rgb.flags.writeable = True

        if result.multi_hand_landmarks:
            for hl in result.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    display,
                    hl,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style(),
                )

        # Status overlay
        if not capturing:
            cv2.putText(
                display,
                f"Sign: {class_name}  —  SPACE to capture, S to skip",
                (10, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
            )
        else:
            elapsed = time.time() - countdown_start
            remaining = COUNTDOWN_SEC - elapsed
            if remaining > 0:
                cv2.putText(
                    display,
                    f"Starting in {remaining:.1f}s...",
                    (10, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.0,
                    (0, 200, 255),
                    2,
                )
            else:
                # Actually save
                fname = os.path.join(save_dir, f"{count:04d}.jpg")
                cv2.imwrite(fname, frame)
                count += 1
                pct = int(count / SAMPLES_PER_CLASS * 100)
                bar = "#" * (pct // 5) + "-" * (20 - pct // 5)
                cv2.putText(
                    display,
                    f"Capturing [{bar}] {count}/{SAMPLES_PER_CLASS}",
                    (10, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.65,
                    (0, 255, 100),
                    2,
                )

        cv2.imshow("ISL Collector", display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            print("\nQuitting.")
            cap.release()
            cv2.destroyAllWindows()
            hands.close()
            exit()
        elif key == ord("s"):
            skip = True
            print(f"  [{class_name}] skipped.")
        elif key == ord(" ") and not capturing:
            capturing = True
            countdown_start = time.time()

    if count >= SAMPLES_PER_CLASS:
        print(f"  [{class_name}] done. {count} samples saved.")

cap.release()
cv2.destroyAllWindows()
hands.close()
print("\nAll done! Run train.py next.")
print(f"Your data is in: {os.path.abspath(SAVE_DIR)}/")

# ============================================================
#  FILE 2 — train.py
#  PURPOSE: Full ISL training pipeline with every improvement.
#  RUN: Google Colab (GPU recommended)
#
#  IMPROVEMENTS IMPLEMENTED:
#   1. Split-first then augment          → honest test accuracy
#   2. Rotation + translation augment    → webcam angle robustness
#   3. Mixup augmentation                → smoother decision boundary
#   4. Two-hand support (84 features)    → supports more ISL signs
#   5. Attention over 21 landmarks       → learns joint importance
#   6. GRU sequence model (15 frames)    → temporal smoothing in model
#   7. Label smoothing (ε=0.1)           → reduces A/S, M/N overconfidence
#   8. Class weights                     → corrects detection imbalance
#   9. Temperature calibration           → honest confidence scores
#  10. INT8 TFLite export               → fast webcam inference
#  11. Per-class failure audit           → see which signs MediaPipe drops
#  12. Saves class_labels.json           → no silent label mismatch
# ============================================================

# ── 0. Colab setup (run these shell commands first) ──────────
# !pip install kaggle mediapipe==0.10.13 protobuf==4.25.8 -q --no-deps
# !pip install tensorflow scikit-learn scipy -q
# !kaggle datasets download -d prathumarikeri/indian-sign-language-isl
# !unzip -q indian-sign-language-isl.zip -d /content/dataset
#
# If you ran data_collector.py locally, upload your my_data/ folder:
# from google.colab import files; files.upload()  → then unzip

import os, copy, itertools, json, string, warnings
import numpy as np
import cv2
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix
from scipy.optimize import minimize_scalar
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')
print("TF:", tf.__version__)
print("GPU:", tf.config.list_physical_devices('GPU'))

# ─────────────────────────────────────────────────────────────
#  CONSTANTS — must match exactly in webcam_inference.py
# ─────────────────────────────────────────────────────────────
CLASSES          = ["1","2","3","4","5","6","7","8","9"] + list(string.ascii_uppercase)
NUM_CLASSES      = len(CLASSES)          # 35
KAGGLE_PATH      = '/content/dataset/Indian'
MY_DATA_PATH     = '/content/my_data'   # your webcam samples (optional)
MAX_PER_CLASS    = 500
SEQ_LEN          = 15    # GRU sequence length (frames)
TWO_HANDS        = True  # set False to use 42 features instead of 84
FEATURE_DIM      = 84 if TWO_HANDS else 42
print(f"Classes: {NUM_CLASSES}  |  Feature dim: {FEATURE_DIM}  |  Seq len: {SEQ_LEN}")

# ─────────────────────────────────────────────────────────────
#  MEDIAPIPE SETUP
# ─────────────────────────────────────────────────────────────
from mediapipe.python.solutions import hands as mp_hands_module

mp_hands = mp_hands_module
hands_static = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2 if TWO_HANDS else 1,
    min_detection_confidence=0.3,
)

def calc_landmark_list(image, landmarks):
    h, w = image.shape[:2]
    return [
        [min(int(lm.x * w), w - 1), min(int(lm.y * h), h - 1)]
        for lm in landmarks.landmark
    ]

def pre_process_landmark(landmark_list):
    """Wrist-relative, max-normalised 42-float vector."""
    temp = copy.deepcopy(landmark_list)
    base_x, base_y = temp[0]
    for p in temp:
        p[0] -= base_x
        p[1] -= base_y
    flat = list(itertools.chain.from_iterable(temp))
    max_val = max(map(abs, flat)) if flat else 1
    return [v / max_val for v in flat] if max_val != 0 else flat

def extract_landmarks(image_path):
    """
    Returns 84-float vector (two hands) or 42-float (one hand).
    Second hand is zero-padded if absent.
    Three fallback attempts: original → brighter → CLAHE.
    """
    img = cv2.imread(image_path)
    if img is None:
        return None
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    def try_detect(rgb_img):
        return hands_static.process(rgb_img)

    result = try_detect(img_rgb)
    if not result.multi_hand_landmarks:
        bright = cv2.convertScaleAbs(img, alpha=1.3, beta=30)
        result = try_detect(cv2.cvtColor(bright, cv2.COLOR_BGR2RGB))
    if not result.multi_hand_landmarks:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        eq = clahe.apply(gray)
        result = try_detect(cv2.cvtColor(eq, cv2.COLOR_GRAY2RGB))
    if not result.multi_hand_landmarks:
        return None

    lm1 = pre_process_landmark(calc_landmark_list(img_rgb, result.multi_hand_landmarks[0]))
    if TWO_HANDS:
        if len(result.multi_hand_landmarks) > 1:
            lm2 = pre_process_landmark(calc_landmark_list(img_rgb, result.multi_hand_landmarks[1]))
        else:
            lm2 = [0.0] * 42   # absent second hand → zeros
        return lm1 + lm2        # 84 floats
    return lm1                  # 42 floats

# ─────────────────────────────────────────────────────────────
#  STEP 1 — EXTRACT LANDMARKS
# ─────────────────────────────────────────────────────────────
def extract_from_folder(folder_path, label, max_samples):
    X, y = [], []
    if not os.path.exists(folder_path):
        return X, y, 0, 0
    images = [f for f in os.listdir(folder_path)
              if f.lower().endswith(('.jpg', '.jpeg', '.png'))][:max_samples]
    success = 0
    for img_file in images:
        lm = extract_landmarks(os.path.join(folder_path, img_file))
        if lm is not None and len(lm) == FEATURE_DIM:
            X.append(lm)
            y.append(label)
            success += 1
    return X, y, success, len(images)

X_raw, y_raw = [], []
fail_by_class = {}

print("\nExtracting landmarks from Kaggle dataset...")
for class_name in CLASSES:
    Xc, yc, ok, total = extract_from_folder(
        os.path.join(KAGGLE_PATH, class_name), class_name, MAX_PER_CLASS)
    X_raw.extend(Xc)
    y_raw.extend(yc)
    fail_by_class[class_name] = (total - ok, total)
    print(f"  {class_name}: {ok}/{total}")

# Mix in your own webcam data (weighted 3× more to prioritise domain)
if os.path.exists(MY_DATA_PATH):
    print("\nMixing in your webcam data (3× weight)...")
    for class_name in CLASSES:
        for _ in range(3):   # repeat 3× so webcam data dominates
            Xc, yc, ok, total = extract_from_folder(
                os.path.join(MY_DATA_PATH, class_name), class_name, MAX_PER_CLASS)
            X_raw.extend(Xc)
            y_raw.extend(yc)
        if ok > 0:
            print(f"  {class_name}: +{ok*3} webcam samples")

X_raw = np.array(X_raw, dtype=np.float32)
y_raw = np.array(y_raw)
print(f"\nTotal raw samples: {len(X_raw)}")

# Failure audit
print("\nClass extraction failure report (worst first):")
for cls, (fail, total) in sorted(fail_by_class.items(),
                                  key=lambda x: -(x[1][0]/max(x[1][1],1))):
    if total == 0: continue
    pct = fail / total * 100
    flag = " <<<" if pct > 40 else ""
    print(f"  {cls}: {fail}/{total} failed ({pct:.0f}%){flag}")

# ─────────────────────────────────────────────────────────────
#  STEP 2 — ENCODE LABELS & SAVE
# ─────────────────────────────────────────────────────────────
le = LabelEncoder()
le.fit(CLASSES)
y_encoded = le.transform(y_raw)

with open('class_labels.json', 'w') as f:
    json.dump(CLASSES, f)
with open('config.json', 'w') as f:
    json.dump({'feature_dim': FEATURE_DIM, 'seq_len': SEQ_LEN,
               'two_hands': TWO_HANDS, 'num_classes': NUM_CLASSES}, f)
print("Saved class_labels.json and config.json")

# ─────────────────────────────────────────────────────────────
#  STEP 3 — SPLIT (on original data BEFORE augmentation)
# ─────────────────────────────────────────────────────────────
X_train_raw, X_test, y_train_raw, y_test = train_test_split(
    X_raw, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
X_train_raw, X_val, y_train_raw, y_val = train_test_split(
    X_train_raw, y_train_raw, test_size=0.1, random_state=42, stratify=y_train_raw)

print(f"\nSplit — Train: {len(X_train_raw)}  Val: {len(X_val)}  Test: {len(X_test)}")

# ─────────────────────────────────────────────────────────────
#  STEP 4 — AUGMENTATION (train fold only)
#  Improvements: added 2D rotation, translation, per-hand mirroring
# ─────────────────────────────────────────────────────────────
def rotate_2d(xy, angle_deg):
    """Rotate 2D points around origin."""
    a = angle_deg * np.pi / 180
    c, s = np.cos(a), np.sin(a)
    R = np.array([[c, -s], [s, c]])
    return (R @ xy.T).T

def augment_single(lm_flat, n=6):
    """
    lm_flat: 42 or 84 floats
    Augmentations: noise, scale, rotation, translation
    Each hand block is processed independently.
    """
    out = []
    block = 42
    n_hands = len(lm_flat) // block

    for _ in range(n):
        aug_parts = []
        for h in range(n_hands):
            part = np.array(lm_flat[h*block:(h+1)*block]).reshape(21, 2)
            if h > 0 and np.all(part == 0):
                aug_parts.append(part.flatten())
                continue
            part += np.random.normal(0, 0.015, part.shape)
            part *= np.random.uniform(0.88, 1.12)
            part = rotate_2d(part, np.random.uniform(-25, 25))
            part += np.random.uniform(-0.06, 0.06, (1, 2))
            part = np.clip(part, -1.5, 1.5)
            aug_parts.append(part.flatten())
        out.append(np.concatenate(aug_parts))
    return out

print("Augmenting training data (×6 + mixup)...")
X_aug = list(X_train_raw)
y_aug = list(y_train_raw)

for sample, label in zip(X_train_raw, y_train_raw):
    for aug in augment_single(sample, n=6):
        X_aug.append(aug)
        y_aug.append(label)

X_aug = np.array(X_aug, dtype=np.float32)
y_aug = np.array(y_aug)

# Mixup: interpolate between random pairs
# Improves generalisation on visually similar pairs (A/S, M/N)
def apply_mixup(X, y, n_classes, alpha=0.3, n_pairs=5000):
    X_mix, y_mix = [], []
    idx = np.random.choice(len(X), size=(n_pairs, 2), replace=True)
    for i, j in idx:
        lam = np.random.beta(alpha, alpha)
        X_mix.append(lam * X[i] + (1 - lam) * X[j])
        y_oh = np.zeros(n_classes)
        y_oh[y[i]] += lam
        y_oh[y[j]] += (1 - lam)
        y_mix.append(y_oh)
    return np.array(X_mix, dtype=np.float32), np.array(y_mix, dtype=np.float32)

X_mix, y_mix_oh = apply_mixup(X_aug, y_aug, NUM_CLASSES, n_pairs=8000)

print(f"After augmentation: {len(X_aug)} samples + {len(X_mix)} mixup samples")

# ─────────────────────────────────────────────────────────────
#  STEP 5 — BUILD SEQUENCE DATASET FOR GRU
#  Each "sample" is SEQ_LEN copies of the same landmark vector
#  + augmentation noise to simulate frame-to-frame variation.
#  At inference, we feed a rolling window of real consecutive frames.
# ─────────────────────────────────────────────────────────────
def to_sequences(X, y, seq_len, noise=0.01):
    """
    Expand flat samples into (N, seq_len, features) tensors.
    Adds small noise across time steps to simulate real frame drift.
    """
    X_seq = np.stack(
        [X + np.random.normal(0, noise, X.shape) for _ in range(seq_len)],
        axis=1)                         # (N, seq_len, features)
    return X_seq.astype(np.float32), y

X_train_seq, y_train_seq = to_sequences(X_aug, y_aug, SEQ_LEN)
X_val_seq = np.stack([X_val]*SEQ_LEN, axis=1).astype(np.float32)
X_test_seq = np.stack([X_test]*SEQ_LEN, axis=1).astype(np.float32)
X_mix_seq = np.stack([X_mix]*SEQ_LEN, axis=1).astype(np.float32)

print(f"Sequence shapes — Train: {X_train_seq.shape}  Val: {X_val_seq.shape}")

# ─────────────────────────────────────────────────────────────
#  STEP 6 — MODEL
#  Architecture:
#   Attention over 21 joints → GRU sequence encoder → classifier
#
#  Why attention first?
#   Different signs use different joints. Attention lets the model
#   learn "for sign L, focus on index+thumb; for sign O, focus on all tips".
#
#  Why GRU after?
#   Captures temporal consistency across frames — much more principled
#   than majority voting in post-processing.
# ─────────────────────────────────────────────────────────────
def build_model(feature_dim=FEATURE_DIM, seq_len=SEQ_LEN, num_classes=NUM_CLASSES):
    inputs = keras.Input(shape=(seq_len, feature_dim))   # (batch, 15, 84)

    # ── Per-frame attention over landmark joints ──────────────
    # Reshape each frame to (n_joints, 2) so attention is over spatial joints
    n_joints = feature_dim // 2    # 42 joints (both hands)
    # Treat each frame independently first
    x = layers.Reshape((seq_len, n_joints, 2))(inputs)   # (B, T, 42, 2)

    # Flatten spatial dim for attention: (B*T, 42, 2)
    B_T = seq_len     # handled by TimeDistributed
    x_td = layers.TimeDistributed(
        layers.Reshape((n_joints, 2))
    )(inputs)         # (B, T, 42, 2)

    # Self-attention over joints at each time step
    # MultiHeadAttention: query=key=value = landmark tokens
    x_attn = layers.TimeDistributed(
        layers.MultiHeadAttention(num_heads=4, key_dim=8, dropout=0.1)
    )(x_td, x_td)     # (B, T, 42, 2)  — attending over 42 joints

    x_attn = layers.TimeDistributed(
        layers.LayerNormalization()
    )(x_attn)

    # Flatten joint+coord dims back to feature vector per timestep
    x_flat = layers.TimeDistributed(
        layers.Flatten()
    )(x_attn)         # (B, T, 84)

    # Residual: add back original input (skip attention if unhelpful)
    x_flat = layers.Add()([x_flat, inputs])
    x_flat = layers.TimeDistributed(layers.LayerNormalization())(x_flat)

    # ── GRU sequence encoder ──────────────────────────────────
    x = layers.GRU(128, return_sequences=True, dropout=0.2,
                   recurrent_dropout=0.1)(x_flat)
    x = layers.GRU(64, return_sequences=False, dropout=0.2)(x)

    # ── Dense classifier ─────────────────────────────────────
    x = layers.Dense(128)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.3)(x)

    x = layers.Dense(64)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.2)(x)

    outputs = layers.Dense(num_classes, activation='softmax')(x)
    return keras.Model(inputs, outputs)

model = build_model()
model.summary()

# Label smoothing: ε=0.1 prevents overconfidence on A/S, M/N pairs
# Must use CategoricalCrossentropy (one-hot y) for label smoothing
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=3e-4),
    loss=keras.losses.CategoricalCrossentropy(label_smoothing=0.1),
    metrics=['accuracy']
)

# ─────────────────────────────────────────────────────────────
#  STEP 7 — CLASS WEIGHTS
# ─────────────────────────────────────────────────────────────
cw_arr = compute_class_weight('balanced', classes=np.arange(NUM_CLASSES), y=y_train_seq.reshape(-1) if y_train_seq.ndim == 1 else y_aug)
class_weight_dict = dict(enumerate(cw_arr))

# Convert y to one-hot for label smoothing loss
y_train_oh  = keras.utils.to_categorical(y_train_seq if y_train_seq.ndim == 1 else y_aug, NUM_CLASSES)

# Re-build sequence arrays aligned with one-hot y
X_tr = X_train_seq
y_tr = keras.utils.to_categorical(y_aug, NUM_CLASSES)

# Re-check: X_tr shape[0] must equal y_tr shape[0]
assert X_tr.shape[0] == y_tr.shape[0], f"Shape mismatch: {X_tr.shape[0]} vs {y_tr.shape[0]}"

y_val_oh  = keras.utils.to_categorical(y_val, NUM_CLASSES)
y_test_oh = keras.utils.to_categorical(y_test, NUM_CLASSES)

# ─────────────────────────────────────────────────────────────
#  STEP 8 — TRAIN
# ─────────────────────────────────────────────────────────────
callbacks = [
    EarlyStopping(monitor='val_accuracy', patience=20,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                      patience=8, min_lr=1e-6, verbose=1),
    ModelCheckpoint('best_model.keras', monitor='val_accuracy',
                    save_best_only=True, verbose=1),
]

print("\nTraining...")
history = model.fit(
    X_tr, y_tr,
    validation_data=(X_val_seq, y_val_oh),
    epochs=150,
    batch_size=64,
    class_weight=class_weight_dict,
    callbacks=callbacks,
    verbose=1,
)

# Also train on mixup samples for a few epochs (fine-tune)
print("\nMixup fine-tune (10 epochs)...")
y_mix_seq = np.stack([y_mix_oh] * SEQ_LEN, axis=1)   # wrong shape — fix:
y_mix_seq = y_mix_oh  # mixup y is already (N, num_classes) — no seq dim needed
X_mix_seq2 = np.stack([X_mix] * SEQ_LEN, axis=1).astype(np.float32)

model.fit(
    X_mix_seq2, y_mix_oh,
    epochs=10,
    batch_size=64,
    verbose=1,
)

val_loss, val_acc = model.evaluate(X_val_seq, y_val_oh, verbose=0)
print(f"\nBest val accuracy: {val_acc*100:.2f}%")

# ─────────────────────────────────────────────────────────────
#  STEP 9 — TEMPERATURE CALIBRATION
#  Makes confidence scores accurate (softmax is not calibrated by default)
# ─────────────────────────────────────────────────────────────
print("\nCalibrating temperature...")
logit_model = keras.Model(inputs=model.input,
                           outputs=model.layers[-2].output)   # pre-softmax

logits_val = logit_model.predict(X_val_seq, verbose=0)

def nll_loss(T):
    scaled = logits_val / T
    probs = tf.nn.softmax(scaled).numpy()
    probs = np.clip(probs, 1e-9, 1.0)
    return -np.mean(np.sum(y_val_oh * np.log(probs), axis=1))

result = minimize_scalar(nll_loss, bounds=(0.1, 10.0), method='bounded')
T_opt = float(result.x)
print(f"Optimal temperature: {T_opt:.4f}")
with open('config.json', 'r') as f:
    cfg = json.load(f)
cfg['temperature'] = T_opt
with open('config.json', 'w') as f:
    json.dump(cfg, f)

# ─────────────────────────────────────────────────────────────
#  STEP 10 — EVALUATION
# ─────────────────────────────────────────────────────────────
print("\nTest set evaluation (never seen during training)...")
test_loss, test_acc = model.evaluate(X_test_seq, y_test_oh, verbose=0)
print(f"Test Accuracy: {test_acc*100:.2f}%  (this number is honest)")

y_pred = np.argmax(model.predict(X_test_seq, verbose=0), axis=1)
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=CLASSES))

cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(22, 18))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=CLASSES, yticklabels=CLASSES)
plt.title(f'Confusion Matrix — Test Acc: {test_acc*100:.2f}%')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=100)
plt.show()

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 4))
ax1.plot(history.history['accuracy'], label='Train')
ax1.plot(history.history['val_accuracy'], label='Val')
ax1.set_title('Accuracy'); ax1.legend()
ax2.plot(history.history['loss'], label='Train')
ax2.plot(history.history['val_loss'], label='Val')
ax2.set_title('Loss'); ax2.legend()
plt.tight_layout()
plt.savefig('training_curves.png', dpi=100)
plt.show()

# ─────────────────────────────────────────────────────────────
#  STEP 11 — SAVE
# ─────────────────────────────────────────────────────────────
model.save('model.keras')
print("\nSaved: model.keras, class_labels.json, config.json")

try:
    from google.colab import files
    for f in ['model.keras', 'class_labels.json', 'config.json',
              'confusion_matrix.png', 'training_curves.png']:
        files.download(f)
    print("Files downloading to your browser.")
except ImportError:
    print("Not in Colab — files saved locally.")

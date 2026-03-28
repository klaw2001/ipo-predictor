"""
IPO prediction model training module.
Uses XGBoost classifier to predict IPO listing day outcome.
"""

import os
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

SECTOR_CATEGORIES = [
    "Technology", "Insurance", "Retail", "Logistics", "FMCG",
    "Finance", "Healthcare", "Manufacturing", "Education",
    "Energy", "RealEstate", "Auto", "Telecom", "Chemicals",
    "Pharma", "Restaurant", "Defence", "Banking", "Engineering",
    "Agriculture", "Advertising", "Infrastructure", "EV",
    "Travel", "Textile", "Other"
]

LABEL_ORDER = ["STRONG_CAUTION", "CAUTIOUS", "NEUTRAL", "POSITIVE", "STRONG_POSITIVE"]

MODEL_PATH = Path(__file__).parent / "xgboost_model.pkl"
ENCODER_PATH = Path(__file__).parent / "label_encoder.pkl"
DATA_PATH = Path(__file__).parent.parent / "data" / "historical_ipos.csv"


def encode_sector(sector: str) -> int:
    sector = sector.strip()
    if sector in SECTOR_CATEGORIES:
        return SECTOR_CATEGORIES.index(sector)
    return len(SECTOR_CATEGORIES) - 1  # "Other"


def build_feature_vector(row) -> list:
    """
    Build a 12-feature vector from either a dict or DataFrame row.
    Features (in order):
      0: issue_size_cr
      1: price_band_high
      2: lot_size
      3: gmp_percent
      4: qib_times
      5: hni_times
      6: retail_times
      7: total_times
      8: nifty_change_1w
      9: vix_current
      10: pe_ratio
      11: sector_encoded
    """
    def get(key, default=0.0):
        if isinstance(row, dict):
            return float(row.get(key, default) or default)
        return float(getattr(row, key, default) or default)

    # Handle CSV column name differences vs API request field names
    gmp = get('gmp_percent_final') or get('gmp_percent')
    qib = get('qib_times_final') or get('qib_times')
    hni = get('hni_times_final') or get('hni_times')
    retail = get('retail_times_final') or get('retail_times')
    total = get('total_times_final') or get('total_times')
    vix = get('vix_at_close') or get('vix_current', 15.0)
    nifty = get('nifty_change_1w')
    sector = row.get('sector', 'Other') if isinstance(row, dict) else getattr(row, 'sector', 'Other')

    return [
        get('issue_size_cr'),
        get('price_band_high'),
        get('lot_size'),
        gmp,
        qib,
        hni,
        retail,
        total,
        nifty,
        vix,
        get('pe_ratio'),
        encode_sector(str(sector)),
    ]


def train_model():
    """Train XGBoost classifier on historical IPO data and save model."""
    print(f"[Train] Loading data from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"[Train] Loaded {len(df)} historical IPO records")

    # Encode labels with fixed order
    label_encoder = LabelEncoder()
    label_encoder.classes_ = np.array(LABEL_ORDER)
    y = label_encoder.transform(df['label'])

    # Build feature matrix
    X = np.array([build_feature_vector(row) for _, row in df.iterrows()])

    # Train/test split — use stratify only if every class has >= 2 members
    from collections import Counter
    class_counts = Counter(y)
    can_stratify = all(v >= 2 for v in class_counts.values())
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if can_stratify else None
    )
    if not can_stratify:
        print(f"[Train] Warning: some classes have < 2 members {dict(class_counts)}, stratify disabled")

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
        early_stopping_rounds=20,
    )

    # Save model and encoder
    MODEL_PATH.parent.mkdir(exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(ENCODER_PATH, "wb") as f:
        pickle.dump(label_encoder, f)

    # Print evaluation
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"[Train] Test accuracy: {acc:.2%}")
    present_labels = sorted(set(y_test) | set(preds))
    present_names = [LABEL_ORDER[i] for i in present_labels]
    print(classification_report(y_test, preds, labels=present_labels, target_names=present_names))
    print(f"[Train] Model saved to {MODEL_PATH}")
    return model, label_encoder


def load_model():
    """Load trained model and encoder from disk."""
    if not MODEL_PATH.exists():
        print("[Train] Model not found, training now...")
        return train_model()
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(ENCODER_PATH, "rb") as f:
        label_encoder = pickle.load(f)
    return model, label_encoder


if __name__ == "__main__":
    train_model()

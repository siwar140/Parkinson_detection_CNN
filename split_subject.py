import os
import re
import shutil
from collections import defaultdict
CONTROL_DIR = r"C:\Users\MSI\Desktop\pd_project\pd_project\DATA\Segmented_1\spectnumpy_8K\Control"
PD_DIR      = r"C:\Users\MSI\Desktop\pd_project\pd_project\DATA\Segmented_1\spectnumpy_8K\Patologicas"
OUTPUT_DIR  = r"C:\Users\MSI\Desktop\pd_project\pd_project\DATA\Segmented_1\Split_test8K_BD"

VAL_RATIO  = 0.15   # 15 % validation
TEST_RATIO = 0.15   # 15 % test  (train ≈ 70 %)


def extract_subject_id(filename):
    """
    Extrait l'ID sujet indépendamment de la lettre qui suit.

    Exemples :
    AVPEPUDEAC0052i1_segment_1.npy -> AC0052
    AVPEPUDEAC0052e1_segment_1.npy -> AC0052
    AVPEPUDEA123i2_segment_8.npy   -> A123
    """
    filename = os.path.splitext(filename)[0]  # retire .npy
    match = re.search(r'(AC\d+|A\d+)[A-Za-z]\d+_segment_', filename)
    if match:
        return match.group(1)
    raise ValueError(f"Impossible d'extraire l'ID sujet : {filename}")


def group_subjects(folder):
    subjects = defaultdict(list)
    for f in os.listdir(folder):
        p = os.path.join(folder, f)
        if os.path.isfile(p):
            sid = extract_subject_id(f)
            subjects[sid].append(p)
    return subjects


def choose_subjects_dp(counts, target, forbidden=None):
    """
    Choisit un sous-ensemble de sujets dont la somme des segments
    est la plus proche possible de `target`.

    - counts    : dict {sid: nb_segments}
    - target    : nb de segments visé
    - forbidden : set de sids déjà utilisés (exclus du choix)

    Retourne (set_sids, somme_obtenue).
    """
    forbidden = forbidden or set()
    items = [(sid, w) for sid, w in counts.items() if sid not in forbidden]

    # dp[s] = liste des sids permettant d'obtenir exactement s segments
    dp = {0: []}
    for sid, w in items:
        current = list(dp.items())
        for s, subset in current:
            ns = s + w
            if ns not in dp:
                dp[ns] = subset + [sid]

    best = min(dp.keys(), key=lambda x: abs(x - target))
    return set(dp[best]), best


def copy_subjects(subjects, sets, dirs):
    """
    sets : dict {"train": set_sids, "val": set_sids, "test": set_sids}
    dirs : dict {"train": path, "val": path, "test": path}
    """
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)

    for sid, files in subjects.items():
        if sid in sets["test"]:
            dst = dirs["test"]
        elif sid in sets["val"]:
            dst = dirs["val"]
        else:
            dst = dirs["train"]

        for f in files:
            shutil.copy2(f, os.path.join(dst, os.path.basename(f)))


def process(name, src, train_dst, val_dst, test_dst):
    subjects = group_subjects(src)
    counts = {k: len(v) for k, v in subjects.items()}
    total_seg = sum(counts.values())

    # Cibles en nombre de segments
    target_test = round(total_seg * TEST_RATIO)
    target_val  = round(total_seg * VAL_RATIO)

    # 1) Test d'abord (sur tous les sujets)
    test_set, test_obtained = choose_subjects_dp(counts, target_test)

    # 2) Validation ensuite (en excluant les sujets déjà pris pour le test)
    val_set, val_obtained = choose_subjects_dp(counts, target_val, forbidden=test_set)

    # 3) Le reste -> train
    train_set = set(subjects.keys()) - test_set - val_set

    copy_subjects(
        subjects,
        {"train": train_set, "val": val_set, "test": test_set},
        {"train": train_dst, "val": val_dst, "test": test_dst},
    )

    train_seg = sum(counts[k] for k in train_set)
    val_seg   = sum(counts[k] for k in val_set)
    test_seg  = sum(counts[k] for k in test_set)

    print(f"\n===== {name} =====")
    print("Sujets total      :", len(subjects))
    print("Sujets train      :", len(train_set))
    print("Sujets validation :", len(val_set))
    print("Sujets test       :", len(test_set))
    print("---")
    print("Segments total    :", total_seg)
    print("Segments train    :", train_seg)
    print("Segments val      :", val_seg)
    print("Segments test     :", test_seg)
    print("---")
    print("Cible val         :", target_val, "| obtenu :", val_obtained)
    print("Cible test        :", target_test, "| obtenu :", test_obtained)
    print("Ratio val réel    : {:.2f}%".format(100 * val_seg / total_seg))
    print("Ratio test réel   : {:.2f}%".format(100 * test_seg / total_seg))
    print("Ratio train réel  : {:.2f}%".format(100 * train_seg / total_seg))


def main():
    process(
        "CONTROL",
        CONTROL_DIR,
        os.path.join(OUTPUT_DIR, "Train", "Control"),
        os.path.join(OUTPUT_DIR, "Validation", "Control"),
        os.path.join(OUTPUT_DIR, "Test", "Control"),
    )
    process(
        "PATOLOGICAS",
        PD_DIR,
        os.path.join(OUTPUT_DIR, "Train", "Patologicas"),
        os.path.join(OUTPUT_DIR, "Validation", "Patologicas"),
        os.path.join(OUTPUT_DIR, "Test", "Patologicas"),
    )
    print("\nTerminé. Aucun sujet n'est partagé entre Train, Validation et Test.")


if __name__ == "__main__":
    main()
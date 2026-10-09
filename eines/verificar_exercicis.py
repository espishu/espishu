"""
Verifica la selecció d'exercicis per a ESPISHU contra Free Exercise DB
(https://github.com/yuhonas/free-exercise-db, llicència Unlicense / domini públic).

Ús:  python verificar_exercicis.py
Resultat:
  - Mostra quins exercicis existeixen amb el nom exacte i quins no (amb suggeriments).
  - Crea "biblioteca.json" només amb els exercicis trobats, amb el nom en català,
    el grup, el nivell i les URL completes de les imatges.
"""
import difflib
import json
import sys
import urllib.request

URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"

# (nom exacte en anglès, nom en català, grup, nivell)
# nivell: "inici" = des del primer dia | "despres" = quan porti unes setmanes
SELECCIO = [
    # --- ESQUENA ---
    ("Superman", "Superman", "esquena", "inici"),
    ("Hyperextensions With No Hyperextension Bench", "Extensió lumbar a terra", "esquena", "inici"),
    ("One-Arm Dumbbell Row", "Rem a una mà recolzat", "esquena", "inici"),
    ("Band Pull Apart", "Separar la banda", "esquena", "inici"),
    ("Back Flyes - With Bands", "Obertures posteriors amb banda", "esquena", "inici"),
    ("Dumbbell Shrug", "Encongir espatlles amb peses", "esquena", "despres"),
    ("Stiff-Legged Dumbbell Deadlift", "Pes mort amb cames semirígides", "esquena", "despres"),
    # --- CORE / ABDOMEN ---
    ("Pelvic Tilt Into Bridge", "Inclinació pèlvica + pont", "core", "inici"),
    ("Dead Bug", "Dead bug", "core", "inici"),
    ("Plank", "Planxa", "core", "inici"),
    ("Side Bridge", "Planxa lateral", "core", "inici"),
    ("Bent-Knee Hip Raise", "Elevació de malucs", "core", "despres"),
    ("Alternate Heel Touchers", "Tocar talons", "core", "inici"),
    ("Cross-Body Crunch", "Abdominal creuat", "core", "despres"),
    # --- GLUTIS I CAMES ---
    ("Butt Lift (Bridge)", "Pont de glutis", "cames", "inici"),
    ("Single Leg Glute Bridge", "Pont a una cama", "cames", "despres"),
    ("Glute Kickback", "Patada de glutis a quatre grapes", "cames", "inici"),
    ("Side Leg Raises", "Elevació lateral de cama", "cames", "inici"),
    ("Bodyweight Squat", "Esquat a la cadira (només fins a seure)", "cames", "inici"),
    ("Dumbbell Step Ups", "Pujar a un esglaó baix", "cames", "despres"),
    ("Standing Dumbbell Calf Raise", "Pujar talons amb peses", "cames", "inici"),
    ("Band Hip Adductions", "Obrir la cama amb banda", "cames", "inici"),
    ("Ankle Circles", "Cercles de turmell", "cames", "inici"),
    # --- PIT, ESPATLLES I BRAÇOS ---
    ("Incline Push-Up", "Flexions inclinades (taula o paret)", "pit", "inici"),
    ("Pushups", "Flexions (amb genolls a terra al principi)", "pit", "despres"),
    ("Dumbbell Floor Press", "Press de pit a terra", "pit", "inici"),
    ("Side Lateral Raise", "Elevació lateral", "espatlles", "inici"),
    ("Front Dumbbell Raise", "Elevació frontal", "espatlles", "inici"),
    ("Alternating Deltoid Raise", "Elevacions frontal i lateral alternes", "espatlles", "despres"),
    ("Seated Dumbbell Press", "Press d'espatlles assegut", "espatlles", "inici"),
    ("Arm Circles", "Cercles de braços", "espatlles", "inici"),
    ("Dumbbell Bicep Curl", "Curl de bíceps", "bracos", "inici"),
    ("Alternate Hammer Curl", "Curl martell alternat", "bracos", "inici"),
    ("Standing Dumbbell Triceps Extension", "Extensió de tríceps", "bracos", "inici"),
    # --- ESTIRAMENTS I MOBILITAT ---
    ("Cat Stretch", "Gat-camell", "mobilitat", "inici"),
    ("Child's Pose", "Postura del nen", "estiraments", "inici"),
    ("Spinal Stretch", "Torsió d'esquena", "estiraments", "inici"),
    ("Hug Knees To Chest", "Abraçar genolls al pit", "estiraments", "inici"),
    ("Hip Circles (prone)", "Cercles de maluc", "mobilitat", "inici"),
    ("Ankle On The Knee", "Turmell sobre el genoll", "estiraments", "inici"),
    ("90/90 Hamstring", "Isquiotibials 90/90", "estiraments", "inici"),
    ("Hamstring Stretch", "Isquiotibials estirat amb cinta", "estiraments", "inici"),
    ("Seated Floor Hamstring Stretch", "Isquiotibials assegut", "estiraments", "inici"),
    ("Kneeling Hip Flexor", "Flexor de maluc agenollat (amb coixí)", "estiraments", "inici"),
    ("Standing Hip Flexors", "Flexor de maluc dempeus", "estiraments", "inici"),
    ("IT Band and Glute Stretch", "Glutis i banda iliotibial", "estiraments", "inici"),
    ("Side-Lying Floor Stretch", "Estirament lateral estirat", "estiraments", "inici"),
    ("Calf Stretch Hands Against Wall", "Bessons a la paret", "estiraments", "inici"),
    ("Chair Upper Body Stretch", "Pit i espatlles amb cadira", "estiraments", "inici"),
    ("Upper Back Stretch", "Esquena alta", "estiraments", "inici"),
    ("Shoulder Stretch", "Espatlla", "estiraments", "inici"),
    ("Triceps Stretch", "Tríceps", "estiraments", "inici"),
    ("Round The World Shoulder Stretch", "Espatlles amb cinta (volta)", "mobilitat", "inici"),
    ("Side Neck Stretch", "Coll lateral", "estiraments", "inici"),
    ("Chin To Chest Stretch", "Barbeta al pit", "estiraments", "inici"),
    ("Windmills", "Molinet (mobilitat de tronc)", "mobilitat", "despres"),
]


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    print("Descarregant la base de dades...")
    with urllib.request.urlopen(URL, timeout=60) as r:
        dades = json.loads(r.read().decode("utf-8"))
    per_nom = {e["name"].lower(): e for e in dades}
    noms = [e["name"] for e in dades]
    print(f"{len(dades)} exercicis a la base de dades.\n")

    trobats, no_trobats, biblioteca = [], [], []
    for nom_en, nom_ca, grup, nivell in SELECCIO:
        ex = per_nom.get(nom_en.lower())
        if ex:
            trobats.append(nom_en)
            biblioteca.append({
                "id": ex["id"],
                "nom_ca": nom_ca,
                "nom_en": ex["name"],
                "grup": grup,
                "nivell": nivell,
                "categoria": ex["category"],
                "material": ex["equipment"],
                "muscles_principals": ex["primaryMuscles"],
                "muscles_secundaris": ex["secondaryMuscles"],
                "instruccions_en": ex["instructions"],
                "imatges": [IMG + img for img in ex["images"]],
            })
        else:
            suggeriments = difflib.get_close_matches(nom_en, noms, n=3, cutoff=0.5)
            no_trobats.append((nom_en, suggeriments))

    print(f"TROBATS ({len(trobats)}/{len(SELECCIO)}):")
    for n in trobats:
        print(f"  [OK] {n}")

    print(f"\nNO TROBATS ({len(no_trobats)}):")
    for n, sug in no_trobats:
        print(f"  [--] {n}   ->  potser: {', '.join(sug) if sug else '(cap semblant)'}")

    with open("biblioteca.json", "w", encoding="utf-8") as f:
        json.dump(biblioteca, f, ensure_ascii=False, indent=2)
    print(f"\nCreat biblioteca.json amb {len(biblioteca)} exercicis.")


if __name__ == "__main__":
    main()

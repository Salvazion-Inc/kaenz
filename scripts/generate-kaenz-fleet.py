"""Generate lib/yachts.ts and unique captain SVG avatars from the Kaenz photo set."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_TS = ROOT / "lib" / "yachts.ts"
AVATAR_DIR = ROOT / "public" / "crew" / "avatars"

PORTS = [
    ("Miami Beach Marina", "miami-beach-marina", 25.7785, -80.1452, 8),
    ("Island Gardens Miami", "island-gardens", 25.7851, -80.1774, 6),
    ("Las Olas Marina", "las-olas-marina", 26.1192, -80.108, 14),
    ("Hollywood Marina", "hollywood-marina", 26.0114, -80.1238, 12),
    ("Palm Beach Town Docks", "palm-beach-docks", 26.7056, -80.0364, 18),
    ("Dinner Key Marina", "dinner-key", 25.7274, -80.2347, 10),
    ("Haulover Park Marina", "haulover", 25.9029, -80.1231, 9),
    ("Port Everglades", "port-everglades", 26.094, -80.115, 11),
    ("PortMiami", "port-miami", 25.778, -80.177, 6),
]

# id, name, file, class, length, guests, traits
BOATS = [
    ("galeon", "Galeon", "galeon.webp", "Motor yacht", 50, 13, ["luxurious"]),
    ("tempest-42", "Tempest 42", "tempest-42.webp", "Express cruiser", 42, 10, ["fast"]),
    ("savvy", "SAVVY", "savvy.webp", "Day cruiser", 32, 8, ["small", "fast"]),
    ("pink-lady", "Pink Lady", "pink-lady.webp", "Flybridge yacht", 50, 12, ["luxurious"]),
    ("amani", "Amani", "amani.webp", "Flybridge yacht", 46, 12, ["luxurious"]),
    ("barolo", "Barolo", "barolo.webp", "Flybridge yacht", 45, 12, ["luxurious"]),
    ("decisions", "Decisions", "decisions.webp", "Flybridge yacht", 48, 12, ["luxurious"]),
    ("knotty-lane", "Knotty Lane", "knotty-lane.webp", "Express yacht", 48, 12, ["luxurious"]),
    ("orion", "Orion", "orion.webp", "Catamaran", 42, 12, ["luxurious"]),
    ("tequila", "Tequila", "tequila.webp", "Express yacht", 47, 12, ["luxurious"]),
    ("vinya", "Vinya", "vinya.webp", "Flybridge yacht", 45, 12, ["luxurious"]),
    ("quit-n-time", "Quit N Time", "quit-n-time.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("mamaseata", "Mamaseata", "mamaseata.webp", "Flybridge yacht", 38, 10, ["luxurious"]),
    ("chichochu", "Chichochu", "chichochu.webp", "Express cruiser", 40, 10, ["fast"]),
    ("distraction", "Distraction", "distraction-fl0592re.webp", "Express cruiser", 42, 10, ["fast"]),
    ("dream-boat", "Dream Boat", "dream-boat.webp", "Express cruiser", 37, 8, ["fast"]),
    ("fantasea", "Fantasea", "fantasea.webp", "Express cruiser", 40, 10, ["fast"]),
    ("jetset", "JetSet", "jetset.webp", "Express cruiser", 40, 10, ["fast"]),
    ("josy", "Josy", "josy.webp", "Express cruiser", 40, 10, ["fast"]),
    ("vacilon", "Vacilón", "vacilon-fl7634ln.webp", "Express cruiser", 38, 10, ["fast"]),
    ("icon", "ICON", "icon-fl4916po.webp", "Day cruiser", 28, 8, ["small", "fast"]),
    ("monterey", "Monterey", "monterey-fl6833st.webp", "Bowrider", 22, 6, ["small"]),
    ("problem-solved", "Problem Solved", "problem-solved.webp", "Center console", 24, 8, ["small"]),
    ("fl-0338-rc", "Blue Current", "fl0338rc.webp", "Express cruiser", 32, 8, ["fast"]),
    ("fl-11234362", "Silver Saxdor", "fl11234362.webp", "Day cruiser", 40, 10, ["fast"]),
    ("fl-1268-me", "Eight Up", "fl1268me.webp", "Deck boat", 26, 8, ["small"]),
    ("fl-1511-nd", "Pad Day", "fl1511nd.webp", "Express cruiser", 32, 8, ["fast"]),
    ("fl-1636-sn", "Bimini Day", "fl1636sn.webp", "Bowrider", 22, 6, ["small"]),
    ("fl-2336-al", "Century Blue", "fl2336al.webp", "Center console", 26, 8, ["small", "fast"]),
    ("fl-2514-ts", "Cabin Line", "fl2514ts.webp", "Day cruiser", 37, 10, ["fast", "luxurious"]),
    ("fl-2540-rh", "Ferris Bow", "fl2540rh.webp", "Bowrider", 20, 6, ["small"]),
    ("fl-3014-rr", "Tahoe Run", "fl3014rr.webp", "Bowrider", 20, 6, ["small"]),
    ("fl-3697-sn", "Magenta", "fl3697sn.webp", "Day cruiser", 37, 10, ["fast"]),
    ("fl-4229-sr", "Express SR", "fl4229sr.webp", "Express cruiser", 40, 10, ["fast"]),
    ("fl-4621-ms", "White Sundancer", "fl4621ms.webp", "Express cruiser", 32, 8, ["fast"]),
    ("fl-5579-pj", "Cruisers Cream", "fl5579pj.webp", "Express cruiser", 34, 8, ["fast"]),
    ("fl-5732-rw", "Larson Black", "fl5732rw.webp", "Express cruiser", 30, 8, ["fast"]),
    ("fl-5818-tl", "Bravo", "fl5818tl.webp", "Center console", 26, 8, ["small", "fast"]),
    ("fl-6032-mx", "Navy Sundancer", "fl6032mx.webp", "Express cruiser", 32, 8, ["fast"]),
    ("fl-6565-sj", "Picnic Deck", "fl6565sj.webp", "Deck boat", 24, 8, ["small"]),
    ("fl-6607-pz", "Canal Gold", "fl6607pz.webp", "Bowrider", 24, 6, ["small"]),
    ("fl-8555-rn", "Brickell Sea Ray", "fl8555rn.webp", "Day cruiser", 26, 8, ["small"]),
    ("fl-9127-tg", "Regal Bridge", "fl9127tg.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("fl-9344-rd", "Ladder Light", "fl9344rd.webp", "Day cruiser", 32, 8, ["fast", "small"]),
    ("fl-9372-pz", "Open Deck", "fl9372pz.webp", "Deck boat", 24, 8, ["small"]),
    ("fl-9452-tj", "Rinker Run", "fl9452tj.webp", "Bowrider", 22, 6, ["small"]),
    ("fl-9730-rr", "Element XR7", "fl9730rr.webp", "Deck boat", 18, 6, ["small"]),
    ("fl-9748-ly", "Harbor White", "fl9748ly.webp", "Express cruiser", 32, 8, ["fast"]),
    ("fl-9786-ps", "Hurricane Float", "fl9786ps.webp", "Deck boat", 24, 8, ["small"]),
    ("fl-9912-ne", "Sundown", "fl9912ne.webp", "Express cruiser", 32, 8, ["fast"]),
    ("tide-runner", "Tide Runner", "1.webp", "Express cruiser", 32, 8, ["small", "fast"]),
    ("bay-whisper", "Bay Whisper", "2.webp", "Express cruiser", 30, 8, ["small", "fast"]),
    ("night-current", "Night Current", "3.webp", "Express cruiser", 32, 8, ["fast"]),
    ("pocket-element", "Pocket Element", "4.webp", "Bowrider", 18, 5, ["small"]),
    ("coconut-cruiser", "Coconut Cruiser", "5.webp", "Day cruiser", 28, 6, ["small"]),
    ("dusk-patrol", "Dusk Patrol", "6.webp", "Center console", 24, 6, ["small"]),
    ("aqua-scout", "Aqua Scout", "7.webp", "Center console", 26, 6, ["small"]),
    ("mini-element", "Mini Element", "8.webp", "Bowrider", 18, 5, ["small"]),
    ("golden-hour", "Golden Hour", "9.webp", "Day cruiser", 28, 8, ["small", "fast"]),
    ("sailfish", "Sailfish", "10.webp", "Walkaround", 28, 6, ["small", "fast"]),
    ("blue-sundancer", "Blue Sundancer", "11.webp", "Express cruiser", 40, 10, ["fast", "luxurious"]),
    ("palacio", "Palacio", "12.webp", "Motor yacht", 90, 13, ["luxurious"]),
    ("navy-sedan", "Navy Sedan", "13.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("princess-crown", "Princess Crown", "14.webp", "Flybridge yacht", 55, 13, ["luxurious"]),
    ("midnight-predator", "Midnight Predator", "15.webp", "Express yacht", 52, 12, ["luxurious", "fast"]),
    ("sandbar-sundeck", "Sandbar Sundeck", "16.webp", "Day cruiser", 28, 8, ["small", "fast"]),
    ("ocean-eighty", "Ocean Eighty", "17.webp", "Motor yacht", 80, 13, ["luxurious"]),
    ("azimut-62", "Azimut 62", "18.webp", "Flybridge yacht", 62, 13, ["luxurious"]),
    ("farside", "Farside", "19.webp", "Center console", 32, 8, ["fast"]),
    ("brickell-fly", "Brickell Fly", "20.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("navy-azimut", "Navy Azimut", "21.webp", "Flybridge yacht", 55, 13, ["luxurious"]),
    ("canal-sprite", "Canal Sprite", "22.webp", "Bowrider", 20, 6, ["small"]),
    ("indigo-wake", "Indigo Wake", "23.webp", "Flybridge yacht", 48, 12, ["luxurious"]),
    ("sedan-navy", "Sedan Navy", "24.webp", "Flybridge yacht", 48, 12, ["luxurious"]),
    ("regal-outboard", "Regal Outboard", "25.webp", "Day cruiser", 26, 8, ["small"]),
    ("brickell-prestige", "Brickell Prestige", "26.webp", "Flybridge yacht", 50, 13, ["luxurious"]),
    ("twilight-bridge", "Twilight Bridge", "27.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("whitewater-express", "Whitewater Express", "28.webp", "Express cruiser", 34, 8, ["fast"]),
    ("golden-fly", "Golden Fly", "29.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("haulover-sportfish", "Haulover Sportfish", "30.jpg", "Sportfish", 35, 8, ["fast"]),
    ("schaefer-slide", "Schaefer Slide", "31.webp", "Express cruiser", 38, 10, ["fast", "luxurious"]),
    ("island-prestige", "Island Prestige", "32.webp", "Flybridge yacht", 45, 12, ["luxurious"]),
    ("onkor", "Onkor", "33.webp", "Express yacht", 40, 10, ["fast", "luxurious"]),
    ("honeycomb", "Honeycomb", "34.webp", "Day cruiser", 32, 8, ["fast", "small"]),
    ("bayside-searay", "Bayside Sea Ray", "35.webp", "Express yacht", 46, 12, ["luxurious"]),
    ("greyhound", "Greyhound", "36.webp", "Motor yacht", 75, 13, ["luxurious", "fast"]),
    ("white-pearl", "White Pearl", "37.webp", "Express yacht", 50, 12, ["luxurious"]),
    ("silver-streak", "Silver Streak", "38.webp", "Express yacht", 48, 12, ["luxurious", "fast"]),
    ("wake-maker", "Wake Maker", "39.webp", "Flybridge yacht", 50, 12, ["luxurious", "fast"]),
    ("sandbar-grady", "Sandbar Grady", "40.webp", "Walkaround", 30, 8, ["small", "fast"]),
    ("palm-aquasport", "Palm Aquasport", "41.webp", "Walkaround", 26, 6, ["small"]),
    ("blue-water", "Blue Water", "42.webp", "Center console", 35, 10, ["fast"]),
    ("aerial-prestige", "Aerial Prestige", "43.webp", "Flybridge yacht", 42, 12, ["luxurious"]),
    ("tangerine", "Tangerine", "44.webp", "Express yacht", 43, 10, ["luxurious", "fast"]),
    ("azimut-fifty", "Azimut Fifty", "45.webp", "Flybridge yacht", 50, 13, ["luxurious"]),
    ("black-thunder", "Black Thunder", "46.webp", "Express yacht", 50, 12, ["luxurious", "fast"]),
    ("quad-force", "Quad Force", "47.webp", "Center console", 38, 10, ["fast"]),
    ("monterey-gold", "Monterey Gold", "48.webp", "Express cruiser", 32, 8, ["fast"]),
    ("silver-line", "Silver Line", "49.webp", "Motor yacht", 80, 13, ["luxurious", "fast"]),
    ("axopar-dusk", "Axopar Dusk", "50.webp", "Day cruiser", 37, 8, ["fast", "small"]),
]

CAPTAINS = [
    ("Elena Ruiz", "/crew/elena-ruiz.jpg"),
    ("Will Park", "/crew/will-park.jpg"),
    ("Nora Blake", "/crew/nora-blake.jpg"),
    ("Marcus Cole", "/crew/marcus-cole.jpg"),
    ("Mia Chen", "/crew/mia-chen.jpg"),
    ("Camille Dubois", "/crew/camille-dubois.jpg"),
    ("Luca Bianchi", "/crew/luca-bianchi.jpg"),
    ("Diego Santos", "/crew/diego-santos.jpg"),
    ("Sofia Alvarez", "/crew/sofia-alvarez.jpg"),
    ("James Okonkwo", "/crew/james-okonkwo.jpg"),
    ("Rafael Costa", "/crew/rafael-costa.jpg"),
    ("Hannah Kim", "/crew/hannah-kim.jpg"),
    ("Emily Rossi", "/crew/emily-rossi.jpg"),
    ("Trent Hale", "/crew/trent-hale.jpg"),
    ("Ana Morales", None),
    ("Omar Haddad", None),
    ("Priya Nair", None),
    ("Jules Moreau", None),
    ("Mateo Vargas", None),
    ("Lina Kowalski", None),
    ("Andre Baptiste", None),
    ("Yara Mendes", None),
    ("Theo Lang", None),
    ("Isla Navarro", None),
    ("Kenji Watanabe", None),
    ("Rosa Delgado", None),
    ("Malik Thompson", None),
    ("Chiara Greco", None),
    ("Hugo Silva", None),
    ("Amira Hassan", None),
    ("Nico Berg", None),
    ("Valentina Ortiz", None),
    ("Sean Gallagher", None),
    ("Ines Carvalho", None),
    ("David Okoye", None),
    ("Freya Lind", None),
    ("Pablo Herrera", None),
    ("Mei Zhang", None),
    ("Owen Fitzgerald", None),
    ("Carmen Paredes", None),
    ("Leo Kovacs", None),
    ("Nadine Faure", None),
    ("Bruno Almeida", None),
    ("Aisha Rahman", None),
    ("Victor Pena", None),
    ("Sienna Walsh", None),
    ("Ravi Patel", None),
    ("Gabriela Soto", None),
    ("Erik Nilsen", None),
    ("Noor El-Sayed", None),
    ("Tomasz Nowak", None),
    ("Camila Ferreira", None),
    ("Jonah Brooks", None),
    ("Helena Costa", None),
    ("Adrian Popescu", None),
    ("Layla Bennett", None),
    ("Enzo Ricci", None),
    ("Maya Singh", None),
    ("Felipe Rojas", None),
    ("Celine Marchand", None),
    ("Kwame Asante", None),
    ("Olivia Hart", None),
    ("Santiago Leon", None),
    ("Ingrid Solberg", None),
    ("Marco Teixeira", None),
    ("Amina Diallo", None),
    ("Patrick Oneill", None),
    ("Lucia Benedetti", None),
    ("Hassan Alami", None),
    ("Brooke Tanner", None),
    ("Iker Molina", None),
    ("Sophie Laurent", None),
    ("Daniel Kim", None),
    ("Paloma Reyes", None),
    ("Nathan Price", None),
    ("Fatima Zahra", None),
    ("Alessandro Conte", None),
    ("Jun Park", None),
    ("Beatriz Campos", None),
    ("Liam Donovan", None),
    ("Yasmin Farouk", None),
    ("Roberto Nunez", None),
    ("Claire Beaumont", None),
    ("Thiago Barbosa", None),
    ("Harper Quinn", None),
    ("Imani Johnson", None),
    ("Stefan Petrov", None),
    ("Catalina Vega", None),
    ("Miles Harrington", None),
    ("Leila Bouazizi", None),
    ("Giovanni Russo", None),
    ("Anika Sharma", None),
    ("Oscar Lindstrom", None),
    ("Daniela Ibarra", None),
    ("Felix Morel", None),
    ("Zara Ahmed", None),
    ("Henrique Lopes", None),
    ("Naomi Brooks", None),
    ("Andres Castillo", None),
    ("Elise Moreau", None),
]


def js(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def hours_min(traits: list[str]) -> int:
    if "luxurious" in traits:
        return 4
    if "fast" in traits:
        return 3
    return 2


def license_for(traits: list[str]) -> str:
    if "luxurious" in traits:
        return "USCG Master 100 Ton"
    if "fast" in traits:
        return "USCG Master 50 Ton"
    return "USCG OUPV Six-Pack"


def blurbs(length: int, guests: int, marina: str, traits: list[str]) -> dict[str, str]:
    t = set(traits)
    if "luxurious" in t and "fast" in t:
        return {
            "en": f"{length} ft luxury yacht with pace. Up to {guests} from {marina}.",
            "es": f"Yate de lujo de {length} ft, con ritmo. Hasta {guests} desde {marina}.",
            "fr": f"Yacht de luxe de {length} ft, avec allure. Jusqu’à {guests} depuis {marina}.",
            "it": f"Yacht di lusso da {length} ft, con ritmo. Fino a {guests} da {marina}.",
            "pt": f"Iate de luxo de {length} ft, com ritmo. Até {guests} a partir de {marina}.",
        }
    if "luxurious" in t:
        return {
            "en": f"{length} ft luxury yacht for up to {guests}. Skyline and Intracoastal from {marina}.",
            "es": f"Yate de lujo de {length} ft para hasta {guests}. Skyline e Intracoastal desde {marina}.",
            "fr": f"Yacht de luxe de {length} ft pour {guests} personnes. Skyline et Intracoastal depuis {marina}.",
            "it": f"Yacht di lusso da {length} ft per {guests} ospiti. Skyline e Intracoastal da {marina}.",
            "pt": f"Iate de luxo de {length} ft para até {guests}. Skyline e Intracoastal a partir de {marina}.",
        }
    if "fast" in t and "small" in t:
        return {
            "en": f"Agile {length} ft boat for up to {guests}. Quick bay hops from {marina}.",
            "es": f"Bote ágil de {length} ft para hasta {guests}. Saltos rápidos desde {marina}.",
            "fr": f"Bateau agile de {length} ft pour {guests}. Sauts rapides depuis {marina}.",
            "it": f"Barca agile da {length} ft per {guests}. Salti rapidi da {marina}.",
            "pt": f"Barco ágil de {length} ft para até {guests}. Saltos rápidos a partir de {marina}.",
        }
    if "fast" in t:
        return {
            "en": f"{length} ft fast boat for up to {guests}. Beats the causeways from {marina}.",
            "es": f"Bote rápido de {length} ft para hasta {guests}. Le gana a las calzadas desde {marina}.",
            "fr": f"Bateau rapide de {length} ft pour {guests}. Gagne sur les chaussées depuis {marina}.",
            "it": f"Barca veloce da {length} ft per {guests}. Vince sulle calzate da {marina}.",
            "pt": f"Barco rápido de {length} ft para até {guests}. Ganha das calçadas a partir de {marina}.",
        }
    return {
        "en": f"Compact {length} ft boat for up to {guests}. Short hops from {marina}.",
        "es": f"Bote compacto de {length} ft para hasta {guests}. Saltos cortos desde {marina}.",
        "fr": f"Bateau compact de {length} ft pour {guests}. Courts sauts depuis {marina}.",
        "it": f"Barca compatta da {length} ft per {guests}. Salti brevi da {marina}.",
        "pt": f"Barco compacto de {length} ft para até {guests}. Saltos curtos a partir de {marina}.",
    }


def initials(name: str) -> str:
    parts = [p for p in name.replace("-", " ").split() if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


def avatar_svg(name: str, index: int) -> str:
    hue = (index * 47 + 18) % 360
    bg = f"hsl({hue}, 42%, 18%)"
    accent = f"hsl({(hue + 32) % 360}, 70%, 58%)"
    fg = "#F4E7C3"
    ini = initials(name)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="{name}">
  <rect width="160" height="160" rx="80" fill="{bg}"/>
  <circle cx="80" cy="80" r="74" fill="none" stroke="{accent}" stroke-width="5"/>
  <text x="80" y="96" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="700" fill="{fg}">{ini}</text>
</svg>
"""


def slug_captain(name: str) -> str:
    return name.lower().replace(" ", "-").replace(".", "")


def main() -> None:
    if len(BOATS) != 100:
        raise SystemExit(f"expected 100 boats, got {len(BOATS)}")
    if len(CAPTAINS) != 100:
        raise SystemExit(f"expected 100 captains, got {len(CAPTAINS)}")
    ids = [b[0] for b in BOATS]
    if len(set(ids)) != 100:
        raise SystemExit("duplicate boat ids")
    if len({c[0] for c in CAPTAINS}) != 100:
        raise SystemExit("duplicate captain names")

    missing = []
    for _id, _name, file, *_rest in BOATS:
        path = ROOT / "public" / "fleet" / "kaenz" / file
        if not path.exists():
            missing.append(file)
    if missing:
        raise SystemExit(f"missing photos: {missing}")

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    captain_photos: list[str] = []
    for i, (name, photo) in enumerate(CAPTAINS):
        captain_photos.append(f"/crew/kaenz/selfie-{i + 1}.jpg")

    blocks: list[str] = []
    for i, (yacht_id, name, file, klass, length, guests, traits) in enumerate(BOATS):
        marina, marina_id, lat, lng, eta = PORTS[i % len(PORTS)]
        cap_name, _ = CAPTAINS[i]
        photo = captain_photos[i]
        rating = round(4.86 + (i % 14) * 0.01, 2)
        if rating > 4.99:
            rating = 4.99
        trips = 92 + (i * 19) % 548
        b = blurbs(length, guests, marina, traits)
        traits_js = ", ".join(js(t) for t in traits)
        blocks.append(
            f"""  {{
    id: {js(yacht_id)},
    name: {js(name)},
    class: {js(klass)},
    lengthFt: {length},
    guests: {guests},
    hoursMin: {hours_min(traits)},
    marina: {js(marina)},
    marinaId: {js(marina_id)},
    image: {js(f"/fleet/kaenz/{file}")},
    lat: {lat},
    lng: {lng},
    etaMin: {eta},
    traits: [{traits_js}],
    captain: {{
      name: {js(f"Captain {cap_name}")},
      license: {js(license_for(traits))},
      rating: {rating},
      trips: {trips},
      photo: {js(photo)},
      verified: true,
    }},
    blurb: blurb(
      {js(b["en"])},
      {js(b["es"])},
      {js(b["fr"])},
      {js(b["it"])},
      {js(b["pt"])},
    ),
  }}"""
        )

    yacht_list = ",\n".join(blocks)
    ts = f"""import type {{ Localized }} from "./locale";

export type YachtClass = "fast" | "small" | "luxurious";

export type Captain = {{
  name: string;
  license: string;
  rating: number;
  trips: number;
  photo: string;
  verified: boolean;
}};

export type Yacht = {{
  id: string;
  name: string;
  class: string;
  lengthFt: number;
  guests: number;
  hoursMin: number;
  marina: string;
  marinaId: string;
  image: string;
  lat: number;
  lng: number;
  etaMin: number;
  captain: Captain;
  blurb: Localized;
  traits: YachtClass[];
  listing?: boolean;
  photos?: string[];
  hin?: string;
  captainLanguages?: Array<"en" | "es" | "pt" | "fr">;
  captainRegion?: string;
}};

function blurb(en: string, es: string, fr: string, it: string, pt: string): Localized {{
  return {{ en, es, fr, it, pt }};
}}

export const DEFAULT_YACHT_ID = "tempest-42";

export const yachts: Yacht[] = [
{yacht_list},
];

export const marinas = [
  "Miami Beach Marina",
  "Island Gardens Miami",
  "Las Olas Marina",
  "Hollywood Marina",
  "Palm Beach Town Docks",
  "Dinner Key Marina",
  "Haulover Park Marina",
  "Port Everglades",
  "PortMiami",
];

export const destinations = [
  "Brickell",
  "Miami Beach",
  "Hollywood Beach sandbar",
  "Fort Lauderdale",
  "Palm Beach",
  "Biscayne Bay cruise",
  "Sunset Intracoastal",
];

export function yachtById(id: string) {{
  return yachts.find((y) => y.id === id);
}}

export function formatUsd(n: number) {{
  return new Intl.NumberFormat("en-US", {{
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }}).format(n);
}}
"""
    OUT_TS.write_text(ts, encoding="utf-8")
    print(f"wrote {OUT_TS} with {len(BOATS)} yachts")
    print(f"avatars in {AVATAR_DIR}: {len(list(AVATAR_DIR.glob('*.svg')))}")


if __name__ == "__main__":
    main()

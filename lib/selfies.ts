export const SELFIE_CIRCLES = [
  "family",
  "partners",
  "friends",
  "colleagues",
  "crush",
] as const;

export type SelfieCircle = (typeof SELFIE_CIRCLES)[number];

export const UPLOAD_VIBES = 25;
export const TOP_SELFIES_YEAR = 2026;
export const TOPQ1_DRIVE = "Drive Kaenz TopQ1";

export type TripSelfie = {
  id: string;
  photo: string;
  name: string;
  city: string;
  place: string;
  circle: SelfieCircle;
  vibes: number;
  caption?: string;
  mine?: boolean;
  tripLabel?: string;
};

const HOSTS = [
  "Adrian Popescu",
  "Aisha Rahman",
  "Alessandro Conte",
  "Amina Diallo",
  "Amira Hassan",
  "Ana Morales",
  "André Baptiste",
  "Andrés Castillo",
  "Anika Sharma",
  "Beatriz Campos",
  "Brooke Tanner",
  "Bruno Almeida",
  "Camila Ferreira",
  "Carmen Paredes",
  "Catalina Vega",
  "Céline Marchand",
  "Chiara Greco",
  "Claire Beaumont",
  "Daniel Kim",
  "Daniela Ibarra",
  "David Okoye",
  "Elise Moreau",
  "Enzo Ricci",
  "Erik Nilsen",
  "Fatima Zahra",
  "Felipe Rojas",
  "Félix Morel",
  "Freya Lind",
  "Gabriela Soto",
  "Giovanni Russo",
  "Harper Quinn",
  "Hassan Alami",
  "Helena Costa",
  "Henrique Lopes",
  "Hugo Silva",
  "Iker Molina",
  "Imani Johnson",
  "Inês Carvalho",
  "Ingrid Solberg",
  "Isla Navarro",
  "Jonah Brooks",
  "Jules Moreau",
  "Jun Park",
  "Kenji Watanabe",
  "Kwame Asante",
  "Layla Bennett",
  "Leila Bouazizi",
  "Leo Kovacs",
  "Liam Donovan",
  "Lina Kowalski",
  "Lucia Benedetti",
  "Malik Thompson",
  "Marco Teixeira",
  "Mateo Vargas",
  "Maya Singh",
  "Mei Zhang",
  "Miles Harrington",
  "Nadine Faure",
  "Naomi Brooks",
  "Nathan Price",
  "Nico Berg",
  "Noor El Sayed",
  "Olivia Hart",
  "Omar Haddad",
  "Oscar Lindström",
  "Owen Fitzgerald",
  "Pablo Herrera",
  "Paloma Reyes",
  "Patrick O’Neill",
  "Priya Nair",
  "Ravi Patel",
  "Roberto Núñez",
  "Rosa Delgado",
  "Santiago León",
  "Sean Gallagher",
  "Sienna Walsh",
  "Sophie Laurent",
  "Stefan Petrov",
  "Théo Lang",
  "Thiago Barbosa",
  "Tomasz Nowak",
  "Valentina Ortiz",
  "Víctor Peña",
  "Yara Mendes",
  "Yasmin Farouk",
  "Zara Ahmed",
  "Mia Lee",
  "William Brown",
  "Emily Johnson",
  "Marcus Cole",
  "Sofia Ruiz",
  "Trent Hale",
  "Camille Dubois",
  "Diego Santos",
  "Elena Ruiz",
  "Hannah Kim",
  "Luca Bianchi",
  "Nora Blake",
  "Rafael Costa",
  "James Okonkwo",
];

const SPOTS: { place: string; city: string }[] = [
  { place: "Haulover Sandbar", city: "North Miami Beach" },
  { place: "Hollywood Beach Sandbar", city: "Hollywood" },
  { place: "Star Island", city: "Miami Beach" },
  { place: "Brickell Skyline", city: "Miami" },
  { place: "Las Olas Isles", city: "Fort Lauderdale" },
  { place: "Millionaire's Row", city: "Fort Lauderdale" },
  { place: "Palm Beach Estates", city: "Palm Beach" },
  { place: "South Beach / Lummus Park", city: "Miami Beach" },
  { place: "Fisher Island", city: "Miami Beach" },
  { place: "Vizcaya", city: "Miami" },
  { place: "Cala Comte", city: "Ibiza" },
  { place: "Ses Illetes", city: "Formentera" },
  { place: "La Croisette", city: "Cannes" },
  { place: "Port Olímpic", city: "Barcelona" },
  { place: "Île Sainte-Marguerite", city: "Cannes" },
  { place: "Lake Boca Raton", city: "Boca Raton" },
  { place: "Stiltsville", city: "Key Biscayne" },
  { place: "Joia Beach", city: "Miami" },
  { place: "Pier Sixty-Six", city: "Fort Lauderdale" },
  { place: "Miami Beach Marina", city: "Miami Beach" },
];

const FEATURED_PHOTOS = [7, 1, 25, 12, 40, 16, 22, 33, 48, 55, 3, 9, 18, 28, 36];

const CIRCLE_BY_PHOTO: Partial<Record<number, SelfieCircle>> = {
  1: "friends",
  7: "friends",
  12: "friends",
  16: "partners",
  22: "crush",
  25: "family",
  33: "colleagues",
  40: "family",
  48: "partners",
  55: "friends",
};

function photoOrder() {
  const used = new Set(FEATURED_PHOTOS);
  const rest: number[] = [];
  for (let n = 1; n <= 100; n += 1) {
    if (!used.has(n)) rest.push(n);
  }
  return [...FEATURED_PHOTOS, ...rest];
}

function circleFor(photo: number, rankIndex: number): SelfieCircle {
  return CIRCLE_BY_PHOTO[photo] ?? SELFIE_CIRCLES[rankIndex % SELFIE_CIRCLES.length];
}

export const topQ1Selfies: TripSelfie[] = photoOrder().map((photo, index) => {
  const spot = SPOTS[index % SPOTS.length];
  return {
    id: `topq1-${photo}`,
    photo: `/crew/kaenz/selfie-${photo}.jpg`,
    name: HOSTS[index] || `Crew ${photo}`,
    city: spot.city,
    place: spot.place,
    circle: circleFor(photo, index),
    vibes: 980 - index * 8 + (photo % 5),
  };
});

import type { Localized } from "./locale";

export type CrewMember = {
  id: string;
  name: string;
  city: string;
  photo: string;
  bio: Localized;
  interests: string[];
  goingTo: string;
};

export type CrewPost = {
  id: string;
  authorId: string;
  body: Localized;
  place: string;
  likes: number;
  when: string;
};

export const crew: CrewMember[] = [
  {
    id: "mia-lee",
    name: "Mia Lee",
    city: "Fort Lauderdale",
    photo: "/crew/mia.jpg",
    bio: {
      en: "Family sandbar Sundays. Always bringing extra towels.",
      es: "Domingos de sandbar en familia. Siempre lleva toallas extra.",
      fr: "Dimanches sandbar en famille. Toujours des serviettes en plus.",
      it: "Domeniche sandbar in famiglia. Porta sempre asciugamani extra.",
      pt: "Domingos de sandbar em família. Sempre leva toalhas extra.",
    },
    interests: ["sandbar", "family", "Hollywood Beach"],
    goingTo: "Hollywood Beach Sandbar",
  },
  {
    id: "william-brown",
    name: "William Brown",
    city: "Miami",
    photo: "/crew/william.jpg",
    bio: {
      en: "Brickell commute by water. Never sitting on I-95 again.",
      es: "Va a Brickell por agua. Nunca más en la I-95.",
      fr: "Trajet vers Brickell par l’eau. Plus jamais sur l’I-95.",
      it: "Tragitto per Brickell via acqua. Mai più sull’I-95.",
      pt: "Trajeto para Brickell pela água. Nunca mais na I-95.",
    },
    interests: ["commute", "Brickell", "skyline"],
    goingTo: "Brickell Waterfront",
  },
  {
    id: "emily-johnson",
    name: "Emily Johnson",
    city: "Palm Beach",
    photo: "/crew/emily.jpg",
    bio: {
      en: "Sunset runs and quiet Intracoastal evenings.",
      es: "Atardeceres y noches tranquilas en el Intracoastal.",
      fr: "Traversées au coucher du soleil et soirs calmes sur l’Intracoastal.",
      it: "Tramonti e sere tranquille sull’Intracoastal.",
      pt: "Travessias ao pôr do sol e noites tranquilas no Intracoastal.",
    },
    interests: ["sunset", "Palm Beach", "romance"],
    goingTo: "Intracoastal Sunset",
  },
  {
    id: "marcus-cole",
    name: "Marcus Cole",
    city: "Fort Lauderdale",
    photo: "/crew/marcus.jpg",
    bio: {
      en: "Captain and host. Celebrations on Las Olas 70.",
      es: "Capitán y anfitrión. Celebraciones en el Las Olas 70.",
      fr: "Capitaine et hôte. Célébrations à bord du Las Olas 70.",
      it: "Capitano e host. Celebrazioni sul Las Olas 70.",
      pt: "Capitão e anfitrião. Celebrações no Las Olas 70.",
    },
    interests: ["captain", "celebrations", "Las Olas"],
    goingTo: "Las Olas Marina",
  },
  {
    id: "sofia-ruiz",
    name: "Sofia Ruiz",
    city: "Miami Beach",
    photo: "/crew/sofia.jpg",
    bio: {
      en: "Star Island photo cruises and South Beach arrivals.",
      es: "Cruceros fotográficos por Star Island y llegadas a South Beach.",
      fr: "Croisières photo à Star Island et arrivées à South Beach.",
      it: "Crociere fotografiche a Star Island e arrivi a South Beach.",
      pt: "Cruzeiros fotográficos em Star Island e chegadas a South Beach.",
    },
    interests: ["South Beach", "photos", "Star Island"],
    goingTo: "Star Island & Millionaire's Row",
  },
  {
    id: "trent-hale",
    name: "Trent Hale",
    city: "Hollywood",
    photo: "/crew/captain.jpg",
    bio: {
      en: "USCG-licensed. Sandbar briefing before every splash.",
      es: "Licencia USCG. Briefing de sandbar antes de cada chapuzón.",
      fr: "Licencié USCG. Briefing sandbar avant chaque plongeon.",
      it: "Licenza USCG. Briefing sandbar prima di ogni tuffo.",
      pt: "Licença USCG. Briefing de sandbar antes de cada mergulho.",
    },
    interests: ["captain", "sandbar", "safety"],
    goingTo: "Hollywood Beach Sandbar",
  },
];

export const crewFeed: CrewPost[] = [
  {
    id: "p1",
    authorId: "william-brown",
    body: {
      en: "Miami Beach → Brickell in 18 minutes. The car still has not left the causeway.",
      es: "Miami Beach → Brickell en 18 minutos. El auto aún no sale de la calzada.",
      fr: "Miami Beach → Brickell en 18 minutes. La voiture n’a toujours pas quitté la chaussée.",
      it: "Miami Beach → Brickell in 18 minuti. L’auto non ha ancora lasciato la calzata.",
      pt: "Miami Beach → Brickell em 18 minutos. O carro ainda não saiu da calçada.",
    },
    place: "Brickell Waterfront",
    likes: 48,
    when: "2h",
  },
  {
    id: "p2",
    authorId: "mia-lee",
    body: {
      en: "Sandbar is glass today. Who wants to raft up around 1pm?",
      es: "El sandbar está como un espejo. ¿Quién se acerca a la 1pm?",
      fr: "Le sandbar est comme un miroir. Qui vient s’amarrer vers 13 h ?",
      it: "Il sandbar è uno specchio. Chi si unisce verso le 13?",
      pt: "O sandbar está um espelho hoje. Quem se junta por volta das 13h?",
    },
    place: "Hollywood Beach Sandbar",
    likes: 73,
    when: "4h",
  },
  {
    id: "p3",
    authorId: "emily-johnson",
    body: {
      en: "Golden hour from FTL to Palm Beach. Bring a jacket for the flybridge.",
      es: "Hora dorada de FTL a Palm Beach. Lleva una chaqueta para el flybridge.",
      fr: "Heure dorée de FTL à Palm Beach. Prenez une veste pour le flybridge.",
      it: "Ora d’oro da FTL a Palm Beach. Porta una giacca per il flybridge.",
      pt: "Hora dourada de FTL a Palm Beach. Leve um casaco para o flybridge.",
    },
    place: "Intracoastal Sunset",
    likes: 61,
    when: "1d",
  },
  {
    id: "p4",
    authorId: "sofia-ruiz",
    body: {
      en: "Slow pass by Star Island this Saturday. Extra seat if you travel light.",
      es: "Paso lento por Star Island este sábado. Hay un asiento si viajas ligero.",
      fr: "Passage lent devant Star Island samedi. Place en plus si vous voyagez léger.",
      it: "Passaggio lento a Star Island sabato. Posto extra se viaggi leggero.",
      pt: "Passagem lenta por Star Island neste sábado. Lugar extra se você viajar leve.",
    },
    place: "Star Island & Millionaire's Row",
    likes: 39,
    when: "1d",
  },
];

export function crewById(id: string) {
  return crew.find((c) => c.id === id);
}

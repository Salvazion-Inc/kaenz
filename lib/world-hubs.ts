import type { Localized } from "./locale";
import type { Place, PlaceKind } from "./places";

function blurb(en: string, es: string, fr: string, it: string): Localized {
  return { en, es, fr, it };
}

function hub(
  id: string,
  kind: PlaceKind,
  name: string,
  city: string,
  country: string,
  lat: number,
  lng: number,
  image: string,
  copy: Localized,
): Place {
  return {
    id,
    kind,
    name,
    city,
    country,
    lat,
    lng,
    image,
    minutesByYacht: 20,
    minutesByCar: 0,
    blurb: copy,
  };
}

const marina = "/fleet/ftl-marina.jpg";
const sky = "/fleet/miami-skyline.jpg";
const yacht = "/fleet/yacht-1.jpg";
const consoleImg = "/fleet/center-console.jpg";
const sunset = "/fleet/sunset.jpg";
const water = "/hero-poster.jpg";

export const worldHubs: Place[] = [
  hub("bahia-mar", "marina", "Bahia Mar Yachting Center", "Fort Lauderdale", "United States", 26.1125, -80.1078, marina, blurb(
    "Fort Lauderdale’s classic yacht center — arrivals and departures on the Intracoastal.",
    "El centro de yates clásico de Fort Lauderdale — llegadas y salidas en el Intracoastal.",
    "Le centre de yachts classique de Fort Lauderdale — arrivées et départs sur l’Intracoastal.",
    "Il centro yacht classico di Fort Lauderdale — arrivi e partenze sull’Intracoastal.",
  )),
  hub("yacht-haven-grande", "marina", "Yacht Haven Grande", "Charlotte Amalie", "U.S. Virgin Islands", 18.3358, -64.9231, yacht, blurb(
    "St. Thomas superyacht marina. Caribbean pickup and dropoff.",
    "Marina de superyates en St. Thomas. Origen y destino en el Caribe.",
    "Marina de superyachts à St. Thomas. Départ et arrivée aux Caraïbes.",
    "Marina di superyacht a St. Thomas. Partenza e arrivo nei Caraibi.",
  )),
  hub("atlantis-marina", "marina", "Atlantis Marina", "Nassau", "Bahamas", 25.0858, -77.3229, sunset, blurb(
    "Nassau’s flagship marina at Paradise Island for yacht arrivals.",
    "La marina insignia de Nassau en Paradise Island para llegadas en yate.",
    "Marina phare de Nassau à Paradise Island pour les arrivées en yacht.",
    "Marina di punta di Nassau a Paradise Island per gli arrivi in yacht.",
  )),
  hub("gustavia", "marina", "Port de Gustavia", "Gustavia", "Saint Barthélemy", 17.899, -62.85, consoleImg, blurb(
    "St. Barths harbour. Arrive by yacht; leave when the swell allows.",
    "Puerto de St. Barths. Llega en yate; sal cuando el mar lo permita.",
    "Port de St. Barths. Arrivez en yacht ; partez selon la houle.",
    "Porto di St. Barths. Arriva in yacht; parti quando il mare lo consente.",
  )),
  hub("english-harbour", "marina", "Nelson’s Dockyard", "English Harbour", "Antigua and Barbuda", 17.007, -61.764, marina, blurb(
    "Historic Antigua harbour. Deep-water yacht arrivals in the Caribbean.",
    "Puerto histórico de Antigua. Llegadas de yates de calado en el Caribe.",
    "Port historique d’Antigua. Arrivées de yachts en eaux profondes.",
    "Porto storico di Antigua. Arrivi di yacht in acque profonde.",
  )),
  hub("casa-de-campo", "marina", "Marina Casa de Campo", "La Romana", "Dominican Republic", 18.421, -68.93, sunset, blurb(
    "La Romana marina for Dominican Republic arrivals and coastal hops.",
    "Marina de La Romana para llegadas a República Dominicana.",
    "Marina de La Romana pour les arrivées en République dominicaine.",
    "Marina di La Romana per gli arrivi in Repubblica Dominicana.",
  )),
  hub("cabo-san-lucas", "marina", "Marina Cabo San Lucas", "Cabo San Lucas", "Mexico", 22.879, -109.908, water, blurb(
    "Baja California Sur. Pacific arrivals at Land’s End.",
    "Baja California Sur. Llegadas al Pacífico en Land’s End.",
    "Basse-Californie du Sud. Arrivées Pacifique à Land’s End.",
    "Baja California Sur. Arrivi sul Pacifico a Land’s End.",
  )),
  hub("vallarta", "marina", "Marina Vallarta", "Puerto Vallarta", "Mexico", 20.658, -105.248, yacht, blurb(
    "Puerto Vallarta yacht basin on Banderas Bay.",
    "Dársena de yates de Puerto Vallarta en Bahía de Banderas.",
    "Bassin de yachts de Puerto Vallarta sur la baie de Banderas.",
    "Darsena yacht di Puerto Vallarta sulla baia di Banderas.",
  )),
  hub("flamenco", "marina", "Flamenco Marina", "Panama City", "Panama", 8.913, -79.521, marina, blurb(
    "Pacific Panama. Gateway before or after the Canal.",
    "Pacífico de Panamá. Puerta antes o después del Canal.",
    "Pacifique du Panama. Porte avant ou après le Canal.",
    "Pacifico di Panama. Porta prima o dopo il Canale.",
  )),
  hub("cartagena-marina", "marina", "Club de Pesca", "Cartagena", "Colombia", 10.392, -75.538, sky, blurb(
    "Cartagena’s historic harbour marina on the Caribbean.",
    "Marina del puerto histórico de Cartagena en el Caribe.",
    "Marina du port historique de Carthagène sur les Caraïbes.",
    "Marina del porto storico di Cartagena sui Caraibi.",
  )),
  hub("gloria-rio", "marina", "Marina da Glória", "Rio de Janeiro", "Brazil", -22.92, -43.17, sunset, blurb(
    "Rio yacht marina under Sugarloaf. Arrive and leave by water.",
    "Marina de yates de Río bajo el Pan de Azúcar.",
    "Marina de yachts de Rio au pied du Pain de Sucre.",
    "Marina yacht di Rio sotto il Pan di Zucchero.",
  )),
  hub("north-cove", "marina", "North Cove Marina", "New York", "United States", 40.713, -74.016, sky, blurb(
    "Manhattan’s downtown yacht dock. Skip the tunnels.",
    "Muelle de yates del downtown de Manhattan. Evita los túneles.",
    "Quai de yachts du downtown de Manhattan. Évitez les tunnels.",
    "Ormeggio yacht del downtown di Manhattan. Evita i tunnel.",
  )),
  hub("newport-ri", "marina", "Newport Yachting Center", "Newport", "United States", 41.486, -71.317, yacht, blurb(
    "Newport, Rhode Island. Classic East Coast yacht arrivals.",
    "Newport, Rhode Island. Llegadas clásicas de yates en la Costa Este.",
    "Newport, Rhode Island. Arrivées de yachts classiques sur la côte Est.",
    "Newport, Rhode Island. Arrivi yacht classici sulla East Coast.",
  )),
  hub("marina-del-rey", "marina", "Marina del Rey", "Los Angeles", "United States", 33.975, -118.447, consoleImg, blurb(
    "Los Angeles yacht harbour. Pacific pickup and dropoff.",
    "Puerto de yates de Los Ángeles. Origen y destino en el Pacífico.",
    "Port de yachts de Los Angeles. Départ et arrivée sur le Pacifique.",
    "Porto yacht di Los Angeles. Partenza e arrivo sul Pacifico.",
  )),
  hub("san-diego-marina", "marina", "Sunroad Resort Marina", "San Diego", "United States", 32.708, -117.166, water, blurb(
    "San Diego harbour marina for California yacht traffic.",
    "Marina del puerto de San Diego para el tráfico de yates en California.",
    "Marina du port de San Diego pour le trafic de yachts en Californie.",
    "Marina del porto di San Diego per il traffico yacht in California.",
  )),
  hub("coal-harbour", "marina", "Coal Harbour Marina", "Vancouver", "Canada", 49.291, -123.125, marina, blurb(
    "Downtown Vancouver. Pacific Northwest arrivals by yacht.",
    "Centro de Vancouver. Llegadas al Pacífico Noroeste en yate.",
    "Centre-ville de Vancouver. Arrivées dans le Nord-Ouest Pacifique.",
    "Centro di Vancouver. Arrivi nel Pacifico nord-occidentale.",
  )),
  hub("port-hercule", "marina", "Port Hercule", "Monaco", "Monaco", 43.735, 7.425, yacht, blurb(
    "Monaco’s superyacht harbour. The Med’s most famous berth.",
    "Puerto de superyates de Mónaco. El atraque más famoso del Mediterráneo.",
    "Port de superyachts de Monaco. L’amarrage le plus célèbre de Méditerranée.",
    "Porto di superyacht di Monaco. L’ormeggio più famoso del Mediterraneo.",
  )),
  hub("port-vauban", "marina", "Port Vauban", "Antibes", "France", 43.587, 7.128, marina, blurb(
    "Antibes. One of the largest superyacht marinas in Europe.",
    "Antibes. Una de las mayores marinas de superyates de Europa.",
    "Antibes. L’une des plus grandes marinas de superyachts d’Europe.",
    "Antibes. Una delle più grandi marine di superyacht in Europa.",
  )),
  hub("pierre-canto", "marina", "Port Pierre Canto", "Cannes", "France", 43.547, 7.037, sunset, blurb(
    "Cannes yacht harbour. Festival arrivals and Côte d’Azur hops.",
    "Puerto de yates de Cannes. Llegadas de festival y saltos por la Costa Azul.",
    "Port de yachts de Cannes. Arrivées du Festival et sauts sur la Côte d’Azur.",
    "Porto yacht di Cannes. Arrivi del Festival e salti sulla Costa Azzurra.",
  )),
  hub("saint-tropez", "marina", "Port de Saint-Tropez", "Saint-Tropez", "France", 43.272, 6.64, consoleImg, blurb(
    "Saint-Tropez quay. Arrive by yacht; leave when the town sleeps.",
    "Muelle de Saint-Tropez. Llega en yate; sal cuando el pueblo duerme.",
    "Quai de Saint-Tropez. Arrivez en yacht ; partez quand la ville dort.",
    "Banchina di Saint-Tropez. Arriva in yacht; parti quando il paese dorme.",
  )),
  hub("oneocean-vell", "marina", "OneOcean Port Vell", "Barcelona", "Spain", 41.378, 2.185, sky, blurb(
    "Barcelona’s superyacht marina in the old harbour.",
    "Marina de superyates de Barcelona en el puerto viejo.",
    "Marina de superyachts de Barcelone dans le vieux port.",
    "Marina di superyacht di Barcellona nel porto vecchio.",
  )),
  hub("club-de-mar-palma", "marina", "Club de Mar", "Palma", "Spain", 39.562, 2.633, marina, blurb(
    "Palma de Mallorca. Western Med hub for yacht arrivals.",
    "Palma de Mallorca. Hub del Mediterráneo occidental para yates.",
    "Palma de Majorque. Hub de Méditerranée occidentale pour yachts.",
    "Palma di Maiorca. Hub del Mediterraneo occidentale per yacht.",
  )),
  hub("marina-ibiza", "marina", "Marina Ibiza", "Ibiza", "Spain", 38.912, 1.442, yacht, blurb(
    "Ibiza Town marina. Balearic pickup and dropoff.",
    "Marina de Ibiza Town. Origen y destino en Baleares.",
    "Marina d’Ibiza Town. Départ et arrivée aux Baléares.",
    "Marina di Ibiza Town. Partenza e arrivo alle Baleari.",
  )),
  hub("portofino", "marina", "Portofino Marina", "Portofino", "Italy", 44.303, 9.21, sunset, blurb(
    "Liguria’s postcard harbour. Small, deep, and by yacht only.",
    "El puerto de postal de Liguria. Pequeño, profundo y solo en yate.",
    "Le port carte postale de Ligurie. Petit, profond, uniquement en yacht.",
    "Il porto da cartolina della Liguria. Piccolo, profondo, solo in yacht.",
  )),
  hub("porto-cervo", "marina", "Porto Cervo Marina", "Porto Cervo", "Italy", 41.136, 9.536, consoleImg, blurb(
    "Costa Smeralda. Sardinia’s premier yacht arrivals.",
    "Costa Esmeralda. Las llegadas de yates más importantes de Cerdeña.",
    "Costa Smeralda. Les arrivées de yachts les plus prisées de Sardaigne.",
    "Costa Smeralda. Gli arrivi yacht più importanti della Sardegna.",
  )),
  hub("naples-molo", "marina", "Molo Beverello", "Naples", "Italy", 40.836, 14.256, marina, blurb(
    "Naples waterfront. Capri and Amalfi start by yacht, not by car.",
    "Frente marítimo de Nápoles. Capri y Amalfi empiezan en yate, no en auto.",
    "Front de mer de Naples. Capri et Amalfi commencent en yacht, pas en voiture.",
    "Lungomare di Napoli. Capri e Amalfi partono in yacht, non in auto.",
  )),
  hub("venezia-marina", "marina", "Marina di Venezia", "Venice", "Italy", 45.433, 12.37, water, blurb(
    "Venice lagoon marina. Arrive by water, as the city was built for.",
    "Marina de la laguna de Venecia. Llega por agua, como fue pensada la ciudad.",
    "Marina de la lagune de Venise. Arrivez par l’eau, comme la ville fut conçue.",
    "Marina della laguna di Venezia. Arriva via acqua, come la città fu pensata.",
  )),
  hub("flisvos", "marina", "Flisvos Marina", "Athens", "Greece", 37.933, 23.685, sky, blurb(
    "Athens yacht marina. Mainland Greece pickup for island hops.",
    "Marina de yates de Atenas. Origen en tierra firme para islas.",
    "Marina de yachts d’Athènes. Départ du continent vers les îles.",
    "Marina yacht di Atene. Partenza dalla terraferma verso le isole.",
  )),
  hub("mykonos-tourlos", "marina", "Tourlos Marina", "Mykonos", "Greece", 37.465, 25.324, yacht, blurb(
    "Mykonos new port. Cyclades arrivals without the town jam.",
    "Puerto nuevo de Mykonos. Llegadas a las Cícladas sin el atasco del pueblo.",
    "Nouveau port de Mykonos. Arrivées aux Cyclades sans l’embouteillage.",
    "Nuovo porto di Mykonos. Arrivi alle Cicladi senza il traffico del paese.",
  )),
  hub("aci-split", "marina", "ACI Marina Split", "Split", "Croatia", 43.503, 16.442, marina, blurb(
    "Split harbour marina. Dalmatian coast arrivals and island hops.",
    "Marina del puerto de Split. Llegadas a Dalmacia y saltos a islas.",
    "Marina du port de Split. Arrivées en Dalmatie et sauts vers les îles.",
    "Marina del porto di Spalato. Arrivi in Dalmazia e salti verso le isole.",
  )),
  hub("dubrovnik-marina", "marina", "ACI Marina Dubrovnik", "Dubrovnik", "Croatia", 42.659, 18.088, sunset, blurb(
    "Dubrovnik marina. Adriatic pickup below the old walls.",
    "Marina de Dubrovnik. Origen en el Adriático bajo las murallas.",
    "Marina de Dubrovnik. Départ adriatique sous les remparts.",
    "Marina di Dubrovnik. Partenza adriatica sotto le mura.",
  )),
  hub("ocean-village-gib", "marina", "Ocean Village", "Gibraltar", "Gibraltar", 36.147, -5.355, consoleImg, blurb(
    "Gibraltar yacht marina. Atlantic–Med gateway.",
    "Marina de yates de Gibraltar. Puerta entre Atlántico y Mediterráneo.",
    "Marina de yachts de Gibraltar. Porte Atlantique–Méditerranée.",
    "Marina yacht di Gibilterra. Porta tra Atlantico e Mediterraneo.",
  )),
  hub("grand-harbour-malta", "marina", "Grand Harbour Marina", "Valletta", "Malta", 35.888, 14.521, marina, blurb(
    "Valletta’s Knights-era harbour. Central Med yacht hub.",
    "Puerto de Valletta de la era de los caballeros. Hub de yates del Mediterráneo central.",
    "Port de La Valette de l’ère des chevaliers. Hub de yachts en Méditerranée centrale.",
    "Porto di La Valletta dell’epoca dei cavalieri. Hub yacht del Mediterraneo centrale.",
  )),
  hub("cascais", "marina", "Cascais Marina", "Cascais", "Portugal", 38.693, -9.418, water, blurb(
    "Cascais. Lisbon’s Atlantic yacht door, west of the Tagus.",
    "Cascais. La puerta atlántica de yates de Lisboa, al oeste del Tajo.",
    "Cascais. La porte atlantique des yachts de Lisbonne, à l’ouest du Tage.",
    "Cascais. La porta atlantica degli yacht di Lisbona, a ovest del Tago.",
  )),
  hub("st-katharine", "marina", "St Katharine Docks", "London", "United Kingdom", 51.507, -0.072, sky, blurb(
    "London yacht dock by the Tower. Thames arrivals.",
    "Dársena de yates de Londres junto a la Torre. Llegadas por el Támesis.",
    "Bassin de yachts de Londres près de la Tour. Arrivées sur la Tamise.",
    "Darsena yacht di Londra presso la Torre. Arrivi sul Tamigi.",
  )),
  hub("dubai-marina-yc", "marina", "Dubai Marina Yacht Club", "Dubai", "United Arab Emirates", 25.077, 55.139, yacht, blurb(
    "Dubai Marina. Gulf pickup among the towers.",
    "Dubai Marina. Origen en el Golfo entre las torres.",
    "Dubai Marina. Départ dans le Golfe entre les tours.",
    "Dubai Marina. Partenza nel Golfo tra le torri.",
  )),
  hub("yas-marina", "marina", "Yas Marina", "Abu Dhabi", "United Arab Emirates", 24.467, 54.607, marina, blurb(
    "Abu Dhabi circuit marina. Gulf arrivals next to the track.",
    "Marina del circuito de Abu Dhabi. Llegadas al Golfo junto a la pista.",
    "Marina du circuit d’Abou Dabi. Arrivées dans le Golfe au bord de la piste.",
    "Marina del circuito di Abu Dhabi. Arrivi nel Golfo accanto alla pista.",
  )),
  hub("va-waterfront", "marina", "V&A Waterfront", "Cape Town", "South Africa", -33.903, 18.422, sunset, blurb(
    "Cape Town working harbour marina. Atlantic and Indian Ocean door.",
    "Marina del puerto de Ciudad del Cabo. Puerta al Atlántico y al Índico.",
    "Marina du port du Cap. Porte sur l’Atlantique et l’océan Indien.",
    "Marina del porto di Città del Capo. Porta su Atlantico e Oceano Indiano.",
  )),
  hub("one15-singapore", "marina", "One°15 Marina", "Singapore", "Singapore", 1.246, 103.842, yacht, blurb(
    "Sentosa yacht marina. Southeast Asia’s premier arrivals.",
    "Marina de yates de Sentosa. Las llegadas más importantes del Sudeste Asiático.",
    "Marina de yachts de Sentosa. Les arrivées les plus prisées d’Asie du Sud-Est.",
    "Marina yacht di Sentosa. Gli arrivi più importanti del Sud-est asiatico.",
  )),
  hub("rhkyc", "marina", "Royal Hong Kong Yacht Club", "Hong Kong", "Hong Kong", 22.284, 114.184, consoleImg, blurb(
    "Hong Kong harbour yacht club. Pearl River and South China Sea hops.",
    "Club de yates del puerto de Hong Kong. Saltos al río Perla y al Mar de China Meridional.",
    "Yacht-club du port de Hong Kong. Sauts vers la rivière des Perles et la mer de Chine.",
    "Yacht club del porto di Hong Kong. Salti verso il Fiume delle Perle e il Mar Cinese.",
  )),
  hub("yacht-haven-phuket", "marina", "Yacht Haven Phuket", "Phuket", "Thailand", 8.109, 98.303, water, blurb(
    "North Phuket marina. Andaman Sea pickup and island dropoff.",
    "Marina del norte de Phuket. Origen en el Andamán y destino en islas.",
    "Marina du nord de Phuket. Départ mer d’Andaman et arrivée sur les îles.",
    "Marina a nord di Phuket. Partenza nel mare delle Andamane e arrivo alle isole.",
  )),
  hub("sydney-superyacht", "marina", "Sydney Superyacht Marina", "Sydney", "Australia", -33.868, 151.185, marina, blurb(
    "Rozelle Bay. Sydney Harbour yacht arrivals.",
    "Rozelle Bay. Llegadas de yates a la bahía de Sídney.",
    "Rozelle Bay. Arrivées de yachts dans la baie de Sydney.",
    "Rozelle Bay. Arrivi yacht nella baia di Sydney.",
  )),
  hub("viaduct-auckland", "marina", "Viaduct Harbour", "Auckland", "New Zealand", -36.842, 174.763, sky, blurb(
    "Auckland’s downtown marina. Hauraki Gulf pickup.",
    "Marina del centro de Auckland. Origen en el golfo de Hauraki.",
    "Marina du centre d’Auckland. Départ dans le golfe de Hauraki.",
    "Marina del centro di Auckland. Partenza nel golfo di Hauraki.",
  )),
  hub("port-of-barcelona", "port", "Port of Barcelona", "Barcelona", "Spain", 41.345, 2.168, sky, blurb(
    "Commercial and cruise port. Yacht transfers in from the Med.",
    "Puerto comercial y de cruceros. Traslados en yate desde el Mediterráneo.",
    "Port commercial et de croisière. Transferts en yacht depuis la Méditerranée.",
    "Porto commerciale e crocieristico. Trasferimenti in yacht dal Mediterraneo.",
  )),
  hub("port-of-genoa", "port", "Port of Genoa", "Genoa", "Italy", 44.405, 8.928, marina, blurb(
    "Italy’s historic Ligurian port. Yacht arrivals on the Italian Riviera.",
    "Puerto histórico ligur de Italia. Llegadas de yates en la Riviera.",
    "Port historique ligure d’Italie. Arrivées de yachts sur la Riviera.",
    "Porto storico ligure d’Italia. Arrivi yacht sulla Riviera.",
  )),
  hub("port-of-piraeus", "port", "Port of Piraeus", "Piraeus", "Greece", 37.944, 23.646, yacht, blurb(
    "Greece’s main port. Island ferries and yacht dropoff in one harbour.",
    "El puerto principal de Grecia. Ferries e islas y destino en yate en un solo puerto.",
    "Le port principal de la Grèce. Ferries, îles et arrivée en yacht dans un même port.",
    "Il porto principale della Grecia. Traghetti, isole e arrivo in yacht nello stesso porto.",
  )),
  hub("port-of-civitavecchia", "port", "Port of Civitavecchia", "Civitavecchia", "Italy", 42.094, 11.789, water, blurb(
    "Rome’s seaport. Meet cruise guests by yacht instead of by car.",
    "El puerto de Roma. Recoge a cruceristas en yate, no en auto.",
    "Le port de Rome. Récupérez les croisiéristes en yacht, pas en voiture.",
    "Il porto di Roma. Raccogli i crocieristi in yacht, non in auto.",
  )),
  hub("port-of-nice", "port", "Port of Nice", "Nice", "France", 43.695, 7.285, sunset, blurb(
    "Nice harbour. Côte d’Azur port for yacht arrivals and airport runs.",
    "Puerto de Niza. Puerto de la Costa Azul para yates y traslados al aeropuerto.",
    "Port de Nice. Port de la Côte d’Azur pour yachts et liaisons aéroport.",
    "Porto di Nizza. Porto della Costa Azzurra per yacht e collegamenti all’aeroporto.",
  )),
  hub("port-of-valencia", "port", "Port of Valencia", "Valencia", "Spain", 39.445, -0.318, marina, blurb(
    "Western Med port. America’s Cup harbour and yacht gateway.",
    "Puerto del Mediterráneo occidental. Puerto de la Copa América y puerta de yates.",
    "Port de Méditerranée occidentale. Port de la Coupe de l’America et porte des yachts.",
    "Porto del Mediterraneo occidentale. Porto dell’America’s Cup e porta degli yacht.",
  )),
  hub("port-of-lisbon", "port", "Port of Lisbon", "Lisbon", "Portugal", 38.713, -9.127, sky, blurb(
    "Tagus estuary port. Atlantic yacht door to Europe.",
    "Puerto del estuario del Tajo. Puerta atlántica de yates a Europa.",
    "Port de l’estuaire du Tage. Porte atlantique des yachts vers l’Europe.",
    "Porto dell’estuario del Tago. Porta atlantica degli yacht verso l’Europa.",
  )),
  hub("southampton-port", "port", "Port of Southampton", "Southampton", "United Kingdom", 50.896, -1.393, marina, blurb(
    "England’s cruise capital. Channel yacht arrivals.",
    "Capital de cruceros de Inglaterra. Llegadas de yates al Canal.",
    "Capitale anglaise des croisières. Arrivées de yachts dans la Manche.",
    "Capitale inglese delle crociere. Arrivi yacht nel Canale.",
  )),
  hub("port-nassau", "port", "Prince George Wharf", "Nassau", "Bahamas", 25.077, -77.343, water, blurb(
    "Nassau cruise port. Collect guests by yacht off the dock.",
    "Puerto de cruceros de Nassau. Recoge huéspedes en yate en el muelle.",
    "Port de croisière de Nassau. Récupérez les invités en yacht au quai.",
    "Porto crociere di Nassau. Raccogli gli ospiti in yacht al molo.",
  )),
  hub("port-of-colon", "port", "Port of Colón", "Colón", "Panama", 9.353, -79.905, consoleImg, blurb(
    "Atlantic Panama Canal port. Yacht transits start or end here.",
    "Puerto atlántico del Canal de Panamá. Los tránsitos de yates empiezan o terminan aquí.",
    "Port atlantique du canal de Panama. Les transits de yachts commencent ou finissent ici.",
    "Porto atlantico del Canale di Panama. I transiti yacht iniziano o finiscono qui.",
  )),
  hub("port-of-la", "port", "Port of Los Angeles", "Los Angeles", "United States", 33.74, -118.272, sky, blurb(
    "San Pedro. Pacific cargo port with yacht access to the basin.",
    "San Pedro. Puerto del Pacífico con acceso de yates a la dársena.",
    "San Pedro. Port du Pacifique avec accès des yachts au bassin.",
    "San Pedro. Porto del Pacifico con accesso yacht alla darsena.",
  )),
  hub("port-of-ny", "port", "Port of New York", "New York", "United States", 40.684, -74.074, marina, blurb(
    "New York Harbour. Meet ships by yacht instead of sitting in traffic.",
    "Puerto de Nueva York. Recoge barcos en yate en vez de atascarte.",
    "Port de New York. Rejoignez les navires en yacht au lieu de rester dans le trafic.",
    "Porto di New York. Raggiungi le navi in yacht invece di restare nel traffico.",
  )),
  hub("port-singapore", "port", "Port of Singapore", "Singapore", "Singapore", 1.264, 103.819, yacht, blurb(
    "The world’s busiest transshipment port. Yacht door to Southeast Asia.",
    "El puerto de tránsitos más ocupado del mundo. Puerta de yates al Sudeste Asiático.",
    "Le port de transbordement le plus actif au monde. Porte des yachts vers l’Asie du Sud-Est.",
    "Il porto di transhipment più trafficato al mondo. Porta degli yacht verso il Sud-est asiatico.",
  )),
  hub("port-rashid", "port", "Port Rashid", "Dubai", "United Arab Emirates", 25.267, 55.275, sunset, blurb(
    "Dubai cruise and yacht port. Gulf arrivals next to the creek.",
    "Puerto de cruceros y yates de Dubái. Llegadas al Golfo junto al creek.",
    "Port de croisière et de yachts de Dubaï. Arrivées dans le Golfe près du creek.",
    "Porto crociere e yacht di Dubai. Arrivi nel Golfo accanto al creek.",
  )),
  hub("port-of-sydney", "port", "Port of Sydney", "Sydney", "Australia", -33.858, 151.201, water, blurb(
    "Sydney Harbour working port. Opera House-side yacht dropoff.",
    "Puerto de trabajo de la bahía de Sídney. Destino en yate junto a la Ópera.",
    "Port de travail de la baie de Sydney. Arrivée en yacht côté Opéra.",
    "Porto operativo della baia di Sydney. Arrivo in yacht accanto all’Opera.",
  )),
  hub("port-of-marseille", "port", "Grand Port Maritime", "Marseille", "France", 43.329, 5.353, marina, blurb(
    "Marseille’s deep-water port. Med gateway for French yacht traffic.",
    "Puerto de aguas profundas de Marsella. Puerta mediterránea de yates en Francia.",
    "Port en eaux profondes de Marseille. Porte méditerranéenne des yachts en France.",
    "Porto di acque profonde di Marsiglia. Porta mediterranea degli yacht in Francia.",
  )),
  hub("port-of-hamburg", "port", "Port of Hamburg", "Hamburg", "Germany", 53.546, 9.966, sky, blurb(
    "Elbe port. North Sea and Baltic yacht door to Germany.",
    "Puerto del Elba. Puerta de yates del mar del Norte y el Báltico a Alemania.",
    "Port de l’Elbe. Porte des yachts mer du Nord et Baltique vers l’Allemagne.",
    "Porto dell’Elba. Porta degli yacht del Mare del Nord e del Baltico verso la Germania.",
  )),
];

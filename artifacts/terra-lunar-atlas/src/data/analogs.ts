export type PlanetaryBody = 'moon' | 'mars';
export type SourceReference = { label: string; url: string };

export type TargetSite = {
  id: string;
  body: PlanetaryBody;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  summary: string;
  sources: SourceReference[];
};

export type EarthSite = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  terrain: string;
  classification: string;
  missionUse: string;
  breaksDown: string;
  sources: SourceReference[];
};

const nasa = (label: string, url: string): SourceReference => ({ label, url });

export const targets: TargetSite[] = [
  {
    id: 'moon-shackleton', body: 'moon', name: 'Shackleton Crater', region: "Moon's South Pole",
    latitude: -89.9, longitude: 0,
    summary: 'A polar crater near permanently shadowed terrain and illuminated highlands. The setting raises questions about access, lighting, slopes, and operations.',
    sources: [nasa('NASA Moon Trek', 'https://trek.nasa.gov/moon/'), nasa('Lunar Reconnaissance Orbiter', 'https://www.nasa.gov/mission/lro/')],
  },
  {
    id: 'moon-malapert', body: 'moon', name: 'Malapert Massif', region: 'Southern Lunar Highlands',
    latitude: -85.99, longitude: -2.3,
    summary: 'A highland region considered in lunar south-pole exploration studies. Local illumination and terrain vary substantially across the area.',
    sources: [nasa('NASA Moon Trek', 'https://trek.nasa.gov/moon/'), nasa('Lunar Reconnaissance Orbiter', 'https://www.nasa.gov/mission/lro/')],
  },
  {
    id: 'moon-taurus-littrow', body: 'moon', name: 'Taurus–Littrow Valley', region: 'Mare Serenitatis, Moon',
    latitude: 20.19, longitude: 30.77,
    summary: 'A valley between massifs and plains visited by Apollo 17. It offers a documented setting for discussing field geology and traverse planning.',
    sources: [nasa('Apollo 17 mission overview', 'https://www.nasa.gov/missions/apollo/apollo-17/')],
  },
  {
    id: 'mars-jezero', body: 'mars', name: 'Jezero Crater', region: 'Northern Mars',
    latitude: 18.44, longitude: 77.45,
    summary: 'An ancient crater containing a former river delta. Perseverance is investigating its geology and collecting samples.',
    sources: [nasa('Mars 2020: Perseverance', 'https://science.nasa.gov/mission/mars-2020-perseverance/'), nasa('Mars Trek', 'https://trek.nasa.gov/mars/')],
  },
  {
    id: 'mars-gale', body: 'mars', name: 'Gale Crater', region: 'Aeolis Mons, Mars',
    latitude: -5.4, longitude: 137.8,
    summary: 'A large impact crater with a layered central mound. Curiosity studies its rocks and records evidence of ancient environmental change.',
    sources: [nasa('Mars Science Laboratory: Curiosity', 'https://science.nasa.gov/mission/msl-curiosity/'), nasa('Mars Trek', 'https://trek.nasa.gov/mars/')],
  },
];

export const earthSites: EarthSite[] = [
  {
    id: 'atacama', name: 'Atacama Desert', region: 'Antofagasta', country: 'Chile',
    latitude: -23.86, longitude: -69.13, terrain: 'Hyper-arid plateau, salt flats, and volcanic slopes',
    classification: 'Established planetary field analogue', missionUse: 'Field trials for robotic mobility, instruments, navigation, and field procedures in arid terrain.',
    breaksDown: "Earth's atmosphere, gravity, water, weathering, and microbial life are unlike the Moon or Mars.",
    sources: [nasa('NASA Astrobiology: Atacama research', 'https://astrobiology.nasa.gov/')],
  },
  {
    id: 'mcmurdo-dry-valleys', name: 'McMurdo Dry Valleys', region: 'Victoria Land', country: 'Antarctica',
    latitude: -77.5, longitude: 163, terrain: 'Ice-free polar valleys, moraines, and exposed bedrock',
    classification: 'Established planetary field analogue', missionUse: 'Cold-environment field operations, robotic sample collection, and geological reconnaissance.',
    breaksDown: 'Earth gravity, atmosphere, active weather, and the seasonal presence of meltwater remain different.',
    sources: [nasa('NASA Astrobiology: Antarctic research', 'https://astrobiology.nasa.gov/')],
  },
  {
    id: 'iceland-highlands', name: 'Icelandic Highlands', region: 'Central Iceland', country: 'Iceland',
    latitude: 64.8, longitude: -18.7, terrain: 'Lava fields, volcanic deserts, and glacial landforms',
    classification: 'Established planetary field analogue', missionUse: 'Comparative work on volcanic geology, mobility, and field protocols.',
    breaksDown: 'Active erosion, precipitation, a dense atmosphere, and biological processes shape this landscape.',
    sources: [nasa('NASA Astrobiology research', 'https://astrobiology.nasa.gov/')],
  },
  {
    id: 'mauna-kea', name: 'Mauna Kea Volcano', region: 'Hawaiian Islands', country: 'United States',
    latitude: 19.82, longitude: -155.47, terrain: 'High-elevation volcanic plateau and young lava flows',
    classification: 'Established planetary field analogue', missionUse: 'Studying volcanic materials and testing field operations on exposed terrain.',
    breaksDown: "Earth's atmosphere, precipitation, gravity, and active weathering differ from planetary surfaces.",
    sources: [nasa('NASA Astrobiology research', 'https://astrobiology.nasa.gov/')],
  },
  {
    id: 'mojave', name: 'Mojave Desert', region: 'Southwestern United States', country: 'United States',
    latitude: 34.87, longitude: -116.62, terrain: 'Arid intermontane basin with alluvial fans',
    classification: 'Established planetary field analogue', missionUse: 'Testing mobility, sensors, field operations, and dust-handling procedures.',
    breaksDown: 'Wind and rare downpours reshape the surface; the atmosphere and biosphere remain.',
    sources: [nasa('NASA Jet Propulsion Laboratory', 'https://www.jpl.nasa.gov/')],
  },
  {
    id: 'death-valley', name: 'Death Valley', region: 'California', country: 'United States',
    latitude: 36.24, longitude: -116.82, terrain: 'Salt basin, dunes, and steep mountain slopes',
    classification: 'Established planetary field analogue', missionUse: 'Arid-terrain field research and navigation-system trials.',
    breaksDown: "Earth's atmospheric processes, gravity, and geological history are not lunar or Martian.",
    sources: [nasa('NASA Jet Propulsion Laboratory', 'https://www.jpl.nasa.gov/')],
  },
  {
    id: 'haughton', name: 'Haughton Crater', region: 'Devon Island', country: 'Canada',
    latitude: 75.37, longitude: -89.68, terrain: 'High-Arctic impact crater with periglacial landforms',
    classification: 'Established planetary field analogue', missionUse: 'Impact geology research and expedition-operations testing.',
    breaksDown: 'Atmospheric weathering, liquid water, and Earth gravity distinguish it from other worlds.',
    sources: [nasa('Haughton-Mars Project', 'https://www.haughtonmarsproject.com/')],
  },
  {
    id: 'danakil', name: 'Danakil Depression', region: 'Afar Triangle', country: 'Ethiopia',
    latitude: 14.24, longitude: 40.3, terrain: 'Volcanic desert, salt plains, and geothermal fields',
    classification: 'Candidate context; not a validated match', missionUse: 'Comparing volcanic surfaces and discussing field operations in extreme aridity.',
    breaksDown: 'Geothermal water, chemically active Earth systems, and biology make this environment distinct.',
    sources: [nasa('NASA Earth Observatory', 'https://earthobservatory.nasa.gov/')],
  },
  {
    id: 'makhtesh-ramon', name: 'Makhtesh Ramon', region: 'Negev', country: 'Israel',
    latitude: 30.6, longitude: 34.8, terrain: 'Erosion cirque with exposed rock layers and dry channels',
    classification: 'Candidate context; not a validated match', missionUse: 'Discussing exposed strata, traverse planning, and geological mapping.',
    breaksDown: 'Water and wind shape this erosional landform; it is not an impact crater.',
    sources: [nasa('NASA Earth Observatory', 'https://earthobservatory.nasa.gov/')],
  },
  {
    id: 'ladakh', name: 'Ladakh Plateau', region: 'Trans-Himalaya', country: 'India',
    latitude: 34.2, longitude: 77.6, terrain: 'Cold high-altitude plateau with arid valleys and sedimentary fans',
    classification: 'Candidate context; not a validated match', missionUse: 'Testing high-altitude operations, autonomous navigation, and geological reconnaissance.',
    breaksDown: 'Thin air is caused by elevation, not a Martian atmosphere; the setting remains biologically active.',
    sources: [nasa('NASA Earth Observatory', 'https://earthobservatory.nasa.gov/')],
  },
  {
    id: 'namib', name: 'Namib Plateau', region: 'Greater Namaqualand', country: 'Namibia',
    latitude: -24.9, longitude: 15, terrain: 'Ancient arid plateau with dunes, gravel surfaces, and exposed rock',
    classification: 'Candidate context; not a validated match', missionUse: 'Discussing aeolian landforms, loose substrate, and rover mobility questions.',
    breaksDown: 'Earth winds, coastal humidity, water, and biological activity remain present.',
    sources: [nasa('NASA Earth Observatory', 'https://earthobservatory.nasa.gov/')],
  },
  {
    id: 'qaidam', name: 'Qaidam Basin', region: 'Tibetan Plateau', country: 'China',
    latitude: 37, longitude: 95, terrain: 'High-altitude arid basin with salt flats, dunes, and alluvial fans',
    classification: 'Candidate context; not a validated match', missionUse: 'Discussing autonomous mobility, dust observations, and remote mapping.',
    breaksDown: 'An Earth atmosphere, water, gravity, and active weathering remain.',
    sources: [nasa('NASA Earth Observatory', 'https://earthobservatory.nasa.gov/')],
  },
  {
    id: 'alvord', name: 'Alvord Desert', region: 'Oregon', country: 'United States',
    latitude: 42.5, longitude: -118.5, terrain: 'Dry lake plain between volcanic ranges',
    classification: 'Candidate context; not a validated match', missionUse: 'Discussing open-plain navigation and the transition between salt flats and volcanic slopes.',
    breaksDown: 'Intermittent precipitation, seasonal water, and Earth atmospheric processes remain.',
    sources: [nasa('NASA Earth Observatory', 'https://earthobservatory.nasa.gov/')],
  },
];

// Comprehensive Sabah / Kota Kinabalu location database
// Used by AI for smart location suggestions and by admin for property listing

export interface Location {
  name: string
  district: string
  region: 'city' | 'suburb' | 'outskirts' | 'rural' | 'island'
  lat: number
  lng: number
  nearby: string[]
  landmarks: string[]
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury'
  description: string
}

export const SABAH_LOCATIONS: Location[] = [
  // === KOTA KINABALU CITY ===
  { name: 'CBD Kota Kinabalu', district: 'Kota Kinabalu', region: 'city', lat: 5.9804, lng: 116.0735, nearby: ['Imago Mall', 'Suria Sabah', 'Waterfront'], landmarks: ['KK Waterfront', 'Atkinson Clock Tower', 'Filipino Market'], priceRange: 'premium', description: 'City center, walking distance to shops and restaurants' },
  { name: 'Likas', district: 'Kota Kinabalu', region: 'city', lat: 5.9978, lng: 116.1068, nearby: ['Likas Bay', 'City Mall', 'UMS'], landmarks: ['Likas Sports Complex', 'City Mall', 'Sabah State Mosque'], priceRange: 'premium', description: 'Waterfront area with sea views, near City Mall' },
  { name: 'Luyang', district: 'Kota Kinabalu', region: 'city', lat: 6.0054, lng: 116.1098, nearby: ['Likas', 'Damai', 'Luyang Clinic'], landmarks: ['Luyang Commercial Centre', 'Damai Plaza'], priceRange: 'premium', description: 'Popular residential area near Likas and Damai' },
  { name: 'Damai', district: 'Kota Kinabalu', region: 'city', lat: 6.0200, lng: 116.1100, nearby: ['Damai Beach', 'Damai Plaza', 'Luyang'], landmarks: ['Damai Beach Resort', 'Karamunting Market'], priceRange: 'premium', description: 'Beachside living with resort vibes' },
  { name: 'Kolombong', district: 'Kota Kinabalu', region: 'city', lat: 5.9700, lng: 116.0700, nearby: ['Centre Point', 'Karamunsing', 'Asia City'], landmarks: ['Centre Point Mall', 'Karamunsing Complex'], priceRange: 'mid', description: 'Central location near shopping and amenities' },
  { name: 'Penampang', district: 'Penampang', region: 'suburb', lat: 5.9330, lng: 116.0500, nearby: ['Damas', 'Kepayan', 'Mile 7'], landmarks: ['SM St Francis', 'Penampang Community Hall'], priceRange: 'mid', description: 'Growing suburb with Kadazan-Dusun cultural heritage' },
  { name: 'Menggatal', district: 'Kota Kinabalu', region: 'suburb', lat: 6.0500, lng: 116.1200, nearby: ['Sepanggar', 'Inanam', 'UMS'], landmarks: ['Menggatal Market', 'UMS Campus'], priceRange: 'mid', description: 'Strategic location near university and highway' },
  { name: 'Inanam', district: 'Kota Kinabalu', region: 'suburb', lat: 6.0350, lng: 116.1400, nearby: ['Menggatal', 'Sepanggar', 'Highway'], landmarks: ['Inanam Market', 'Metrojaya Inanam'], priceRange: 'budget', description: 'Affordable area with good connectivity' },
  { name: 'Sepanggar', district: 'Kota Kinabalu', region: 'suburb', lat: 6.0700, lng: 116.1600, nearby: ['Inanam', 'UMS', 'Airport'], landmarks: ['Sepanggar Bay', 'UMS Campus', 'Sepanggar Jetty'], priceRange: 'budget', description: 'Near airport and university, emerging area' },
  { name: 'Putatan', district: 'Penampang', region: 'suburb', lat: 5.9100, lng: 116.0200, nearby: ['Penampang', 'Kepayan', 'Highway'], landmarks: ['Putatan Market', 'Penampang Road'], priceRange: 'budget', description: 'Affordable suburb with highway access' },
  { name: 'Telipok', district: 'Kota Kinabalu', region: 'suburb', lat: 6.1000, lng: 116.1800, nearby: ['Sepanggar', 'Tuaran'], landmarks: ['Telipok Bridge', 'Tuaran Road'], priceRange: 'budget', description: 'Outskirts area, good for land and houses' },
  { name: 'Kepayan', district: 'Penampang', region: 'suburb', lat: 5.9200, lng: 116.0400, nearby: ['Penampang', 'Putatan', 'Mile 7'], landmarks: ['Kepayan Heights', 'SMK St Joseph'], priceRange: 'mid', description: 'Established residential area' },
  { name: 'Mile 7', district: 'Kota Kinabalu', region: 'suburb', lat: 5.9500, lng: 116.0600, nearby: ['Penampang', 'Kolombong', 'Highway'], landmarks: ['Mile 7 Market', 'Police Station'], priceRange: 'mid', description: 'Well-connected suburb along main road' },

  // === OUTSKIRTS ===
  { name: 'Tuaran', district: 'Tuaran', region: 'outskirts', lat: 6.1800, lng: 116.2300, nearby: ['Sepanggar', 'Ranau', 'Highway'], landmarks: ['Tuaran Town', 'Tuaran Beach'], priceRange: 'budget', description: 'Rural town with scenic coastal views' },
  { name: 'Ranau', district: 'Ranau', region: 'outskirts', lat: 5.9500, lng: 116.6800, nearby: ['Kinabalu Park', 'Poring Hot Springs'], landmarks: ['Mount Kinabalu Viewpoint', 'Desa Dairy Farm'], priceRange: 'budget', description: 'Gateway to Kinabalu Park, cool climate' },
  { name: 'Kota Belud', district: 'Kota Belud', region: 'outskirts', lat: 6.3500, lng: 116.4300, nearby: ['Tuaran', 'Ranau'], landmarks: ['Kota Belud Town', 'Weekly Tamu'], priceRange: 'budget', description: 'Traditional town with weekly market' },
  { name: 'Papar', district: 'Papar', region: 'outskirts', lat: 5.7300, lng: 115.9400, nearby: ['Kimanis', 'Beaufort'], landmarks: ['Papar Town', 'Papar River'], priceRange: 'budget', description: 'Agricultural area south of KK' },
  { name: 'Kimanis', district: 'Papar', region: 'outskirts', lat: 5.6800, lng: 115.8500, nearby: ['Papar', 'Beaufort'], landmarks: ['Kimanis Oil Terminal'], priceRange: 'budget', description: 'Industrial area with highway access' },
  { name: 'Beaufort', district: 'Beaufort', region: 'outskirts', lat: 5.3400, lng: 115.7400, nearby: ['Papar', 'Membakut'], landmarks: ['Beaufort Town', 'Padas River'], priceRange: 'budget', description: 'Railway town with river views' },

  // === EAST COAST ===
  { name: 'Sandakan', district: 'Sandakan', region: 'rural', lat: 5.8400, lng: 118.1200, nearby: ['Lahad Datu', 'Kinabatangan'], landmarks: ['Sepilok Orangutan Centre', 'Sandakan Heritage Trail'], priceRange: 'budget', description: 'Historic city, nature and wildlife' },
  { name: 'Lahad Datu', district: 'Lahad Datu', region: 'rural', lat: 5.0300, lng: 118.3300, nearby: ['Sandakan', 'Tawau'], landmarks: ['Danum Valley', 'Tabin Wildlife Reserve'], priceRange: 'budget', description: 'Gateway to rainforest reserves' },
  { name: 'Tawau', district: 'Tawau', region: 'rural', lat: 4.2500, lng: 117.8900, nearby: ['Lahad Datu', 'Semporna'], landmarks: ['Tawau Hills Park', 'Teck Guan Cocoa Museum'], priceRange: 'budget', description: 'Southernmost city in Sabah' },
  { name: 'Semporna', district: 'Tawau', region: 'rural', lat: 4.4800, lng: 118.6100, nearby: ['Tawau', 'Mabul Island'], landmarks: ['Semporna Jetty', 'Bohey Dulang Island'], priceRange: 'budget', description: 'Diving paradise, gateway to Sipadan' },

  // === INTERIOR ===
  { name: 'Keningau', district: 'Keningau', region: 'rural', lat: 5.3500, lng: 116.1600, nearby: ['Tambunan', 'Beaufort'], landmarks: ['Keningau Town', 'Keningau Dam'], priceRange: 'budget', description: 'Interior town with cultural heritage' },
  { name: 'Tambunan', district: 'Tambunan', region: 'rural', lat: 5.6800, lng: 116.3700, nearby: ['Keningau', 'Ranau'], landmarks: ['Tambunan Town', 'Bamboo Orchestra'], priceRange: 'budget', description: 'Highland district with traditional culture' },

  // === ISLANDS ===
  { name: 'Tunku Abdul Rahman Park', district: 'Kota Kinabalu', region: 'island', lat: 6.0500, lng: 116.0000, nearby: ['Kota Kinabalu City', 'Sutera Harbour'], landmarks: ['Manukan Island', 'Mamutik Island', 'Sapi Island'], priceRange: 'luxury', description: 'Marine park islands, 15-20min by boat' },
  { name: 'Mantanani Island', district: 'Kota Belud', region: 'island', lat: 6.4500, lng: 116.2800, nearby: ['Kota Belud', 'Tuaran'], landmarks: ['Mantanani Big Island', 'Snorkeling spots'], priceRange: 'luxury', description: 'Pristine island with crystal clear water' },
]

// Price range labels
export const PRICE_LABELS: Record<string, string> = {
  budget: 'Budget-Friendly (RM 150k-400k)',
  mid: 'Mid-Range (RM 400k-800k)',
  premium: 'Premium (RM 800k-1.5M)',
  luxury: 'Luxury (RM 1.5M+)',
}

// Districts for dropdown
export const DISTRICTS = [
  'Kota Kinabalu',
  'Penampang',
  'Tuaran',
  'Ranau',
  'Kota Belud',
  'Papar',
  'Beaufort',
  'Sandakan',
  'Lahad Datu',
  'Tawau',
  'Keningau',
  'Tambunan',
  'Kudat',
]

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Known facilities in Sabah (schools, hospitals, malls, etc.)
export const SABAH_FACILITIES = [
  // Schools
  { name: 'SM St Francis', type: 'school', lat: 5.9330, lng: 116.0500, area: 'Penampang' },
  { name: 'SMK St Joseph', type: 'school', lat: 5.9200, lng: 116.0400, area: 'Kepayan' },
  { name: 'SM All Saints', type: 'school', lat: 5.9804, lng: 116.0735, area: 'KK CBD' },
  { name: 'SMK Likas', type: 'school', lat: 5.9978, lng: 116.1068, area: 'Likas' },
  { name: 'SK Kolombong', type: 'school', lat: 5.9700, lng: 116.0700, area: 'Kolombong' },
  { name: 'SMK Inanam', type: 'school', lat: 6.0350, lng: 116.1400, area: 'Inanam' },
  { name: 'SMK Menggatal', type: 'school', lat: 6.0500, lng: 116.1200, area: 'Menggatal' },
  { name: 'International School Kota Kinabalu', type: 'school', lat: 6.0054, lng: 116.1098, area: 'Luyang' },
  { name: 'Maktab Sabah', type: 'school', lat: 5.9804, lng: 116.0735, area: 'KK CBD' },
  // Hospitals
  { name: 'Hospital Queen Elizabeth', type: 'hospital', lat: 5.9804, lng: 116.0735, area: 'KK CBD' },
  { name: 'Hospital Damai', type: 'hospital', lat: 6.0200, lng: 116.1100, area: 'Damai' },
  { name: 'KPJ Sabah', type: 'hospital', lat: 5.9700, lng: 116.0700, area: 'Kolombong' },
  { name: 'Gleneagles Kota Kinabalu', type: 'hospital', lat: 5.9978, lng: 116.1068, area: 'Likas' },
  // Malls
  { name: 'Imago Mall', type: 'mall', lat: 5.9804, lng: 116.0735, area: 'KK CBD' },
  { name: 'Suria Sabah', type: 'mall', lat: 5.9804, lng: 116.0735, area: 'KK CBD' },
  { name: 'Centre Point Mall', type: 'mall', lat: 5.9700, lng: 116.0700, area: 'Kolombong' },
  { name: 'City Mall', type: 'mall', lat: 5.9978, lng: 116.1068, area: 'Likas' },
  { name: 'Damai Plaza', type: 'mall', lat: 6.0200, lng: 116.1100, area: 'Damai' },
  { name: 'Karamunsing Complex', type: 'mall', lat: 5.9700, lng: 116.0700, area: 'Kolombong' },
  // Universities
  { name: 'UMS (Universiti Malaysia Sabah)', type: 'university', lat: 6.0700, lng: 116.1600, area: 'Sepanggar' },
  { name: 'UITM Sabah', type: 'university', lat: 5.9330, lng: 116.0500, area: 'Penampang' },
  // Airports
  { name: 'KK International Airport', type: 'airport', lat: 5.9330, lng: 116.0500, area: 'Sepanggar' },
]

// Find nearby facilities for a given location
export function getNearbyFacilities(locationName: string, maxDistanceKm: number = 10): string[] {
  const loc = SABAH_LOCATIONS.find(l => l.name.toLowerCase().includes(locationName.toLowerCase()))
  if (!loc) return []

  const nearby = SABAH_FACILITIES
    .map(f => ({
      ...f,
      distance: calculateDistance(loc.lat, loc.lng, f.lat, f.lng),
    }))
    .filter(f => f.distance <= maxDistanceKm)
    .sort((a, b) => a.distance - b.distance)

  return nearby.map(f => `${f.name} (${f.type}) — ${f.distance.toFixed(1)}km away`)
}

// Generate distance answer for AI
export function getDistanceAnswer(propertyLocation: string, query: string): string {
  const facilities = getNearbyFacilities(propertyLocation, 15)
  if (facilities.length === 0) return ''

  const q = query.toLowerCase()
  let filtered = facilities

  if (q.includes('school') || q.includes('sekolah')) {
    filtered = facilities.filter(f => f.includes('school') || f.includes('School') || f.includes('SM') || f.includes('SK'))
  } else if (q.includes('hospital') || q.includes('klinik')) {
    filtered = facilities.filter(f => f.includes('hospital') || f.includes('Hospital') || f.includes('KPJ') || f.includes('Gleneagles'))
  } else if (q.includes('mall') || q.includes('shopping')) {
    filtered = facilities.filter(f => f.includes('Mall') || f.includes('Plaza') || f.includes('Complex') || f.includes('Suria'))
  } else if (q.includes('university') || q.includes('universiti') || q.includes('college')) {
    filtered = facilities.filter(f => f.includes('UMS') || f.includes('UITM') || f.includes('University') || f.includes('Sabah'))
  }

  if (filtered.length === 0) return `I don't have specific ${query} data for ${propertyLocation}, but I can help you find one!`

  return `Near ${propertyLocation}:\n${filtered.slice(0, 5).join('\n')}`
}

// Search locations by name, district, or landmark
export function searchLocations(query: string): Location[] {
  const q = query.toLowerCase()
  return SABAH_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(q) ||
    loc.district.toLowerCase().includes(q) ||
    loc.nearby.some(n => n.toLowerCase().includes(q)) ||
    loc.landmarks.some(l => l.toLowerCase().includes(q)) ||
    loc.description.toLowerCase().includes(q)
  )
}

// Get nearby locations
export function getNearbyLocations(locationName: string): Location[] {
  const loc = SABAH_LOCATIONS.find(l => l.name.toLowerCase().includes(locationName.toLowerCase()))
  if (!loc) return []
  return SABAH_LOCATIONS.filter(l =>
    l.name !== loc.name &&
    (l.district === loc.district || loc.nearby.includes(l.name) || l.nearby.includes(loc.name))
  ).slice(0, 5)
}

// Get locations by price range
export function getLocationsByPrice(range: 'budget' | 'mid' | 'premium' | 'luxury'): Location[] {
  return SABAH_LOCATIONS.filter(loc => loc.priceRange === range)
}

// Generate location suggestion text for AI
export function getLocationSuggestionText(query: string): string {
  const locations = searchLocations(query)
  if (locations.length === 0) return ''

  return locations.map(loc =>
    `${loc.name} (${loc.district}): ${loc.description}. Near: ${loc.nearby.join(', ')}. Price: ${PRICE_LABELS[loc.priceRange]}`
  ).join('\n')
}

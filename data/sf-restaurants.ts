// Top 25 SF Restaurants 2025 (Source: Beli)
// This data can be used to seed the restaurants table

export type ReservationPlatform = 'resy' | 'tock' | 'opentable' | 'unknown';

export interface Restaurant {
  rank: number;
  name: string;
  neighborhood: string;
  platform: ReservationPlatform;
  // platform_id to be filled in when setting up scrapers
  platform_id?: string;
}

export const sfRestaurants: Restaurant[] = [
  // Top 12
  { rank: 1, name: "Noodle in a Haystack", neighborhood: "Richmond", platform: "resy" },
  { rank: 2, name: "Lazy Bear", neighborhood: "Mission", platform: "tock" },
  { rank: 3, name: "Californios", neighborhood: "SoMa", platform: "tock" },
  { rank: 4, name: "Ox & Tiger", neighborhood: "Union Square", platform: "resy" },
  { rank: 5, name: "Saison", neighborhood: "SoMa", platform: "tock" },
  { rank: 6, name: "Friends Only", neighborhood: "Nob Hill", platform: "resy" },
  { rank: 7, name: "Khao Tiew", neighborhood: "West Portal", platform: "resy" },
  { rank: 8, name: "Benu", neighborhood: "SoMa", platform: "tock" },
  { rank: 9, name: "Quince", neighborhood: "Jackson Square", platform: "tock" },
  { rank: 10, name: "San Ho Won", neighborhood: "Mission", platform: "resy" },
  { rank: 11, name: "Kusakabe", neighborhood: "Jackson Square", platform: "resy" },
  { rank: 12, name: "Atelier Crenn", neighborhood: "Cow Hollow", platform: "tock" },

  // 13-25
  { rank: 13, name: "Hwa Mi Won", neighborhood: "Richmond", platform: "unknown" },
  { rank: 14, name: "Cotogna", neighborhood: "Jackson Square", platform: "resy" },
  { rank: 15, name: "Tiya", neighborhood: "Marina", platform: "resy" },
  { rank: 16, name: "Acquerello", neighborhood: "Nob Hill", platform: "resy" },
  { rank: 17, name: "Dalida", neighborhood: "Presidio", platform: "resy" },
  { rank: 18, name: "Copra", neighborhood: "Fillmore", platform: "resy" },
  { rank: 19, name: "Mr. Pollo", neighborhood: "Mission", platform: "unknown" },
  { rank: 20, name: "Kokkari Estiatorio", neighborhood: "Financial District", platform: "opentable" },
  { rank: 21, name: "Anh Hong", neighborhood: "Richmond", platform: "unknown" },
  { rank: 22, name: "Nari", neighborhood: "Japantown", platform: "resy" },
  { rank: 23, name: "El Gallo Giro", neighborhood: "Mission", platform: "unknown" },
  { rank: 24, name: "Aziza", neighborhood: "Richmond", platform: "resy" },
  { rank: 25, name: "The Happy Crane", neighborhood: "Hayes Valley", platform: "resy" },
];

// Helper to get restaurants by platform
export const getRestaurantsByPlatform = (platform: ReservationPlatform) =>
  sfRestaurants.filter((r) => r.platform === platform);

// Restaurants that use Resy (MVP focus)
export const resyRestaurants = getRestaurantsByPlatform('resy');

// Restaurants that use Tock (Phase 2)
export const tockRestaurants = getRestaurantsByPlatform('tock');

// SF Neighborhoods for filtering
export const sfNeighborhoods = [
  ...new Set(sfRestaurants.map((r) => r.neighborhood)),
].sort();

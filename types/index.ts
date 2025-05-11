export enum RegionFilter {
  ALL = "All Regions",
  EUROPE = "Europe",
  ASIA = "Asia",
  AFRICA = "Africa",
  OCEANIA = "Oceania",
  NORTH_AMERICA = "North America",
  SOUTH_AMERICA = "South America"
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  description: string;
  region: RegionFilter;
  isLive: boolean;
  currentShow?: string;
  viewers?: number;
  rating?: number;
  tags?: string[];
  category: string;
  streamUrl?: string;
  schedule?: { time: string; title: string }[];
}

export interface Category {
  id: string;
  title: string;
  channels: Channel[];
}

export interface RelatedShow {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration?: string;
  views?: number;
  isLive?: boolean;
} 
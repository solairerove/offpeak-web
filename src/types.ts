export interface WeatherMonth {
  month: number;
  avg_high_c: number;
  avg_low_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  rain_days: number;
  heat_index_c: number;
  typhoon_risk: 'none' | 'low' | 'moderate' | 'high';
  notes: string;
}

export interface ArrivalDataPoint {
  year: number;
  month: number;
  visitors_thousands: number;
}

export interface MonthlyIndex {
  month: number;
  normalized: number;
}

export interface ArrivalsData {
  years: number[];
  data: ArrivalDataPoint[];
  monthly_index: MonthlyIndex[];
}

export interface MonthScore {
  month: number;
  comfort: number;
  crowd_index: number;
  typhoon_penalty: number;
  holiday_penalty: number;
  price_index: number | null;
  price_penalty: number | null;
  overall: number;
}

export interface CityListItem {
  slug: string;
  name: string;
}

export interface HolidayOccurrence {
  year: number;
  date_start: string;  // "YYYY-MM-DD"
  date_end: string;    // "YYYY-MM-DD"; may be year+1 for Dec→Jan events
  month_start: number;
  month_end: number;
}

export interface Holiday {
  id: string;
  name: string;
  crowd_impact: 'extreme' | 'very_high' | 'high' | 'moderate' | 'low' | 'none';
  price_impact: 'high' | 'moderate' | 'low' | 'none';
  closure_impact: 'significant' | 'minimal' | 'none';
  notes: string;
  occurrences: HolidayOccurrence[];
}

export interface Note {
  category: string;
  text: string;
}

export interface CityData {
  city: string;
  slug: string;
  weather: WeatherMonth[];
  arrivals: ArrivalsData;
  holidays: Holiday[];
  notes: Note[];
  monthly_scores: MonthScore[];
}

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

export interface Holiday {
  name: string;
  typical_month_start: number;
  typical_month_end: number;
  crowd_impact: 'extreme' | 'very_high' | 'high' | 'moderate' | 'low';
  price_impact: 'high' | 'moderate' | 'low' | 'none';
  closure_impact: 'significant' | 'minimal' | 'none';
  notes: string;
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
}

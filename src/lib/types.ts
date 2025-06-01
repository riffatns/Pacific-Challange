// src/lib/types.ts

// Data mentah dari CSV (sesuai kolom yang Anda berikan)
export interface RawCsvData {
  STRUCTURE: string;
  STRUCTURE_ID: string;
  STRUCTURE_NAME: string;
  ACTION: string;
  FREQ: string;
  Frequency: string;
  GEO_PICT: string; // Kode Negara
  'Pacific Island Countries and territories': string; // Nama Negara
  INDICATOR: string;
  Indicator: string;
  SEX: string; // Kode Jenis Kelamin
  Sex: string;
  AGE: string;
  Age: string;
  URBANIZATION: string;
  Urbanization: string;
  DISABILITY: string;
  Disability: string;
  FTPT: string; // Pembeda Full-time/Part-time?
  'Full time/part time': string;
  TIME_PERIOD: string; // Tahun
  OBS_VALUE: string; // Nilai Jumlah Pekerja
  UNIT_MEASURE: string;
  'Unit of measure': string;
  UNIT_MULT: string;
  'Unit multiplier': string;
  OBS_STATUS: string;
  'Observation Status': string;
  DATA_SOURCE: string;
  'Data source': string;
  OBS_COMMENT: string;
  Comment: string;
  CONF_STATUS: string;
  'Confidentiality status': string;
}

// Data point untuk Bar Chart (perbandingan negara, tahun terakhir)
export interface EmploymentDataPoint {
  countryName: string;
  year: number; // Tahun data (terbaru)
  fullTime: number;
  partTime: number;
  totalEmployed: number;
}

// Props untuk komponen EmploymentCountryComparisonBar
export interface EmploymentCountryComparisonBarProps {
  data: EmploymentDataPoint[];
  width: number;
  height: number;
}

// Data point untuk satu titik waktu pada Line Chart
export interface TimeSeriesPoint {
  year: number;
  value: number; // Nilai observasi (misalnya, total pekerja)
}

// Data untuk satu garis (satu negara) pada Line Chart
export interface CountryTimeSeriesData {
  countryName: string;
  countryCode: string; // GEO_PICT
  values: TimeSeriesPoint[];
}

// Props untuk komponen EmploymentTrendLineChart
export interface EmploymentTrendLineChartProps {
  data: CountryTimeSeriesData[];
  width: number;
  height: number;
  selectedCountryCodes?: string[];
}

export interface AgeSpecificEmploymentValue {
  ageGroup: string; // e.g., "15-24", "25-54", "55-64"
  fullTime: number;
  partTime: number;
}

export interface CountryAgeSpecificEmploymentData {
  countryCode: string;
  countryName: string;
  year: number;
  ageCompositions: AgeSpecificEmploymentValue[];
}

// For the dropdown
export interface CountryOption {
  code: string;
  name: string;
}

// Types for Gender Disparity Chart (Idea 2)
export interface GenderSpecificValue {
  year: number;
  male: number;
  female: number;
}

export interface CountryGenderEmploymentData {
  countryCode: string;
  countryName: string;
  // employmentStatus: 'FT' | 'PT' | '_T'; // This will be a parameter to the loader
  trend: GenderSpecificValue[];
}

// Types for Employment Ratio Trends Chart (Idea 3)
export interface EmploymentRatioPoint {
  year: number;
  fullTimePercentage: number;
  partTimePercentage: number;
}

export interface CountryEmploymentRatioTrend {
  countryCode: string;
  countryName: string;
  values: EmploymentRatioPoint[];
}
// src/lib/data-loader.ts
import * as d3 from 'd3';
import {
  EmploymentDataPoint,
  RawCsvData,
  CountryTimeSeriesData,
  TimeSeriesPoint,
  CountryAgeSpecificEmploymentData,
  AgeSpecificEmploymentValue
} from './types';

// --- PLACEHOLDER IDENTIFIERS ---
// !! PENTING: GANTI PLACEHOLDER INI DENGAN NILAI SEBENARNYA DARI DATASET ANDA !!
const FULL_TIME_IDENTIFIER_PLACEHOLDER = 'FT'; // Diperbarui dari 'FT_PLACEHOLDER'
const PART_TIME_IDENTIFIER_PLACEHOLDER = 'PT'; // Diperbarui dari 'PT_PLACEHOLDER'
const TOTAL_SEX_IDENTIFIER_PLACEHOLDER = '_T'; // Contoh: '_T' untuk Total. Konfirmasi ini!
// --- END OF PLACEHOLDER IDENTIFIERS ---

// Pemetaan untuk nama kelompok usia yang lebih deskriptif
const AGE_GROUP_MAP: { [key: string]: string } = {
  'Y15T24': '15-24 tahun',
  'Y25T54': '25-54 tahun',
  'Y55T64': '55-64 tahun',
  'Y65+': '65+ tahun',
  'Y15T19': '15-19 tahun',
  'Y20T24': '20-24 tahun',
  'Y15T29': '15-29 tahun',
  'Y25+': '25+ tahun',
  'Y30T34': '30-34 tahun',
  'Y35T39': '35-39 tahun',
  'Y40T44': '40-44 tahun',
  'Y45T49': '45-49 tahun',
  'Y50T54': '50-54 tahun',
  'Y55T59': '55-59 tahun',
  'Y60T64': '60-64 tahun',
  // Tambahkan pemetaan lain jika ada kelompok usia berbeda di CSV
};

// Fungsi Transformasi untuk Bar Chart (EmploymentCountryComparisonBar)
const transformDataForBarChart = (rawData: RawCsvData[]): EmploymentDataPoint[] => {
  console.log("[BarChart] Raw data sample (first 5 rows):", rawData.slice(0, 5));
  const latestYearPerCountry = new Map<string, number>();
  rawData.forEach(d => {
    const year = parseInt(d.TIME_PERIOD, 10);
    const countryCode = d.GEO_PICT;
    if (!isNaN(year) && countryCode) {
      if (!latestYearPerCountry.has(countryCode) || year > latestYearPerCountry.get(countryCode)!) {
        latestYearPerCountry.set(countryCode, year);
      }
    }
  });

  console.log("[BarChart] Latest year per country:", latestYearPerCountry);
  const processedDataMap = new Map<string, {
    countryName: string;
    year: number;
    fullTime: number;
    partTime: number;
  }>();

  rawData.forEach(d => {
    const countryCode = d.GEO_PICT;
    const countryName = d['Pacific Island Countries and territories'];
    const year = parseInt(d.TIME_PERIOD, 10);
    const obsValue = parseInt(d.OBS_VALUE, 10) || 0;
    const sex = d.SEX;
    const ftptIndicator = d.FTPT; // Kolom yang diduga membedakan FT/PT

    if (countryCode && !isNaN(year) && year === latestYearPerCountry.get(countryCode) && sex === TOTAL_SEX_IDENTIFIER_PLACEHOLDER) {
      if (!processedDataMap.has(countryCode)) {
        processedDataMap.set(countryCode, {
          countryName: countryName || countryCode,
          year: year,
          fullTime: 0,
          partTime: 0,
        });
      }
      const entry = processedDataMap.get(countryCode)!;
      // Gunakan placeholder yang didefinisikan di atas
      if (ftptIndicator === FULL_TIME_IDENTIFIER_PLACEHOLDER) {
        entry.fullTime += obsValue;
      } else if (ftptIndicator === PART_TIME_IDENTIFIER_PLACEHOLDER) {
        entry.partTime += obsValue;
      }
    }
  });

  // console.log("[BarChart] Processed data map:", processedDataMap); // Can be very verbose
  const result = Array.from(processedDataMap.values())
    .map(countryData => ({
      ...countryData,
      totalEmployed: countryData.fullTime + countryData.partTime,
    }))
    .filter(d => d.totalEmployed > 0)
    .sort((a, b) => b.totalEmployed - a.totalEmployed);
  console.log("[BarChart] Transformed data sample (first 5 rows):", result.slice(0,5));
  console.log("[BarChart] Total transformed entries:", result.length);
  return result;
};

// Fungsi Loader untuk Bar Chart
export const loadEmploymentData = async (): Promise<EmploymentDataPoint[]> => {
  try {
    // Pastikan CSV ada di 'public/data/'
    const csvPath = '/data/SPC,DF_EMPLOYED_FTPT,1.0+A....._T._T..csv';
    console.log("[BarChart] Attempting to load CSV from:", csvPath);
    const rawData = await d3.csv(csvPath) as unknown as RawCsvData[];
    if (!rawData || rawData.length === 0) {
        console.warn("[BarChart] loadEmploymentData: Data CSV tidak ditemukan atau kosong dari", csvPath);
        return [];
    }
    console.log(`[BarChart] loadEmploymentData: Successfully loaded ${rawData.length} rows.`);
    return transformDataForBarChart(rawData);
  } catch (error) {
    console.error("Error loading data for Bar Chart (loadEmploymentData):", error);
    return [];
  }
};

// Fungsi Transformasi untuk Line Chart (EmploymentTrendLineChart)
const transformDataForLineChart = (rawData: RawCsvData[]): CountryTimeSeriesData[] => {
  console.log("[LineChart] Raw data sample (first 5 rows):", rawData.slice(0, 5));
  const dataByCountryAndYear = new Map<string, Map<number, number>>();

  rawData.forEach(d => {
    const countryCode = d.GEO_PICT;
    const countryName = d['Pacific Island Countries and territories'] || countryCode;
    const year = parseInt(d.TIME_PERIOD, 10);
    const obsValue = parseInt(d.OBS_VALUE, 10) || 0;
    const sex = d.SEX;

    // Filter hanya untuk jenis kelamin 'Total' (sesuai placeholder) dan data valid
    if (countryCode && countryName && !isNaN(year) && obsValue > 0 && sex === TOTAL_SEX_IDENTIFIER_PLACEHOLDER) {
      const countryKey = `${countryCode}|${countryName}`;
      if (!dataByCountryAndYear.has(countryKey)) {
        dataByCountryAndYear.set(countryKey, new Map<number, number>());
      }
      const yearMap = dataByCountryAndYear.get(countryKey)!;
      yearMap.set(year, (yearMap.get(year) || 0) + obsValue);
    }
  });

  console.log("[LineChart] Aggregated data by country and year:", dataByCountryAndYear);
  const result: CountryTimeSeriesData[] = [];
  dataByCountryAndYear.forEach((yearMap, countryKey) => {
    const [countryCode, countryName] = countryKey.split('|');
    const timeSeriesPoints: TimeSeriesPoint[] = Array.from(yearMap.entries())
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);

    if (timeSeriesPoints.length > 1) { // Hanya negara dengan >1 titik data
      result.push({ countryCode, countryName, values: timeSeriesPoints });
    }
  });
  console.log("[LineChart] Transformed data sample (first 5 rows):", result.slice(0,5));
  console.log("[LineChart] Total transformed entries:", result.length);
  return result.sort((a,b) => a.countryName.localeCompare(b.countryName));
};

// Fungsi Loader untuk Line Chart
export const loadEmploymentTimeSeriesData = async (): Promise<CountryTimeSeriesData[]> => {
  try {
    // Pastikan CSV ada di 'public/data/'
    const csvPath = '/data/SPC,DF_EMPLOYED_FTPT,1.0+A....._T._T..csv';
    console.log("[LineChart] Attempting to load CSV from:", csvPath);
    const rawData = await d3.csv(csvPath) as unknown as RawCsvData[];
    if (!rawData || rawData.length === 0) {
        console.warn("[LineChart] loadEmploymentTimeSeriesData: Data CSV tidak ditemukan atau kosong dari", csvPath);
        return [];
    }
    console.log(`[LineChart] loadEmploymentTimeSeriesData: Successfully loaded ${rawData.length} rows.`);
    return transformDataForLineChart(rawData);
  } catch (error) {
    console.error("Error loading time series data (loadEmploymentTimeSeriesData):", error);
    return [];
  }
};

// Fungsi Loader untuk data spesifik usia (Age-specific data)
export const loadAgeSpecificEmploymentData = async (
  selectedCountryCode: string
): Promise<CountryAgeSpecificEmploymentData | null> => {
  if (!selectedCountryCode) return null;
  console.log(`[AgeChart] Loading age-specific data for country: ${selectedCountryCode}`);

  try {
    const csvPath = '/data/SPC,DF_EMPLOYED_FTPT,1.0+A....._T._T..csv';
    const rawData = await d3.csv(csvPath) as unknown as RawCsvData[];

    if (!rawData || rawData.length === 0) {
      console.warn("[AgeChart] CSV data not found or empty.");
      return null;
    }

    const countryDataFilteredBySex = rawData.filter(
      d => d.GEO_PICT === selectedCountryCode && d.SEX === TOTAL_SEX_IDENTIFIER_PLACEHOLDER
    );

    if (countryDataFilteredBySex.length === 0) {
      console.warn(`[AgeChart] No data found for country ${selectedCountryCode} with SEX='${TOTAL_SEX_IDENTIFIER_PLACEHOLDER}'.`);
      return null;
    }

    let latestYear = 0;
    countryDataFilteredBySex.forEach(d => {
      const year = parseInt(d.TIME_PERIOD, 10);
      if (!isNaN(year) && year > latestYear) {
        latestYear = year;
      }
    });

    if (latestYear === 0) {
      console.warn(`[AgeChart] No valid year found for country ${selectedCountryCode}.`);
      return null;
    }
    console.log(`[AgeChart] Latest year for ${selectedCountryCode}: ${latestYear}`);

    const ageCompositions: AgeSpecificEmploymentValue[] = [];
    const ageDataForYear = countryDataFilteredBySex.filter(d => parseInt(d.TIME_PERIOD, 10) === latestYear);
    
    let countryName = '';
    if (ageDataForYear.length > 0) {
        countryName = ageDataForYear[0]['Pacific Island Countries and territories'] || selectedCountryCode;
    } else if (countryDataFilteredBySex.length > 0) { // Fallback if no data for latest year but country exists
        countryName = countryDataFilteredBySex[0]['Pacific Island Countries and territories'] || selectedCountryCode;
    }


    const uniqueAgeCodes = Array.from(new Set(ageDataForYear.map(d => d.AGE))).filter(ageCode => ageCode !== '_T' && ageCode !== 'TOTAL'); // Exclude total age indicators

    console.log(`[AgeChart] Unique age codes for ${selectedCountryCode}, year ${latestYear}:`, uniqueAgeCodes);

    uniqueAgeCodes.forEach(ageCode => {
      const ageGroupSpecificData = ageDataForYear.filter(d => d.AGE === ageCode);
      if (ageGroupSpecificData.length === 0) return;

      let fullTime = 0;
      let partTime = 0;

      ageGroupSpecificData.forEach(d => {
        const obsValue = parseInt(d.OBS_VALUE, 10) || 0;
        if (d.FTPT === FULL_TIME_IDENTIFIER_PLACEHOLDER) {
          fullTime += obsValue;
        } else if (d.FTPT === PART_TIME_IDENTIFIER_PLACEHOLDER) {
          partTime += obsValue;
        }
      });
      
      if (fullTime > 0 || partTime > 0) {
           ageCompositions.push({
            ageGroup: AGE_GROUP_MAP[ageCode] || ageCode,
            fullTime,
            partTime,
          });
      }
    });
    
    if (ageCompositions.length === 0) {
      console.warn(`[AgeChart] No age composition data processed for ${countryName} (${selectedCountryCode}), year ${latestYear}.`);
      return { // Return with empty compositions if country is valid but no breakdown
        countryCode: selectedCountryCode,
        countryName: countryName,
        year: latestYear,
        ageCompositions: [],
      };
    }
    
    console.log(`[AgeChart] Processed age compositions for ${countryName}:`, ageCompositions);

    return {
      countryCode: selectedCountryCode,
      countryName: countryName,
      year: latestYear,
      ageCompositions,
    };

  } catch (error) {
    console.error(`[AgeChart] Error loading age-specific employment data for ${selectedCountryCode}:`, error);
    return null;
  }
};
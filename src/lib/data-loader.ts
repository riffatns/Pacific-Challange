// src/lib/data-loader.ts
import * as d3 from 'd3';
// Import types for use within this module
import type {
  EmploymentDataPoint,
  RawCsvData,
  CountryTimeSeriesData,
  TimeSeriesPoint,
  CountryAgeSpecificEmploymentData,
  AgeSpecificEmploymentValue,
  CountryGenderEmploymentData,
  GenderSpecificValue,
  CountryEmploymentRatioTrend,
  EmploymentRatioPoint,
  CountryOption, // Added CountryOption
  BubbleMapItem // Added BubbleMapItem
} from './types';

// Re-export types for consumers of this module
export type {
  EmploymentDataPoint,
  RawCsvData,
  CountryTimeSeriesData,
  TimeSeriesPoint,
  CountryAgeSpecificEmploymentData,
  AgeSpecificEmploymentValue,
  CountryGenderEmploymentData,
  GenderSpecificValue,
  CountryEmploymentRatioTrend,
  EmploymentRatioPoint,
  CountryOption,
  BubbleMapItem
};

// --- PLACEHOLDER IDENTIFIERS ---
// !! PENTING: GANTI PLACEHOLDER INI DENGAN NILAI SEBENARNYA DARI DATASET ANDA !!
const FULL_TIME_IDENTIFIER_PLACEHOLDER = 'FT'; // Diperbarui dari 'FT_PLACEHOLDER'
const PART_TIME_IDENTIFIER_PLACEHOLDER = 'PT'; // Diperbarui dari 'PT_PLACEHOLDER'
const TOTAL_SEX_IDENTIFIER_PLACEHOLDER = '_T'; // Contoh: '_T' untuk Total. Konfirmasi ini!
// --- END OF PLACEHOLDER IDENTIFIERS ---

// Pemetaan untuk nama kelompok usia yang lebih deskriptif
const AGE_GROUP_MAP: { [key: string]: string } = {
  'Y15T24': '15-24 years',
  'Y25T54': '25-54 years',
  'Y55T64': '55-64 years',
  'Y65T999': '65-99 years', // Updated to match actual CSV data
  'Y65+': '65+ years',
  'Y15T19': '15-19 years',
  'Y20T24': '20-24 years',
  'Y15T29': '15-29 years',
  'Y25+': '25+ years',
  'Y30T34': '30-34 years',
  'Y35T39': '35-39 years',
  'Y40T44': '40-44 years',
  'Y45T49': '45-49 years',
  'Y50T54': '50-54 years',
  'Y55T59': '55-59 years',
  'Y60T64': '60-64 years',
  // Add other mappings if there are different age groups in CSV
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
  dataByCountryAndYear.forEach((yearMap, countryKey) => {    const [countryCode, countryName] = countryKey.split('|');
    const timeSeriesPoints: TimeSeriesPoint[] = Array.from(yearMap.entries())
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);

    // Include all countries regardless of number of data points
    result.push({ countryCode, countryName, values: timeSeriesPoints });
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

// New data loader for Gender Disparity Chart (Idea 2)
export const loadGenderEmploymentData = async (
  countryCode: string,
  employmentStatus: 'FT' | 'PT' | '_T' // Full-time, Part-time, or Total
): Promise<CountryGenderEmploymentData | null> => {
  console.log(`[GenderChart] Loading gender data for country: ${countryCode}, status: ${employmentStatus}`);
  try {
    const csvPath = '/data/SPC,DF_EMPLOYED_FTPT,1.0+A....._T._T..csv';
    const rawData = await d3.csv(csvPath) as unknown as RawCsvData[];

    const countryData = rawData.filter(
      (row) => 
        row.GEO_PICT === countryCode && 
        row.FTPT === employmentStatus && // This should be _T for total employment by gender
        (row.SEX === 'M' || row.SEX === 'F') && 
        row.AGE === '_T' // All ages
    );
    console.log(`[GenderChart] Filtered raw data for ${countryCode} (${employmentStatus}), AGE='_T', SEX='M' or 'F':`, countryData);


    if (countryData.length === 0) {
      console.warn(`[GenderChart] No data found for country ${countryCode} with employment status ${employmentStatus}, AGE='_T', SEX='M' or 'F'.`);
      return null;
    }

    const countryName = countryData[0]['Pacific Island Countries and territories'] || countryCode;

    const trendByYear: { [year: number]: { male: number; female: number } } = {};

    countryData.forEach(row => {
      const year = parseInt(row.TIME_PERIOD, 10);
      const value = parseInt(row.OBS_VALUE, 10) || 0;

      if (!trendByYear[year]) {
        trendByYear[year] = { male: 0, female: 0 };
      }

      if (row.SEX === 'M') {
        trendByYear[year].male += value;
      } else if (row.SEX === 'F') {
        trendByYear[year].female += value;
      }
    });

    const trend: GenderSpecificValue[] = Object.entries(trendByYear)
      .map(([yearStr, values]) => ({
        year: parseInt(yearStr, 10),
        male: values.male,
        female: values.female,
      }))
      .filter(d => d.male > 0 || d.female > 0) // Ensure there's some data for the year
      .sort((a, b) => a.year - b.year);

    if (trend.length === 0) {
        console.warn(`[GenderChart] Trend data is empty after processing for ${countryName}. Original filtered count: ${countryData.length}`);
        return { // Return with empty trend if country is valid but no breakdown by year/gender
            countryCode,
            countryName,
            trend: [],
        };
    }
    console.log(`[GenderChart] Processed gender trend for ${countryName}:`, trend);


    return {
      countryCode,
      countryName,
      trend,
    };

  } catch (error) {
    console.error(`[GenderChart] Error loading gender employment data for ${countryCode} (${employmentStatus}):`, error);
    return null;
  }
};

// New data loader for Employment Ratio Trends (Idea 3)
export const loadEmploymentRatioTrendData = async (
  countryCode: string
): Promise<CountryEmploymentRatioTrend | null> => {
  console.log(`[RatioChart] Loading ratio data for country: ${countryCode}`);
  try {
    const csvPath = '/data/SPC,DF_EMPLOYED_FTPT,1.0+A....._T._T..csv';
    const rawData = await d3.csv(csvPath) as unknown as RawCsvData[];

    // Filter for rows relevant to the selected country, total sex, total age
    // And where FTPT is FT, PT, or _T (Total)
    const countryData = rawData.filter(
      (row) => 
        row.GEO_PICT === countryCode &&
        row.SEX === '_T' && 
        row.AGE === '_T' && 
        (row.FTPT === FULL_TIME_IDENTIFIER_PLACEHOLDER || row.FTPT === PART_TIME_IDENTIFIER_PLACEHOLDER || row.FTPT === TOTAL_SEX_IDENTIFIER_PLACEHOLDER)
    );
    console.log(`[RatioChart] Filtered raw data for ${countryCode} (SEX='_T', AGE='_T', FTPT='FT' or 'PT' or '_T'):`, countryData);


    if (countryData.length === 0) {
      console.warn(`[RatioChart] No data found for country ${countryCode} for employment ratio trend analysis (SEX='_T', AGE='_T').`);
      return null;
    }

    const countryName = countryData[0]['Pacific Island Countries and territories'] || countryCode;
    const yearlyData: { 
      [year: number]: { fullTime: number; partTime: number; total: number } 
    } = {};

    countryData.forEach(row => {
      const year = parseInt(row.TIME_PERIOD, 10);
      const value = parseInt(row.OBS_VALUE, 10) || 0;

      if (!yearlyData[year]) {
        yearlyData[year] = { fullTime: 0, partTime: 0, total: 0 };
      }

      if (row.FTPT === FULL_TIME_IDENTIFIER_PLACEHOLDER) {
        yearlyData[year].fullTime = value; // Assuming one value per year/FTPT type
      } else if (row.FTPT === PART_TIME_IDENTIFIER_PLACEHOLDER) {
        yearlyData[year].partTime = value; // Assuming one value per year/FTPT type
      } else if (row.FTPT === TOTAL_SEX_IDENTIFIER_PLACEHOLDER) { // This is '_T' for FTPT
        yearlyData[year].total = value; // This is the explicit total for FT+PT
      }
    });
    console.log(`[RatioChart] Aggregated yearly data for ${countryName}:`, yearlyData);

    const values: EmploymentRatioPoint[] = Object.entries(yearlyData)
      .map(([yearStr, data]) => {
        const year = parseInt(yearStr, 10);
        
        const explicitTotal = data.total;
        const calculatedSum = data.fullTime + data.partTime;
        
        let effectiveTotal = 0;
        if (explicitTotal > 0) {
            effectiveTotal = explicitTotal;
        } else if (calculatedSum > 0) {
            effectiveTotal = calculatedSum;
        }
        
        // Calculate ratio: FT / PT. Handle PT = 0 to avoid division by zero.
        const ratio = data.partTime > 0 ? data.fullTime / data.partTime : (data.fullTime > 0 ? Infinity : null);

        return {
          year,
          fullTimePercentage: effectiveTotal > 0 ? (data.fullTime / effectiveTotal) * 100 : 0,
          partTimePercentage: effectiveTotal > 0 ? (data.partTime / effectiveTotal) * 100 : 0,
          fullTimeCount: data.fullTime, // Added for tooltip
          partTimeCount: data.partTime, // Added for tooltip
          ratio: ratio, // Added for the chart
        };
      })
      .filter(point => point.ratio !== null && isFinite(point.ratio ?? 0) && (point.fullTimePercentage > 0 || point.partTimePercentage > 0) && (point.fullTimePercentage <= 100 && point.partTimePercentage <=100)) 
      .sort((a, b) => a.year - b.year);

    if (values.length === 0) {
      console.warn(`[RatioChart] No valid ratio data points found for ${countryName} (${countryCode}).`);
      return {
        countryCode,
        countryName,
        values: [], // Return empty array for values
      };
    }
    console.log(`[RatioChart] Processed employment ratio trend for ${countryName}:`, values);

    return {
      countryCode,
      countryName,
      values,
    };

  } catch (error) {
    console.error(`[RatioChart] Error loading employment ratio trend data for ${countryCode}:`, error);
    return null;
  }
};
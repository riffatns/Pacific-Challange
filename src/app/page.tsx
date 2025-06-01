// src/app/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';

// Komponen Umum
import PageTitle from '../components/common/PageTitle';
import Description from '../components/common/Description';
import ChartCard from '../components/common/ChartCard';
import DataSourceNote from '../components/common/DataSourceNote';
import Footer from '../components/common/Footer';

// Komponen UI dari Shadcn
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Komponen Visualisasi
import EmploymentCountryComparisonBar from '../dataviz/EmploymentCountryComparisonBar';
import EmploymentTrendLineChart from '../dataviz/EmploymentTrendLineChart';
import AgeCompositionBarChart from '../dataviz/AgeCompositionBarChart';
import GenderDisparityLineChart from '../dataviz/GenderDisparityLineChart'; // Baru
import EmploymentRatioTrendChart from '../dataviz/EmploymentRatioTrendChart'; // Baru

// Tipe dan Pemuat Data
import {
    loadEmploymentData,
    loadEmploymentTimeSeriesData,
    loadAgeSpecificEmploymentData,
    loadGenderEmploymentData, // Baru
    loadEmploymentRatioTrendData, // Baru
} from '../lib/data-loader';
import {
    EmploymentDataPoint,
    CountryTimeSeriesData,
    CountryAgeSpecificEmploymentData,
    CountryOption,
    CountryGenderEmploymentData, // Baru
    CountryEmploymentRatioTrend, // Baru
} from '../lib/types';

// Hook untuk dimensi
const useResizeObserver = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [dimensions, setDimensions] = useState<{width: number; height: number}>({width: 0, height: 0});

  const updateDimensions = useCallback(() => {
    if (ref.current) {
      if(ref.current.offsetWidth !== dimensions.width || ref.current.offsetHeight !== dimensions.height){
        setDimensions({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.width, dimensions.height, ref.current]); // ref.current should not be a dependency here, but it works


  useEffect(() => {
    const observeTarget = ref.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(updateDimensions);
    });
    
    updateDimensions(); // Initial call

    resizeObserver.observe(observeTarget);
    return () => {
      if (observeTarget) {
        resizeObserver.unobserve(observeTarget);
      }
    };
  }, [updateDimensions]);

  return { ref, dimensions };
};

const BAR_CHART_MARGIN = { top: 30, right: 30, bottom: 100, left: 150 };

export default function HomePage() {
  const [employmentDataBar, setEmploymentDataBar] = useState<EmploymentDataPoint[]>([]);
  const [employmentDataLine, setEmploymentDataLine] = useState<CountryTimeSeriesData[]>([]);
  const [ageCompositionData, setAgeCompositionData] = useState<CountryAgeSpecificEmploymentData | null>(null);
  const [genderDisparityData, setGenderDisparityData] = useState<CountryGenderEmploymentData | null>(null); // Baru
  const [employmentRatioData, setEmploymentRatioData] = useState<CountryEmploymentRatioTrend | null>(null); // Baru
  
  const [loadingBar, setLoadingBar] = useState(true);
  const [loadingLine, setLoadingLine] = useState(true);
  const [loadingAgeComposition, setLoadingAgeComposition] = useState(false);
  const [loadingGenderDisparity, setLoadingGenderDisparity] = useState(false); // Baru
  const [loadingEmploymentRatio, setLoadingEmploymentRatio] = useState(false); // Baru

  const [error, setError] = useState<string | null>(null);
  const [errorAgeComposition, setErrorAgeComposition] = useState<string | null>(null);
  const [errorGenderDisparity, setErrorGenderDisparity] = useState<string | null>(null); // Baru
  const [errorEmploymentRatio, setErrorEmploymentRatio] = useState<string | null>(null); // Baru

  const { ref: chart1ContainerRef, dimensions: chart1Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart2ContainerRef, dimensions: chart2Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart3ContainerRef, dimensions: chart3Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart4ContainerRef, dimensions: chart4Dimensions } = useResizeObserver<HTMLDivElement>(); // Baru
  const { ref: chart5ContainerRef, dimensions: chart5Dimensions } = useResizeObserver<HTMLDivElement>(); // Baru

  const [selectedCountriesForLine, setSelectedCountriesForLine] = useState<string[]>([]); 
  const [allCountryCodesForFilter, setAllCountryCodesForFilter] = useState<CountryOption[]>([]);
  const [selectedCountryForAgeChart, setSelectedCountryForAgeChart] = useState<string | undefined>(undefined);
  const [selectedCountryForGenderChart, setSelectedCountryForGenderChart] = useState<string | undefined>(undefined); // Baru
  const [selectedCountryForRatioChart, setSelectedCountryForRatioChart] = useState<string | undefined>(undefined); // Baru

  useEffect(() => {
    const fetchData = async () => {
      setLoadingBar(true);
      setLoadingLine(true);
      setError(null);
      try {
        const [barDataResult, lineDataResult] = await Promise.allSettled([
          loadEmploymentData(),
          loadEmploymentTimeSeriesData()
        ]);

        let aggregatedError = "";

        if (barDataResult.status === 'fulfilled' && barDataResult.value) {
          setEmploymentDataBar(barDataResult.value);
        } else {
          const reason = barDataResult.status === 'rejected' ? (barDataResult.reason instanceof Error ? barDataResult.reason.message : String(barDataResult.reason)) : 'Data kosong atau tidak valid';
          console.warn(`Gagal memuat data bar chart: ${reason}`);
          setEmploymentDataBar([]);
          if (barDataResult.status === 'rejected') {
            aggregatedError += `Error Bar Chart: ${reason}\\n`;
          }
        }

        if (lineDataResult.status === 'fulfilled' && lineDataResult.value) {
          setEmploymentDataLine(lineDataResult.value);
          const countryFilters = lineDataResult.value
            .map((c: CountryTimeSeriesData) => ({ code: c.countryCode, name: c.countryName }))
            .sort((a,b)=> a.name.localeCompare(b.name));
          setAllCountryCodesForFilter(countryFilters);
          
          if (countryFilters.length > 0) {
            const defaultSelectedCountries = countryFilters.slice(0, Math.min(3, countryFilters.length)).map(cf => cf.code);
            setSelectedCountriesForLine(defaultSelectedCountries);
            
            // Set default selected country for new charts if not already set
            if (selectedCountryForAgeChart === undefined) {
              setSelectedCountryForAgeChart(countryFilters[0].code);
            }
            if (selectedCountryForGenderChart === undefined) { 
              setSelectedCountryForGenderChart(countryFilters[0].code);
            }
            if (selectedCountryForRatioChart === undefined) { 
              setSelectedCountryForRatioChart(countryFilters[0].code);
            }
          }
        } else {
         const reason = lineDataResult.status === 'rejected' ? (lineDataResult.reason instanceof Error ? lineDataResult.reason.message : String(lineDataResult.reason)) : 'Data kosong atau tidak valid';
          console.warn(`Gagal memuat data line chart: ${reason}`);
          setEmploymentDataLine([]);
          if (lineDataResult.status === 'rejected') {
            aggregatedError += `Error Line Chart: ${reason}\\n`;
          }
        }

        if (aggregatedError) {
            setError(aggregatedError.trim());
        }

      } catch (err) { 
        console.error("Error global saat fetching data:", err);
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setError(`Gagal memuat data: ${errorMessage}.`);
        setEmploymentDataBar([]);
        setEmploymentDataLine([]);
      } finally {
        setLoadingBar(false);
        setLoadingLine(false);
      }
    };
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial data load, selected countries for new charts are set here

  useEffect(() => {
    if (!selectedCountryForAgeChart) {
      setAgeCompositionData(null);
      return;
    }
    const fetchAgeData = async () => {
      setLoadingAgeComposition(true);
      setErrorAgeComposition(null);
      try {
        const data = await loadAgeSpecificEmploymentData(selectedCountryForAgeChart);
        if (data) {
          setAgeCompositionData(data);
        } else {
          setAgeCompositionData(null);
          setErrorAgeComposition(`Tidak ada data komposisi usia untuk ${allCountryCodesForFilter.find((c: CountryOption) => c.code === selectedCountryForAgeChart)?.name || selectedCountryForAgeChart}.`);
        }
      } catch (err) {
        console.error("Error fetching age composition data:", err);
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setErrorAgeComposition(`Gagal memuat data komposisi usia: ${errorMessage}`);
        setAgeCompositionData(null);
      } finally {
        setLoadingAgeComposition(false);
      }
    };
    fetchAgeData();
  }, [selectedCountryForAgeChart, allCountryCodesForFilter]);

  // useEffect untuk memuat data GenderDisparityChart (Baru)
  useEffect(() => {
    if (!selectedCountryForGenderChart) {
      setGenderDisparityData(null);
      return;
    }
    const fetchGenderData = async () => {
      setLoadingGenderDisparity(true);
      setErrorGenderDisparity(null);
      try {
        const data = await loadGenderEmploymentData(selectedCountryForGenderChart, '_T'); 
        if (data) {
          setGenderDisparityData(data);
        } else {
          setGenderDisparityData(null);
          setErrorGenderDisparity(`Tidak ada data disparitas gender untuk ${allCountryCodesForFilter.find((c: CountryOption) => c.code === selectedCountryForGenderChart)?.name || selectedCountryForGenderChart}.`);
        }
      } catch (err) {
        console.error("Error fetching gender disparity data:", err);
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setErrorGenderDisparity(`Gagal memuat data disparitas gender: ${errorMessage}`);
        setGenderDisparityData(null);
      } finally {
        setLoadingGenderDisparity(false);
      }
    };
    fetchGenderData();
  }, [selectedCountryForGenderChart, allCountryCodesForFilter]);

  // useEffect untuk memuat data EmploymentRatioChart (Baru)
  useEffect(() => {
    if (!selectedCountryForRatioChart) {
      setEmploymentRatioData(null);
      return;
    }
    const fetchRatioData = async () => {
      setLoadingEmploymentRatio(true);
      setErrorEmploymentRatio(null);
      try {
        const data = await loadEmploymentRatioTrendData(selectedCountryForRatioChart);
        if (data) {
          setEmploymentRatioData(data);
        } else {
          setEmploymentRatioData(null);
          setErrorEmploymentRatio(`Tidak ada data rasio pekerjaan untuk ${allCountryCodesForFilter.find((c: CountryOption) => c.code === selectedCountryForRatioChart)?.name || selectedCountryForRatioChart}.`);
        }
      } catch (err) {
        console.error("Error fetching employment ratio data:", err);
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setErrorEmploymentRatio(`Gagal memuat data rasio pekerjaan: ${errorMessage}`);
        setEmploymentRatioData(null);
      } finally {
        setLoadingEmploymentRatio(false);
      }
    };
    fetchRatioData();
  }, [selectedCountryForRatioChart, allCountryCodesForFilter]);

  const barChartHeight = employmentDataBar.length > 0 
    ? Math.max(400, employmentDataBar.length * 38 + BAR_CHART_MARGIN.top + BAR_CHART_MARGIN.bottom)
    : 400;

  const handleCountrySelectionChange = (countryCode: string) => {
    setSelectedCountriesForLine(prev => 
      prev.includes(countryCode) 
        ? prev.filter(code => code !== countryCode)
        : [...prev, countryCode]
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageTitle 
        title="Analisis Ketenagakerjaan di Kepulauan Pasifik"
        subtitle="Visualisasi Tren dan Komposisi Tenaga Kerja Regional"
      />
      <Description className="max-w-3xl mx-auto text-center">
        Selamat datang di dasbor analisis ketenagakerjaan untuk negara-negara dan wilayah Kepulauan Pasifik.
        Proyek ini bertujuan untuk menyajikan data ketenagakerjaan dari Pacific Community (SPC)
        dalam format visual yang informatif dan menarik.
      </Description>
      <Separator className="my-8" />

      {error && (
        <div className="my-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded-md whitespace-pre-line">
          <p className="font-semibold">Informasi Tambahan:</p>
          {error}
        </div>
      )}

      {/* Visualisasi Pertama: Bar Chart Komposisi */}
      <ChartCard
        title="Komposisi Pekerjaan per Negara/Wilayah (Tahun Terbaru)"
        description="Perbandingan jumlah pekerja penuh waktu dan paruh waktu. Arahkan kursor untuk detail."
        contentClassName={`min-h-[${barChartHeight}px]`}
      >
        {loadingBar && <Skeleton className="w-full h-[400px]" />}
        {!loadingBar && employmentDataBar.length > 0 && (
          <div ref={chart1ContainerRef} className="w-full" style={{height: `${barChartHeight}px`}}>
            {chart1Dimensions.width > 0 && chart1Dimensions.height > 0 && (
                 <EmploymentCountryComparisonBar 
                    data={employmentDataBar} 
                    width={chart1Dimensions.width} 
                    height={chart1Dimensions.height}
                 />
            )}
          </div>
        )}
        {!loadingBar && employmentDataBar.length === 0 && (
          <p className="text-center py-10 text-gray-500">
            {error && error.includes("Bar Chart") ? "Gagal memuat data komposisi." : "Tidak ada data komposisi untuk ditampilkan."}
          </p>
        )}
      </ChartCard>

      <Separator className="my-12" />

      {/* Visualisasi Kedua: Line Chart Tren */}
      <ChartCard
        title="Tren Total Ketenagakerjaan dari Waktu ke Waktu"
        description="Menampilkan perubahan jumlah total pekerja dari tahun ke tahun per negara. Pilih negara untuk difokuskan (maksimal 10 untuk performa optimal legenda)."
        contentClassName="min-h-[550px]"
      >
        {!loadingLine && allCountryCodesForFilter.length > 0 && (
          <div className="mb-4 p-3 border rounded-md">
            <p className="text-sm font-medium mb-2">Filter Negara:</p>
            <ScrollArea className="h-28">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs pr-3">
                {allCountryCodesForFilter.map((country: CountryOption) => (
                  <div key={country.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`check-line-${country.code}`}
                      checked={selectedCountriesForLine.includes(country.code)}
                      onCheckedChange={() => handleCountrySelectionChange(country.code)}
                    />
                    <label htmlFor={`check-line-${country.code}`} className="cursor-pointer select-none text-gray-700">
                      {country.name}
                    </label>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
             <Button 
                variant="outline"
                size="sm"
                onClick={() => setSelectedCountriesForLine([])} 
                className="mt-3 text-xs"
                disabled={selectedCountriesForLine.length === 0}
              >
                Reset Pilihan
              </Button>
          </div>
        )}

        {loadingLine && <Skeleton className="w-full h-[450px]" />}
        {!loadingLine && employmentDataLine.length > 0 && (
          <div ref={chart2ContainerRef} className="w-full h-[450px]">
            {chart2Dimensions.width > 0 && chart2Dimensions.height > 0 && (
                 <EmploymentTrendLineChart
                    data={employmentDataLine} 
                    width={chart2Dimensions.width} 
                    height={chart2Dimensions.height}
                    selectedCountryCodes={selectedCountriesForLine}
                 />
            )}
          </div>
        )}
        {!loadingLine && employmentDataLine.length === 0 && (
           <p className="text-center py-10 text-gray-500">
            {error && error.includes("Line Chart") ? "Gagal memuat data tren." : "Tidak ada data tren untuk ditampilkan."}
          </p>
        )}
      </ChartCard>

      <Separator className="my-12" />

      {/* Visualisasi Ketiga: Age Composition Bar Chart */}
      <ChartCard
        title="Komposisi Ketenagakerjaan Berdasarkan Kelompok Usia"
        description="Menampilkan perbandingan jumlah pekerja penuh waktu dan paruh waktu di berbagai kelompok usia untuk negara terpilih (data tahun terbaru yang tersedia)."
        contentClassName="min-h-[500px]"
      >
        {allCountryCodesForFilter.length > 0 && (
          <div className="mb-4 p-3 border rounded-md">
            <label htmlFor="country-select-age" className="text-sm font-medium mb-1 block">Pilih Negara:</label>
            <Select 
              value={selectedCountryForAgeChart}
              onValueChange={(value: string) => setSelectedCountryForAgeChart(value)}
            >
              <SelectTrigger id="country-select-age" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Pilih sebuah negara" />
              </SelectTrigger>
              <SelectContent>
                {allCountryCodesForFilter.map((country: CountryOption) => (
                  <SelectItem key={`age-${country.code}`} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loadingAgeComposition && <Skeleton className="w-full h-[400px]" />}
        {!loadingAgeComposition && errorAgeComposition && (
          <p className="text-center py-10 text-red-500 whitespace-pre-line">
            {errorAgeComposition}
          </p>
        )}
        {!loadingAgeComposition && !errorAgeComposition && !ageCompositionData && selectedCountryForAgeChart && (
            <p className="text-center py-10 text-gray-500">
                Tidak ada data komposisi usia tersedia untuk negara yang dipilih.
            </p>
        )}
        {!loadingAgeComposition && !errorAgeComposition && !ageCompositionData && !selectedCountryForAgeChart && (
            <p className="text-center py-10 text-gray-500">
                Silakan pilih negara untuk melihat data komposisi usia.
            </p>
        )}
        {!loadingAgeComposition && !errorAgeComposition && ageCompositionData && (
          <div ref={chart3ContainerRef} className="w-full h-[450px]">
            {chart3Dimensions.width > 0 && chart3Dimensions.height > 0 && (
                 <AgeCompositionBarChart
                    data={ageCompositionData} 
                    width={chart3Dimensions.width} 
                    height={chart3Dimensions.height}
                 />
            )}
          </div>
        )}
      </ChartCard>

      <Separator className="my-12" />

      {/* Visualisasi Keempat: Gender Disparity Line Chart (BARU) */}
      <ChartCard
        title="Disparitas Ketenagakerjaan Berdasarkan Gender (Total Pekerja)"
        description="Tren perbandingan jumlah pekerja laki-laki dan perempuan (total, bukan per status pekerjaan) dari waktu ke waktu untuk negara terpilih."
        contentClassName="min-h-[500px]"
      >
        {allCountryCodesForFilter.length > 0 && (
          <div className="mb-4 p-3 border rounded-md">
            <label htmlFor="country-select-gender" className="text-sm font-medium mb-1 block">Pilih Negara:</label>
            <Select 
              value={selectedCountryForGenderChart}
              onValueChange={(value: string) => setSelectedCountryForGenderChart(value)}
            >
              <SelectTrigger id="country-select-gender" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Pilih sebuah negara" />
              </SelectTrigger>
              <SelectContent>
                {allCountryCodesForFilter.map((country: CountryOption) => (
                  <SelectItem key={`gender-${country.code}`} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loadingGenderDisparity && <Skeleton className="w-full h-[400px]" />}
        {!loadingGenderDisparity && errorGenderDisparity && (
          <p className="text-center py-10 text-red-500 whitespace-pre-line">
            {errorGenderDisparity}
          </p>
        )}
        {!loadingGenderDisparity && !errorGenderDisparity && !genderDisparityData && selectedCountryForGenderChart && (
            <p className="text-center py-10 text-gray-500">
                Tidak ada data disparitas gender tersedia untuk negara yang dipilih.
            </p>
        )}
        {!loadingGenderDisparity && !errorGenderDisparity && !genderDisparityData && !selectedCountryForGenderChart && (
            <p className="text-center py-10 text-gray-500">
                Silakan pilih negara untuk melihat data disparitas gender.
            </p>
        )}
        {!loadingGenderDisparity && !errorGenderDisparity && genderDisparityData && (
          <div ref={chart4ContainerRef} className="w-full h-[450px]">
            {chart4Dimensions.width > 0 && chart4Dimensions.height > 0 && (
                 <GenderDisparityLineChart
                    data={genderDisparityData} 
                    width={chart4Dimensions.width} 
                    height={chart4Dimensions.height}
                 />
            )}
          </div>
        )}
      </ChartCard>

      <Separator className="my-12" />

      {/* Visualisasi Kelima: Employment Ratio Trend Chart (BARU) */}
      <ChartCard
        title="Tren Rasio Pekerja Penuh Waktu vs. Paruh Waktu"
        description="Menampilkan perubahan rasio pekerja penuh waktu terhadap paruh waktu dari tahun ke tahun untuk negara terpilih."
        contentClassName="min-h-[500px]"
      >
        {allCountryCodesForFilter.length > 0 && (
          <div className="mb-4 p-3 border rounded-md">
            <label htmlFor="country-select-ratio" className="text-sm font-medium mb-1 block">Pilih Negara:</label>
            <Select 
              value={selectedCountryForRatioChart}
              onValueChange={(value: string) => setSelectedCountryForRatioChart(value)}
            >
              <SelectTrigger id="country-select-ratio" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Pilih sebuah negara" />
              </SelectTrigger>
              <SelectContent>
                {allCountryCodesForFilter.map((country: CountryOption) => (
                  <SelectItem key={`ratio-${country.code}`} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loadingEmploymentRatio && <Skeleton className="w-full h-[400px]" />}
        {!loadingEmploymentRatio && errorEmploymentRatio && (
          <p className="text-center py-10 text-red-500 whitespace-pre-line">
            {errorEmploymentRatio}
          </p>
        )}
        {!loadingEmploymentRatio && !errorEmploymentRatio && !employmentRatioData && selectedCountryForRatioChart && (
            <p className="text-center py-10 text-gray-500">
                Tidak ada data rasio pekerjaan tersedia untuk negara yang dipilih.
            </p>
        )}
        {!loadingEmploymentRatio && !errorEmploymentRatio && !employmentRatioData && !selectedCountryForRatioChart && (
            <p className="text-center py-10 text-gray-500">
                Silakan pilih negara untuk melihat data rasio pekerjaan.
            </p>
        )}
        {!loadingEmploymentRatio && !errorEmploymentRatio && employmentRatioData && (
          <div ref={chart5ContainerRef} className="w-full h-[450px]">
            {chart5Dimensions.width > 0 && chart5Dimensions.height > 0 && (
                 <EmploymentRatioTrendChart
                    data={employmentRatioData} 
                    width={chart5Dimensions.width} 
                    height={chart5Dimensions.height}
                 />
            )}
          </div>
        )}
      </ChartCard>

      <Separator className="my-12" />

      <DataSourceNote 
        sourceName="Pacific Data Hub (PDH.STAT) oleh Pacific Community (SPC)"
        sourceLink="https://stats.pacificdata.org/"
        notes={`Dataset yang digunakan: DF_EMPLOYED_FTPT (Employed population by sex, age, status in employment, and occupation). Data diakses dan divisualisasikan pada ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}.`}
        className="mt-16"
      />
      <Footer />
    </div>
  );
}
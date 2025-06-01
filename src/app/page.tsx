// src/app/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';

// Komponen Umum
import PageTitle from '../components/common/PageTitle';
import Description from '../components/common/Description';
import ChartCard from '../components/common/ChartCard';
import DataSourceNote from '../components/common/DataSourceNote';
import Footer from '../components/common/Footer'; // F kapital

// Komponen UI dari Shadcn
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Komponen Visualisasi
import EmploymentCountryComparisonBar from '../dataviz/EmploymentCountryComparisonBar'; // Path ke dataviz
import EmploymentTrendLineChart from '../dataviz/EmploymentTrendLineChart';       // Path ke dataviz

// Tipe dan Pemuat Data
import {
    loadEmploymentData,
    loadEmploymentTimeSeriesData
} from '../lib/data-loader';
import {
    EmploymentDataPoint,
    CountryTimeSeriesData
} from '../lib/types';

// Hook untuk dimensi (bisa dipindah ke src/hooks/useResizeObserver.ts)
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
  }, [dimensions.width, dimensions.height, ref.current]);


  useEffect(() => {
    const observeTarget = ref.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(updateDimensions);
    });
    
    updateDimensions();

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
  
  const [loadingBar, setLoadingBar] = useState(true);
  const [loadingLine, setLoadingLine] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { ref: chart1ContainerRef, dimensions: chart1Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart2ContainerRef, dimensions: chart2Dimensions } = useResizeObserver<HTMLDivElement>();

  const [selectedCountriesForLine, setSelectedCountriesForLine] = useState<string[]>([]); 
  const [allCountryCodesForFilter, setAllCountryCodesForFilter] = useState<Array<{code: string; name: string}>>([]);

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
          if (barDataResult.status === 'rejected') { // Hanya tambahkan ke error jika benar-benar gagal
            aggregatedError += `Error Bar Chart: ${reason}\n`;
          }
        }

        if (lineDataResult.status === 'fulfilled' && lineDataResult.value) {
          setEmploymentDataLine(lineDataResult.value);
          const countryFilters = lineDataResult.value
            .map(c => ({ code: c.countryCode, name: c.countryName }))
            .sort((a,b)=> a.name.localeCompare(b.name));
          setAllCountryCodesForFilter(countryFilters);
          // Tambahkan ini: Inisialisasi negara yang dipilih untuk line chart
          if (countryFilters.length > 0) {
            // Ambil beberapa negara pertama sebagai default, misalnya maksimal 3
            const defaultSelectedCountries = countryFilters.slice(0, 3).map(cf => cf.code);
            setSelectedCountriesForLine(defaultSelectedCountries);
          }
        } else {
          const reason = lineDataResult.status === 'rejected' ? (lineDataResult.reason instanceof Error ? lineDataResult.reason.message : String(lineDataResult.reason)) : 'Data kosong atau tidak valid';
          console.warn(`Gagal memuat data line chart: ${reason}`);
          setEmploymentDataLine([]);
          if (lineDataResult.status === 'rejected') { // Hanya tambahkan ke error jika benar-benar gagal
            aggregatedError += `Error Line Chart: ${reason}\n`;
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
  }, []);

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
                {allCountryCodesForFilter.map(country => (
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
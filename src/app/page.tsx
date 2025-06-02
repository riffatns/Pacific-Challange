// src/app/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';

// Komponen Umum
// ... (import lainnya tetap sama)
import PageTitle from '../components/common/PageTitle';
import Description from '../components/common/Description';
import DataSourceNote from '../components/common/DataSourceNote';
import Footer from '../components/common/Footer';


// Komponen UI dari Shadcn
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
// Checkbox tidak lagi digunakan untuk filter negara utama
// import { Checkbox } from "@/components/ui/checkbox"; 
import { Button } from "@/components/ui/button";
// ScrollArea mungkin masih berguna jika daftar pill sangat panjang, tapi kita coba tanpa dulu
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// Select tidak lagi digunakan untuk filter negara utama
/*
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
*/

// Komponen Visualisasi
// ... (import lainnya tetap sama)
import EmploymentCountryComparisonBar from '../dataviz/EmploymentCountryComparisonBar';
import EmploymentTrendLineChart from '../dataviz/EmploymentTrendLineChart';
import AgeCompositionBarChart from '../dataviz/AgeCompositionBarChart';
import GenderDisparityLineChart from '../dataviz/GenderDisparityLineChart'; 
import EmploymentRatioTrendChart from '../dataviz/EmploymentRatioTrendChart'; 
import { BubbleMap } from '../dataviz/bubbleMap/BubbleMap';
import { FeatureCollection } from 'geojson';
import type { BubbleMapItem, Island } from '@/lib/types';

// Tipe dan Pemuat Data
import {
    loadEmploymentData,
    loadEmploymentTimeSeriesData,
    loadAgeSpecificEmploymentData,
    loadGenderEmploymentData, 
    loadEmploymentRatioTrendData, 
    EmploymentDataPoint,
    CountryTimeSeriesData,
    CountryAgeSpecificEmploymentData,
    CountryOption,
    CountryGenderEmploymentData,
    CountryEmploymentRatioTrend,
} from '../lib/data-loader'; 

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
  const [ageCompositionData, setAgeCompositionData] = useState<CountryAgeSpecificEmploymentData | null>(null);
  const [genderDisparityData, setGenderDisparityData] = useState<CountryGenderEmploymentData | null>(null);
  const [employmentRatioData, setEmploymentRatioData] = useState<CountryEmploymentRatioTrend | null>(null);
  
  const [loadingBar, setLoadingBar] = useState(true);
  const [loadingLine, setLoadingLine] = useState(true);
  const [loadingAgeComposition, setLoadingAgeComposition] = useState(true); // Default true
  const [loadingGenderDisparity, setLoadingGenderDisparity] = useState(true); // Default true
  const [loadingEmploymentRatio, setLoadingEmploymentRatio] = useState(true); // Default true

  const [error, setError] = useState<string | null>(null);
  const [errorAgeComposition, setErrorAgeComposition] = useState<string | null>(null);
  const [errorGenderDisparity, setErrorGenderDisparity] = useState<string | null>(null);
  const [errorEmploymentRatio, setErrorEmploymentRatio] = useState<string | null>(null);

  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [bubbleMapItems, setBubbleMapItems] = useState<BubbleMapItem[]>([]);
  const [loadingGeoJson, setLoadingGeoJson] = useState(true);
  const [selectedIsland, setSelectedIsland] = useState<Island | undefined>(undefined);
  
  const { ref: chart1ContainerRef, dimensions: chart1Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart2ContainerRef, dimensions: chart2Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart3ContainerRef, dimensions: chart3Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart4ContainerRef, dimensions: chart4Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart5ContainerRef, dimensions: chart5Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: mapContainerRef, dimensions: mapDimensions } = useResizeObserver<HTMLDivElement>();

  const [allCountryCodesForFilter, setAllCountryCodesForFilter] = useState<CountryOption[]>([]);
    // State untuk pill filters
  const [activeCountryPill, setActiveCountryPill] = useState<string | undefined>(undefined);
  const [trendChartCountryPill, setTrendChartCountryPill] = useState<string | undefined>(undefined);
  const [selectedCountriesForLine, setSelectedCountriesForLine] = useState<string[]>([]);


  useEffect(() => {
    const fetchGeoJson = async () => {
      setLoadingGeoJson(true);
      try {
        const response = await fetch('/world-pacific.geojson'); 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();
        setGeoJsonData(jsonData as FeatureCollection);
      } catch (error) {
        console.error("Gagal memuat data GeoJSON:", error);
        setGeoJsonData(null); 
      } finally {
        setLoadingGeoJson(false);
      }
    };
    fetchGeoJson();
  }, []);

  useEffect(() => {
    if (employmentDataBar.length > 0 && geoJsonData) {
      const countryCoordinatesMap = new Map<string, [number, number]>();
      geoJsonData.features.forEach(feature => {
        if (feature.properties && feature.properties.name && feature.geometry && feature.geometry.type === 'Point') {
          const geom = feature.geometry as GeoJSON.Point;
          countryCoordinatesMap.set(feature.properties.name, geom.coordinates as [number, number]);
        }
      });

      const processedBubbleData = employmentDataBar.map(item => {
        const coordinates = countryCoordinatesMap.get(item.countryName);
        return {
          id: item.countryName,
          name: item.countryName,
          value: item.totalEmployed,
          coordinates: coordinates || [0, 0], 
        };
      }).filter(item => item.coordinates[0] !== 0 || item.coordinates[1] !== 0); 

      setBubbleMapItems(processedBubbleData as BubbleMapItem[]);
    }
  }, [employmentDataBar, geoJsonData]);

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
          aggregatedError += `Error Bar Chart: ${reason}\\n`;
        }

        if (lineDataResult.status === 'fulfilled' && lineDataResult.value) {
          const lineData = lineDataResult.value;
          setEmploymentDataLine(lineData);
          const countryFilters = lineData
            .map((c: CountryTimeSeriesData) => ({ code: c.countryCode, name: c.countryName }))
            .sort((a,b)=> a.name.localeCompare(b.name));
          setAllCountryCodesForFilter(countryFilters);
            if (countryFilters.length > 0) {
            // Set Tonga as default for charts 3-5
            const tonga = countryFilters.find(c => c.name.toLowerCase().includes("tonga"));
            const defaultCountryCode = tonga ? tonga.code : countryFilters[0].code;
            setActiveCountryPill(defaultCountryCode);
            // Set All Countries as default for chart 2
            setTrendChartCountryPill('all');
          }
        } else {
         const reason = lineDataResult.status === 'rejected' ? (lineDataResult.reason instanceof Error ? lineDataResult.reason.message : String(lineDataResult.reason)) : 'Data kosong atau tidak valid';
          aggregatedError += `Error Line Chart: ${reason}\\n`;
        }

        if (aggregatedError) {
            setError(aggregatedError.trim());
        }

      } catch (err) { 
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setError(`Gagal memuat data: ${errorMessage}.`);
      } finally {
        setLoadingBar(false);
        setLoadingLine(false);
      }
    };
    fetchData();
  }, []);  // Update selectedCountriesForLine ketika trendChartCountryPill berubah
  useEffect(() => {
    if (trendChartCountryPill === 'all') {
      setSelectedCountriesForLine(allCountryCodesForFilter.map(c => c.code));
    } else if (trendChartCountryPill) {
      setSelectedCountriesForLine([trendChartCountryPill]);
    } else {
      setSelectedCountriesForLine([]);
    }
  }, [trendChartCountryPill, allCountryCodesForFilter]);


  useEffect(() => {
    if (!activeCountryPill) {
      setAgeCompositionData(null);
      setLoadingAgeComposition(false); // Pastikan loading berhenti jika tidak ada negara terpilih
      return;
    }
    const fetchAgeData = async () => {
      setLoadingAgeComposition(true);
      setErrorAgeComposition(null);
      try {
        const data = await loadAgeSpecificEmploymentData(activeCountryPill);
        if (data) {
          setAgeCompositionData(data);
        } else {
          setAgeCompositionData(null);
          setErrorAgeComposition(`Tidak ada data komposisi usia untuk ${allCountryCodesForFilter.find((c: CountryOption) => c.code === activeCountryPill)?.name || activeCountryPill}.`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setErrorAgeComposition(`Gagal memuat data komposisi usia: ${errorMessage}`);
        setAgeCompositionData(null);
      } finally {
        setLoadingAgeComposition(false);
      }
    };
    fetchAgeData();
  }, [activeCountryPill, allCountryCodesForFilter]);

  useEffect(() => {
    if (!activeCountryPill) {
      setGenderDisparityData(null);
      setLoadingGenderDisparity(false);
      return;
    }
    const fetchGenderData = async () => {
      setLoadingGenderDisparity(true);
      setErrorGenderDisparity(null);
      try {
        // Asumsi '_T' adalah untuk total employment, sesuaikan jika berbeda
        const data = await loadGenderEmploymentData(activeCountryPill, '_T'); 
        if (data) {
          setGenderDisparityData(data);
        } else {
          setGenderDisparityData(null);
          setErrorGenderDisparity(`Tidak ada data disparitas gender untuk ${allCountryCodesForFilter.find((c: CountryOption) => c.code === activeCountryPill)?.name || activeCountryPill}.`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
        setErrorGenderDisparity(`Gagal memuat data disparitas gender: ${errorMessage}`);
        setGenderDisparityData(null);
      } finally {
        setLoadingGenderDisparity(false);
      }
    };
    fetchGenderData();
  }, [activeCountryPill, allCountryCodesForFilter]);

  useEffect(() => {
    if (!activeCountryPill) {
      setEmploymentRatioData(null);
      setLoadingEmploymentRatio(false);
      return;
    }
    const fetchRatioData = async () => {
      setLoadingEmploymentRatio(true);
      setErrorEmploymentRatio(null);
      try {
        const data = await loadEmploymentRatioTrendData(activeCountryPill);
        if (data) {
          setEmploymentRatioData(data);
        } else {
          setEmploymentRatioData(null);
          const countryName = allCountryCodesForFilter.find((c: CountryOption) => 
            c.code === activeCountryPill
          )?.name || activeCountryPill;
          setErrorEmploymentRatio(`No employment ratio data for ${countryName}.`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred.";
        setErrorEmploymentRatio(`Failed to load employment ratio data: ${errorMessage}`);
        setEmploymentRatioData(null);
      } finally {
        setLoadingEmploymentRatio(false);
      }
    };
    fetchRatioData();
  }, [activeCountryPill, allCountryCodesForFilter]);

  const barChartHeight = employmentDataBar.length > 0 
    ? Math.max(400, employmentDataBar.length * 38 + BAR_CHART_MARGIN.top + BAR_CHART_MARGIN.bottom)
    : 400;

  // Handler untuk klik pill
  const handlePillClick = (countryCode: string) => {
    setActiveCountryPill(countryCode);
    // Juga set selectedIsland untuk BubbleMap agar sinkron jika diinginkan
    const countryForBubbleMap = allCountryCodesForFilter.find(c => c.code === countryCode);
    if (countryForBubbleMap) {
      setSelectedIsland(countryForBubbleMap.name as Island); // Cast ke Island jika perlu
    }
  };
  
  // Update activeCountryPill ketika selectedIsland di BubbleMap berubah
  useEffect(() => {
    if (selectedIsland) {
      const country = allCountryCodesForFilter.find(c => c.name === selectedIsland);
      if (country && country.code !== activeCountryPill) {
        setActiveCountryPill(country.code);
      }
    }
  }, [selectedIsland, allCountryCodesForFilter, activeCountryPill]);


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-[1200px]">
      <div className="mb-8 pt-8 md:pt-12 lg:pt-16">
      <div className="space-y-4">
        <p className="text-sm uppercase text-gray-500 tracking-wider font-medium">REGIONAL EMPLOYMENT ANALYSIS</p>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900">Employment<br />in the Pacific</h1>
      </div>
      
      <div className="text-lg md:text-xl max-w-3xl mt-8">
        <p className="mb-4 leading-relaxed text-slate-800">
        Employment patterns in the Pacific Islands region show interesting variations, with significant differences in 
        <span className="font-semibold text-slate-900"> worker composition</span>, 
        <span className="font-semibold text-slate-900"> gender disparities</span>, and 
        <span className="font-semibold text-slate-900"> age distribution</span> of the workforce. 
        The following visualizations explore these trends based on the latest data from the Pacific Data Hub.
        </p>
      </div>
      </div>      <p className="text-center text-sm text-gray-500 italic mb-6">A project by <a href="https://github.com/riffatns/Pacific-Challange" target="_blank" rel="noopener noreferrer" className="hover:underline">riffatns</a></p> {/* */}

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-gray-100 opacity-50 z-0"></div>
        <div ref={mapContainerRef} className="w-full h-[400px] md:h-[500px] mb-12 mt-6 relative overflow-visible z-10">
          {loadingGeoJson && <Skeleton className="w-full h-full" />} {/* */}
          {!loadingGeoJson && geoJsonData && mapDimensions.width > 0 && mapDimensions.height > 0 && (
            <BubbleMap
              width={mapDimensions.width}
              height={mapDimensions.height}
              mapGeoData={geoJsonData} 
              bubbleData={bubbleMapItems} 
              scale={250}
              bubbleSize={16}
              selectedIsland={selectedIsland}
              setSelectedIsland={setSelectedIsland}
            />
          )}          {!loadingGeoJson && !geoJsonData && (
            <p className="text-center py-10 text-slate-600">Failed to load geographical map data. Make sure the GeoJSON file exists in public/world-pacific.geojson</p>
          )}
        </div>
        
        <div className="absolute bottom-16 right-6 text-xs text-gray-500">
          <p>A project by <span className="font-medium">Yan Holtz</span> and <span className="font-medium">Joseph Barbier</span></p>
          <p>July 2024</p>
        </div>
      </div>

      <Separator className="my-12" /> {/* */}
      
      <div className="my-12">
        <h3 className="text-3xl font-bold tracking-tight mb-4 text-slate-900">Employment Composition by Country/Region (Latest Year)</h3>
        <p className="text-lg mb-4 leading-relaxed text-slate-800">The nature of work varies significantly across Pacific nations, shaped by unique economic landscapes and cultural contexts.</p>
        
        <div className="mt-6 mb-8">
          <p className="text-lg leading-relaxed text-slate-800">
            Across the Pacific Islands, the balance between 
            <span className="font-semibold text-slate-900"> traditional full-time employment</span> and 
            <span className="font-semibold text-slate-900"> flexible part-time arrangements</span> tells a story of diverse economic realities. 
            Some nations lean heavily toward conventional employment structures, while others embrace more adaptable work patterns. 
            These distinctions often mirror each country's economic maturity, industry composition, and social frameworks, 
            creating a fascinating mosaic of labor market characteristics worth exploring in detail.
          </p>
        </div>
          <div className={`min-h-[${barChartHeight}px]`}>
          {loadingBar && <Skeleton className="w-full h-[400px]" />} {/* */}
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
          )}          {!loadingBar && employmentDataBar.length === 0 && (            <p className="text-center py-10 text-slate-600">
              {error && error.includes("Bar Chart") ? "Failed to load composition data." : "No composition data to display."}
            </p>
          )}
        </div>        {!loadingBar && employmentDataBar.length > 0 && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              The data reveals distinct employment cultures across the Pacific, 
              with some nations maintaining traditional full-time work structures while others have adapted to more flexible labor arrangements, 
              reflecting varying stages of economic development and social adaptation.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" /> {/* */}
      
      {/* Visualisasi Kedua: Line Chart Tren */}
      <div className="my-12">
        <h3 className="text-3xl font-bold tracking-tight mb-4 text-slate-900">Total Employment Trends Over Time</h3>
        <p className="text-lg mb-4 leading-relaxed text-slate-800">Economic stories unfold over time, revealing the ebb and flow of opportunity across Pacific nations.</p>
        <div className="mt-6 mb-8">
          <p className="text-lg leading-relaxed text-slate-800">
            Behind every employment statistic lies a human story of progress, challenge, and adaptation. 
            The trajectory of <span className="font-semibold text-slate-900"> workforce growth</span> in Pacific countries 
            reflects not just economic cycles, but the resilience of communities navigating global changes, 
            natural events, and evolving industries. Some nations experience steady climbs, others face periodic adjustments, 
            and a few showcase remarkable transformation—each path offering insights into the complex interplay 
            between geography, policy, and prosperity in the Pacific region.
          </p>
        </div>        {/* Trend Chart Country Filter */}
        {allCountryCodesForFilter.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center items-center py-4 bg-slate-50 rounded-lg shadow">
            <Button
              key="trend-all"
              variant={trendChartCountryPill === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => setTrendChartCountryPill('all')}
              className={`transition-all duration-150 ease-in-out text-xs md:text-sm ${
                trendChartCountryPill === 'all'
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
            >
              All Countries
            </Button>
            {allCountryCodesForFilter.map((country) => (
              <Button
                key={`trend-${country.code}`}
                variant={trendChartCountryPill === country.code ? "default" : "outline"}
                size="sm"
                onClick={() => setTrendChartCountryPill(country.code)}
                className={`transition-all duration-150 ease-in-out text-xs md:text-sm ${
                  trendChartCountryPill === country.code 
                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                {country.name}
              </Button>
            ))}
          </div>
        )}
        
        <div className="min-h-[550px]">
          {loadingLine && <Skeleton className="w-full h-[450px]" />}
          {!loadingLine && employmentDataLine.length > 0 && trendChartCountryPill && (
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
          {!loadingLine && (employmentDataLine.length === 0 || !trendChartCountryPill) && (
             <p className="text-center py-10 text-slate-600">
                {error && error.includes("Line Chart") ? "Failed to load trend data." : 
                 !trendChartCountryPill ? "Please select a country using the filters above." : "No trend data to display."}
              </p>
          )}
        </div>
        {!loadingLine && employmentDataLine.length > 0 && activeCountryPill && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              Employment trajectories across the Pacific reveal diverse 
              economic narratives—some countries demonstrate consistent growth patterns while others show cyclical fluctuations, 
              highlighting the varied resilience and adaptability of island economies to both regional and global influences.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" /> {/* */}
      
      {/* Visualisasi Ketiga: Age Composition Bar Chart */}
      <div className="my-12">
        <h3 className="text-3xl font-bold tracking-tight mb-4 text-slate-900">Employment Composition by Age Group</h3>
        <p className="text-lg mb-4 leading-relaxed text-slate-800">The rhythm of working life varies across generations, reflecting changing aspirations and life circumstances.</p>
        
        <div className="mt-6 mb-8">
          <p className="text-lg leading-relaxed text-slate-800">
            Each stage of life brings its own relationship with work. Young adults often navigate between education and career building, 
            mid-career professionals typically embrace full commitment, while those approaching retirement may seek greater flexibility. 
            This natural progression manifests differently across Pacific cultures, where traditional values intersect with modern 
            <span className="font-semibold text-slate-900"> workforce expectations</span>. 
            Understanding these generational patterns reveals not just current employment preferences, 
            but hints at future labor market dynamics as demographics shift and societal priorities evolve.
          </p>
        </div>        {/* Age Chart Country Filter */}
        {allCountryCodesForFilter.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center items-center py-4 bg-slate-50 rounded-lg shadow">
            {allCountryCodesForFilter.map((country) => (
              <Button
                key={`age-${country.code}`}
                variant={activeCountryPill === country.code ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCountryPill(country.code)}
                className={`transition-all duration-150 ease-in-out text-xs md:text-sm ${
                  activeCountryPill === country.code 
                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                {country.name}
              </Button>
            ))}
          </div>
        )}

        <div className="min-h-[500px]">
          {loadingAgeComposition && <Skeleton className="w-full h-[400px]" />} {/* */}
          {!loadingAgeComposition && errorAgeComposition && (
            <p className="text-center py-10 text-red-500 whitespace-pre-line">
              {errorAgeComposition}
            </p>
          )}
          {!loadingAgeComposition && !errorAgeComposition && !ageCompositionData && activeCountryPill && (
              <p className="text-center py-10 text-slate-600">
                No age composition data available for {allCountryCodesForFilter.find(c => c.code === activeCountryPill)?.name || activeCountryPill}.
              </p>
          )}
          {!loadingAgeComposition && !errorAgeComposition && !ageCompositionData && !activeCountryPill && (
              <p className="text-center py-10 text-slate-600">
                Please select a country using the filters above to view age composition data.
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
        </div>
        {!loadingAgeComposition && !errorAgeComposition && ageCompositionData && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              Age-based employment patterns often mirror life stage priorities, 
              with younger demographics balancing education and early career flexibility, while older workers may transition toward 
              part-time arrangements, creating distinct generational approaches to work-life integration.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" /> {/* */}
      
      {/* Visualisasi Keempat: Gender Disparity Line Chart */}
      <div className="my-12">
        <h3 className="text-3xl font-bold tracking-tight mb-4 text-slate-900">Employment Disparities Based on Gender</h3>
        <p className="text-lg mb-4 leading-relaxed text-slate-800">Progress toward workplace equality unfolds at different paces across Pacific societies, shaped by tradition and transformation.</p>
        
        <div className="mt-6 mb-8">
          <p className="text-lg leading-relaxed text-slate-800">
            The journey toward equal workforce participation reflects the intersection of cultural heritage and modern aspirations. 
            As Pacific societies navigate evolving social expectations, the 
            <span className="font-semibold text-slate-900"> representation of different genders</span> in the workforce 
            tells a nuanced story of progress, resistance, and gradual change. 
            Some nations have achieved remarkable balance, while others continue working toward more inclusive employment landscapes. 
            These patterns reveal not just current realities, but signal the direction of future social and economic development.
          </p>
        </div>        {/* Gender Chart Country Filter */}
        {allCountryCodesForFilter.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center items-center py-4 bg-slate-50 rounded-lg shadow">
            {allCountryCodesForFilter.map((country) => (
              <Button
                key={`gender-${country.code}`}
                variant={activeCountryPill === country.code ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCountryPill(country.code)}
                className={`transition-all duration-150 ease-in-out text-xs md:text-sm ${
                  activeCountryPill === country.code 
                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                {country.name}
              </Button>
            ))}
          </div>
        )}

        <div className="min-h-[500px]">
          {loadingGenderDisparity && <Skeleton className="w-full h-[400px]" />} {/* */}
          {!loadingGenderDisparity && errorGenderDisparity && (
            <p className="text-center py-10 text-red-500 whitespace-pre-line">
              {errorGenderDisparity}
            </p>
          )}
           {!loadingGenderDisparity && !errorGenderDisparity && !genderDisparityData && activeCountryPill && (
              <p className="text-center py-10 text-slate-600">
                No gender disparity data available for {allCountryCodesForFilter.find(c => c.code === activeCountryPill)?.name || activeCountryPill}.
              </p>
          )}
          {!loadingGenderDisparity && !errorGenderDisparity && !genderDisparityData && !activeCountryPill && (
              <p className="text-center py-10 text-slate-600">
                Please select a country using the filters above to view gender disparity data.
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
        </div>
        {!loadingGenderDisparity && !errorGenderDisparity && genderDisparityData && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              Gender participation trends in Pacific labor markets 
              reflect ongoing social transformation, with some countries showing convergence toward balanced representation 
              while others maintain traditional patterns, indicating varied speeds of cultural and economic evolution.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" /> {/* */}
      
      {/* Visualisasi Kelima: Employment Ratio Trend Chart */}
      <div className="my-12">
        <h3 className="text-3xl font-bold tracking-tight mb-4 text-slate-900">Full-Time vs. Part-Time Worker Ratio Trends</h3>
        <p className="text-lg mb-4 leading-relaxed text-slate-800">The evolution of work preferences reflects changing economic landscapes and shifting social priorities.</p>
        
        <div className="mt-6 mb-8">
          <p className="text-lg leading-relaxed text-slate-800">
            As economies mature and societies adapt to global trends, the traditional boundaries of employment continue to evolve. 
            The shifting <span className="font-semibold text-slate-900"> balance between structured and flexible work arrangements</span> 
            captures more than just employment statistics—it reflects changing life philosophies, economic pressures, and cultural adaptations. 
            Whether driven by technological advancement, demographic shifts, or evolving values around work-life balance, 
            these trends offer a window into how Pacific nations are redefining the very nature of career and commitment 
            in an increasingly connected yet diverse regional economy.
          </p>
        </div>        {/* Ratio Chart Country Filter */}
        {allCountryCodesForFilter.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center items-center py-4 bg-slate-50 rounded-lg shadow">
            {allCountryCodesForFilter.map((country) => (
              <Button
                key={`ratio-${country.code}`}
                variant={activeCountryPill === country.code ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCountryPill(country.code)}
                className={`transition-all duration-150 ease-in-out text-xs md:text-sm ${
                  activeCountryPill === country.code 
                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
              >
                {country.name}
              </Button>
            ))}
          </div>
        )}

        <div className="min-h-[500px]">
          {loadingEmploymentRatio && <Skeleton className="w-full h-[400px]" />} {/* */}
          {!loadingEmploymentRatio && errorEmploymentRatio && (
            <p className="text-center py-10 text-red-500 whitespace-pre-line">
              {errorEmploymentRatio}
            </p>
          )}
          {!loadingEmploymentRatio && !errorEmploymentRatio && !employmentRatioData && activeCountryPill && (
              <p className="text-center py-10 text-slate-600">
                No employment ratio data available for {allCountryCodesForFilter.find(c => c.code === activeCountryPill)?.name || activeCountryPill}.
              </p>
          )}
          {!loadingEmploymentRatio && !errorEmploymentRatio && !employmentRatioData && !activeCountryPill && (
              <p className="text-center py-10 text-slate-600">
                Please select a country using the filters above to view employment ratio data.
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
        </div>
        {!loadingEmploymentRatio && !errorEmploymentRatio && employmentRatioData && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              The evolution of full-time to part-time ratios reveals 
              how Pacific economies are adapting to modern work paradigms, with some countries embracing flexible employment 
              models while others maintain traditional structures, reflecting diverse approaches to economic modernization.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" /> {/* */}
      <DataSourceNote 
        sourceName="Pacific Data Hub (PDH.STAT) by Pacific Community (SPC)"
        sourceLink="https://stats.pacificdata.org/"
        notes={`Dataset used: DF_EMPLOYED_FTPT (Employed population by sex, age, status in employment, and occupation). Data accessed and visualized on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`}
        className="mt-16"
      />
      <Footer /> {/* */}
    </div>
  );
}
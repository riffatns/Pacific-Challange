// src/app/page.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';

// Komponen Umum
import PageTitle from '../components/common/PageTitle';
import Description from '../components/common/Description';
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
import { BubbleMap } from '../dataviz/bubbleMap/BubbleMap'; // Removed BubbleMapProps, will be defined in BubbleMap
import { FeatureCollection } from 'geojson';
import type { BubbleMapItem, Island } from '@/lib/types'; // Import BubbleMapItem

// Tipe dan Pemuat Data
import {
    loadEmploymentData,
    loadEmploymentTimeSeriesData,
    loadAgeSpecificEmploymentData,
    loadGenderEmploymentData, 
    loadEmploymentRatioTrendData, 
    EmploymentDataPoint, // Ensure EmploymentDataPoint is imported
    CountryTimeSeriesData,
    CountryAgeSpecificEmploymentData,
    CountryOption,
    CountryGenderEmploymentData,
    CountryEmploymentRatioTrend,
    // BubbleMapItem, // Already imported above
} from '../lib/data-loader'; // Adjusted to import from data-loader assuming types are re-exported or defined there

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
  const [genderDisparityData, setGenderDisparityData] = useState<CountryGenderEmploymentData | null>(null);
  const [employmentRatioData, setEmploymentRatioData] = useState<CountryEmploymentRatioTrend | null>(null);
  
  // State variables for loading and error states that were missing
  const [loadingBar, setLoadingBar] = useState(true);
  const [loadingLine, setLoadingLine] = useState(true);
  const [loadingAgeComposition, setLoadingAgeComposition] = useState(false);
  const [loadingGenderDisparity, setLoadingGenderDisparity] = useState(false);
  const [loadingEmploymentRatio, setLoadingEmploymentRatio] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorAgeComposition, setErrorAgeComposition] = useState<string | null>(null);
  const [errorGenderDisparity, setErrorGenderDisparity] = useState<string | null>(null);
  const [errorEmploymentRatio, setErrorEmploymentRatio] = useState<string | null>(null);

  // State for BubbleMap
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [bubbleMapItems, setBubbleMapItems] = useState<BubbleMapItem[]>([]); // Use BubbleMapItem[] type
  const [loadingGeoJson, setLoadingGeoJson] = useState(true);
  const [selectedIsland, setSelectedIsland] = useState<Island | undefined>(undefined); // Island is string
  
  const { ref: chart1ContainerRef, dimensions: chart1Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart2ContainerRef, dimensions: chart2Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart3ContainerRef, dimensions: chart3Dimensions } = useResizeObserver<HTMLDivElement>();
  const { ref: chart4ContainerRef, dimensions: chart4Dimensions } = useResizeObserver<HTMLDivElement>(); // Baru
  const { ref: chart5ContainerRef, dimensions: chart5Dimensions } = useResizeObserver<HTMLDivElement>(); // Baru
  const { ref: mapContainerRef, dimensions: mapDimensions } = useResizeObserver<HTMLDivElement>(); // Added for BubbleMap

  const [selectedCountriesForLine, setSelectedCountriesForLine] = useState<string[]>([]); 
  const [allCountryCodesForFilter, setAllCountryCodesForFilter] = useState<CountryOption[]>([]);
  const [selectedCountryForAgeChart, setSelectedCountryForAgeChart] = useState<string | undefined>(undefined);
  const [selectedCountryForGenderChart, setSelectedCountryForGenderChart] = useState<string | undefined>(undefined); // Baru
  const [selectedCountryForRatioChart, setSelectedCountryForRatioChart] = useState<string | undefined>(undefined); // Baru

  useEffect(() => {
    // Fungsi untuk memuat data GeoJSON
    const fetchGeoJson = async () => {
      setLoadingGeoJson(true);
      try {
        // Ensure this path is correct and the file is available in your public folder
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // GeoJSON fetching should be independent and run once

  // Process data for the bubble map when employmentDataBar or geoJsonData changes
  useEffect(() => {
    if (employmentDataBar.length > 0 && geoJsonData) {
      const countryCoordinatesMap = new Map<string, [number, number]>();
      geoJsonData.features.forEach(feature => {
        if (feature.properties && feature.properties.name && feature.geometry && feature.geometry.type === 'Point') {
          const geom = feature.geometry as GeoJSON.Point; // Type assertion
          countryCoordinatesMap.set(feature.properties.name, geom.coordinates as [number, number]);
        }
      });

      const processedBubbleData = employmentDataBar.map(item => {
        const coordinates = countryCoordinatesMap.get(item.countryName);
        return {
          id: item.countryName, // Assuming countryName is unique for ID, or use countryCode if available
          name: item.countryName,
          value: item.totalEmployed,
          coordinates: coordinates || [0, 0], // Default to [0,0] if not found
        };
      }).filter(item => item.coordinates[0] !== 0 || item.coordinates[1] !== 0); // Filter out those with default [0,0]

      setBubbleMapItems(processedBubbleData as BubbleMapItem[]); // Ensure type
    }
  }, [employmentDataBar, geoJsonData]); // Depend on both

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
            // Select all countries by default for the line chart
            const defaultSelectedCountries = countryFilters.map(cf => cf.code);
            setSelectedCountriesForLine(defaultSelectedCountries);
            
            // Find Niue in the country filters
            const niueCountry = countryFilters.find(c => c.name.includes('Niue'));
            const defaultCountry = niueCountry ? niueCountry.code : countryFilters[0].code;
            
            // Set Niue as default selected country and immediately fetch data for all charts
            setSelectedCountryForAgeChart(defaultCountry);
            setSelectedCountryForGenderChart(defaultCountry);
            setSelectedCountryForRatioChart(defaultCountry);

            // Immediately fetch data for the ratio chart
            const fetchInitialRatioData = async () => {
              try {
                const ratioData = await loadEmploymentRatioTrendData(defaultCountry);
                if (ratioData) {
                  setEmploymentRatioData(ratioData);
                }
              } catch (err) {
                console.error("Error fetching initial ratio data:", err);
              }
            };

            // Call the function immediately
            fetchInitialRatioData();
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
  }, []); // Initial data load

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
    const fetchRatioData = async () => {
      if (!selectedCountryForRatioChart) return;
      
      setLoadingEmploymentRatio(true);
      setErrorEmploymentRatio(null);
      try {
        const data = await loadEmploymentRatioTrendData(selectedCountryForRatioChart);
        if (data) {
          setEmploymentRatioData(data);
        } else {
          setEmploymentRatioData(null);
          const countryName = allCountryCodesForFilter.find((c: CountryOption) => 
            c.code === selectedCountryForRatioChart
          )?.name || selectedCountryForRatioChart;
          setErrorEmploymentRatio(`No employment ratio data for ${countryName}.`);
        }
      } catch (err) {
        console.error("Error fetching employment ratio data:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred.";
        setErrorEmploymentRatio(`Failed to load employment ratio data: ${errorMessage}`);
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
      </div>

      <p className="text-center text-sm text-gray-500 italic mb-6">A project by <a href="https://github.com/riffatns/Pacific-Challange" target="_blank" rel="noopener noreferrer" className="hover:underline">riffatns</a></p>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-gray-100 opacity-50 z-0"></div>
        <div ref={mapContainerRef} className="w-full h-[400px] md:h-[500px] mb-12 mt-6 relative overflow-visible z-10">
          {loadingGeoJson && <Skeleton className="w-full h-full" />}
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
        <Separator className="my-12" /> {/* Separator after the map section */}        <div className="my-12">
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

      <Separator className="my-12" />      {/* Visualisasi Kedua: Line Chart Tren */}      <div className="my-12">
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
        </div>

        {!loadingLine && allCountryCodesForFilter.length > 0 && (          <div className="mb-6 p-4 bg-gray-50 rounded-lg">            <p className="text-sm font-semibold mb-2 text-slate-900">Filter Countries:</p>
            <ScrollArea className="h-28">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-xs pr-3">
                {allCountryCodesForFilter.map((country: CountryOption) => (
                  <div key={country.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`check-line-${country.code}`}
                      checked={selectedCountriesForLine.includes(country.code)}
                      onCheckedChange={() => handleCountrySelectionChange(country.code)}
                    />
                    <label htmlFor={`check-line-${country.code}`} className="cursor-pointer select-none text-slate-800">
                      {country.name}
                    </label>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="vertical" />
            </ScrollArea><Button 
                variant="outline"
                size="sm"
                onClick={() => setSelectedCountriesForLine(allCountryCodesForFilter.map(c => c.code))} 
                className="mt-3 text-xs"
                disabled={selectedCountriesForLine.length === allCountryCodesForFilter.length}
              >
                Select All
              </Button>
          </div>
        )}        <div className="min-h-[550px]">
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
          )}          {!loadingLine && employmentDataLine.length === 0 && (             <p className="text-center py-10 text-slate-600">
                {error && error.includes("Line Chart") ? "Failed to load trend data." : "No trend data to display."}
              </p>
          )}
        </div>        {!loadingLine && employmentDataLine.length > 0 && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              Employment trajectories across the Pacific reveal diverse 
              economic narratives—some countries demonstrate consistent growth patterns while others show cyclical fluctuations, 
              highlighting the varied resilience and adaptability of island economies to both regional and global influences.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" />      {/* Visualisasi Ketiga: Age Composition Bar Chart */}      <div className="my-12">
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
        </div>

        {allCountryCodesForFilter.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">            <label htmlFor="country-select-age" className="text-sm font-semibold mb-1 block text-slate-900">Select Country:</label>
            <Select 
              value={selectedCountryForAgeChart}
              onValueChange={(value: string) => setSelectedCountryForAgeChart(value)}
            >
              <SelectTrigger id="country-select-age" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select a country" />
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

        <div className="min-h-[500px]">
          {loadingAgeComposition && <Skeleton className="w-full h-[400px]" />}
          {!loadingAgeComposition && errorAgeComposition && (
            <p className="text-center py-10 text-red-500 whitespace-pre-line">
              {errorAgeComposition}
            </p>
          )}          {!loadingAgeComposition && !errorAgeComposition && !ageCompositionData && selectedCountryForAgeChart && (              <p className="text-center py-10 text-slate-600">
                No age composition data available for the selected country.
              </p>
          )}
          {!loadingAgeComposition && !errorAgeComposition && !ageCompositionData && !selectedCountryForAgeChart && (              <p className="text-center py-10 text-slate-600">
                Please select a country to view age composition data.
              </p>
          )}          {!loadingAgeComposition && !errorAgeComposition && ageCompositionData && (
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
        </div>        {!loadingAgeComposition && !errorAgeComposition && ageCompositionData && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              Age-based employment patterns often mirror life stage priorities, 
              with younger demographics balancing education and early career flexibility, while older workers may transition toward 
              part-time arrangements, creating distinct generational approaches to work-life integration.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" />      {/* Visualisasi Keempat: Gender Disparity Line Chart (BARU) */}      <div className="my-12">
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
        </div>

        {allCountryCodesForFilter.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">            <label htmlFor="country-select-gender" className="text-sm font-semibold mb-1 block text-slate-900">Select Country:</label>
            <Select 
              value={selectedCountryForGenderChart}
              onValueChange={(value: string) => setSelectedCountryForGenderChart(value)}
            >
              <SelectTrigger id="country-select-gender" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select a country" />
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

        <div className="min-h-[500px]">
          {loadingGenderDisparity && <Skeleton className="w-full h-[400px]" />}
          {!loadingGenderDisparity && errorGenderDisparity && (
            <p className="text-center py-10 text-red-500 whitespace-pre-line">
              {errorGenderDisparity}
            </p>
          )}          {!loadingGenderDisparity && !errorGenderDisparity && !genderDisparityData && selectedCountryForGenderChart && (              <p className="text-center py-10 text-slate-600">
                No gender disparity data available for the selected country.
              </p>
          )}
          {!loadingGenderDisparity && !errorGenderDisparity && !genderDisparityData && !selectedCountryForGenderChart && (              <p className="text-center py-10 text-slate-600">
                Please select a country to view gender disparity data.
              </p>
          )}          {!loadingGenderDisparity && !errorGenderDisparity && genderDisparityData && (
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
        </div>        {!loadingGenderDisparity && !errorGenderDisparity && genderDisparityData && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              Gender participation trends in Pacific labor markets 
              reflect ongoing social transformation, with some countries showing convergence toward balanced representation 
              while others maintain traditional patterns, indicating varied speeds of cultural and economic evolution.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" />      {/* Visualisasi Kelima: Employment Ratio Trend Chart (BARU) */}      <div className="my-12">
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
        </div>

        {allCountryCodesForFilter.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">            <label htmlFor="country-select-ratio" className="text-sm font-semibold mb-1 block text-slate-900">Select Country:</label>
            <Select 
              value={selectedCountryForRatioChart}
              onValueChange={(value: string) => setSelectedCountryForRatioChart(value)}
            >
              <SelectTrigger id="country-select-ratio" className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select a country" />
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

        <div className="min-h-[500px]">
          {loadingEmploymentRatio && <Skeleton className="w-full h-[400px]" />}
          {!loadingEmploymentRatio && errorEmploymentRatio && (
            <p className="text-center py-10 text-red-500 whitespace-pre-line">
              {errorEmploymentRatio}
            </p>
          )}          {!loadingEmploymentRatio && !errorEmploymentRatio && !employmentRatioData && selectedCountryForRatioChart && (              <p className="text-center py-10 text-slate-600">
                No employment ratio data available for the selected country.
              </p>
          )}
          {!loadingEmploymentRatio && !errorEmploymentRatio && !employmentRatioData && !selectedCountryForRatioChart && (              <p className="text-center py-10 text-slate-600">
                Please select a country to view employment ratio data.
              </p>
          )}          {!loadingEmploymentRatio && !errorEmploymentRatio && employmentRatioData && (
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
        </div>        {!loadingEmploymentRatio && !errorEmploymentRatio && employmentRatioData && (
          <div className="mt-6">
            <p className="text-base leading-relaxed text-slate-600 italic">
              The evolution of full-time to part-time ratios reveals 
              how Pacific economies are adapting to modern work paradigms, with some countries embracing flexible employment 
              models while others maintain traditional structures, reflecting diverse approaches to economic modernization.
            </p>
          </div>
        )}
      </div>

      <Separator className="my-12" />      <DataSourceNote 
        sourceName="Pacific Data Hub (PDH.STAT) by Pacific Community (SPC)"
        sourceLink="https://stats.pacificdata.org/"
        notes={`Dataset used: DF_EMPLOYED_FTPT (Employed population by sex, age, status in employment, and occupation). Data accessed and visualized on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`}
        className="mt-16"
      />
      <Footer />
    </div>
  );
}
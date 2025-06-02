"use client";

import { Island, BubbleMapItem } from "@/lib/types";
import { geoOrthographic, geoPath, GeoProjection, geoGraticule } from "d3-geo";
import { Feature, FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { CircleItem } from "./CircleItem";
import { feature as topoFeature } from "topojson-client"; // Import topojson-client
import styles from "./bubble-map.module.css";
import { useRef, useState, useEffect } from "react";

// For world map background
interface WorldTopoJSON {
  type: string;
  objects: {
    [key: string]: any;
  };
  arcs: any[];
}

export type BubbleMapProps = {
  width: number;
  height: number;
  mapGeoData: FeatureCollection;
  bubbleData: BubbleMapItem[];
  selectedIsland: Island | undefined;
  setSelectedIsland: (newIsland: Island) => void;
  scale: number;
  bubbleSize: number;
};

export const BubbleMap = ({
  width,
  height,
  mapGeoData,
  bubbleData,
  selectedIsland,
  setSelectedIsland,
  scale,
  bubbleSize,
}: BubbleMapProps) => {
  const bubbleContainerRef = useRef<SVGGElement | null>(null);
  const [worldGeoJSON, setWorldGeoJSON] = useState<FeatureCollection | null>(null);

  // Fetch world map data
  useEffect(() => {
    const fetchWorldMap = async () => {
      try {
        const response = await fetch("https://unpkg.com/world-atlas@2.0.2/countries-110m.json");
        if (!response.ok) {
          throw new Error("Failed to load world map data");
        }
        const worldTopoJSON = await response.json();

        // Convert TopoJSON to GeoJSON
        const countries = topoFeature(
          worldTopoJSON,
          worldTopoJSON.objects.countries
        ) as unknown as FeatureCollection;

        setWorldGeoJSON(countries);
      } catch (error) {
        console.error("Error loading world map:", error);
      }
    };

    fetchWorldMap();
  }, []);

  const projection = geoOrthographic()
    .rotate([170, -15]) // Mengubah rotasi untuk fokus ke wilayah Pasifik [bujur, lintang]
    .scale(scale * 1.5) // Meningkatkan skala untuk memperbesar area yang ditampilkan
    .translate([width / 2, height / 2]);

  const geoPathGenerator = geoPath().projection(projection);

  // Create graticule for grid lines
  const graticule = geoGraticule();

  // Render world map background if available
  let worldMapPaths: JSX.Element[] = [];
  if (worldGeoJSON && worldGeoJSON.features) {
    worldMapPaths = worldGeoJSON.features.map((feature: Feature, i: number) => {
      const pathData = geoPathGenerator(feature);
      return (
        <path
          key={`world-${feature.id || i}`}
          d={pathData || ""}
          fill="#d1dde9"
          stroke="#a0b3c6"
          strokeWidth={0.2}
        />
      );
    });
  }

  // Render graticule (grid lines)
  const graticulePath = geoPathGenerator(graticule());

  // Render bubbles from bubbleData
  const allBubbles = bubbleData.map((item: BubbleMapItem) => {
    const [x, y] = projection(item.coordinates as [number, number]) || [0, 0];

    // Skip if projection returned null or default coordinates
    if (x === 0 && y === 0 && item.coordinates[0] !== 0 && item.coordinates[1] !== 0) {
      return null;
    }
    
    // Determine bubble size based on value and selection state
    const baseSize = bubbleSize;
    // Menggunakan nilai yang lebih konsisten untuk skala bubble
    const valueScale = Math.sqrt(item.value) / 100;
    const normalizedScale = Math.max(0.8, Math.min(2, valueScale));
    const selectionMultiplier = selectedIsland === item.name || !selectedIsland ? 1.3 : 1;
    const r = baseSize * normalizedScale * selectionMultiplier;
    
    // Determine color based on selection
    const color = selectedIsland === item.name
      ? "rgba(25, 118, 210, 0.9)" // Biru lebih gelap untuk yang terpilih
      : "rgba(66, 165, 245, 0.8)"; // Biru lebih mencolok untuk semua bubble
    
    return (
      <g className={styles.circleContainer} key={item.id}>
        <CircleItem
          x={x}
          y={y}
          r={r}
          color={color}
          onClick={() => {
            setSelectedIsland(item.name);
          }}
        />
        <text
          className={styles.circleText}
          x={x < width - 100 ? x + r + 2 : x - r - 2} // Lebih dekat ke bubble
          y={y}
          fill={selectedIsland === item.name ? "#1565C0" : "#333"} // Teks lebih gelap untuk keterbacaan
          alignmentBaseline="middle"
          textAnchor={x < width - 100 ? "start" : "end"}
          fontSize="12px" // Ukuran teks yang lebih besar
          fontWeight={selectedIsland === item.name ? "bold" : "normal"}
        >
          {item.name}
        </text>
      </g>
    );
  });

  return (
    <div className={styles.mapContainer}>
      <svg width={width} height={height}>
        {/* Background globe */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={scale * 1.5} // Menyesuaikan dengan skala proyeksi yang diubah
          fill="#e3f2fd" // Warna biru yang lebih terang untuk lautan
          stroke="#90caf9" 
          strokeWidth={1}
        />
        
        {/* Graticule (grid lines) */}
        <path
          d={graticulePath || ""}
          fill="none"
          stroke="#bbdefb"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
        
        {/* World map countries */}
        {worldMapPaths}
        
        {/* Bubbles and labels */}
        <g
          ref={bubbleContainerRef}
          onMouseOver={() => {
            if (bubbleContainerRef.current) {
              bubbleContainerRef.current.classList.add(styles.hasHighlight);
            }
          }}
          onMouseLeave={() => {
            if (bubbleContainerRef.current) {
              bubbleContainerRef.current.classList.remove(styles.hasHighlight);
            }
          }}
        >
          {allBubbles}
        </g>
      </svg>
    </div>
  );
};

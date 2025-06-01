// src/dataviz/AgeCompositionBarChart.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CountryAgeSpecificEmploymentData, AgeSpecificEmploymentValue } from '../lib/types'; // Pastikan path ini benar

interface AgeCompositionBarChartProps {
  data: CountryAgeSpecificEmploymentData | null;
  width: number;
  height: number;
}

const MARGIN = { top: 50, right: 50, bottom: 70, left: 80 }; // Sesuaikan margin sesuai kebutuhan

const AgeCompositionBarChart: React.FC<AgeCompositionBarChartProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current || width <= 0 || height <= 0) {
      // Kosongkan SVG jika tidak ada data atau dimensi tidak valid
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Bersihkan SVG sebelum menggambar ulang

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const ageGroups = data.ageCompositions.map(d => d.ageGroup);
    const employmentTypes = ['fullTime', 'partTime'];

    // Skala X untuk kelompok usia
    const xScale = d3.scaleBand()
      .domain(ageGroups)
      .range([0, chartWidth])
      .padding(0.2);

    // Skala X untuk jenis pekerjaan (full-time, part-time) di dalam setiap kelompok usia
    const xSubgroupScale = d3.scaleBand()
      .domain(employmentTypes)
      .range([0, xScale.bandwidth()])
      .padding(0.05);

    // Skala Y untuk jumlah pekerja
    const maxYValue = d3.max(data.ageCompositions, d => Math.max(d.fullTime, d.partTime)) || 0;
    const yScale = d3.scaleLinear()
      .domain([0, maxYValue * 1.1]) // Beri sedikit ruang di atas
      .range([chartHeight, 0]);

    // Skema warna
    const colorScale = d3.scaleOrdinal<string>()
      .domain(employmentTypes)
      .range(['#1f77b4', '#ff7f0e']); // Biru untuk full-time, Oranye untuk part-time

    // Menggambar bar
    const ageGroupBars = g.selectAll(".age-group")
      .data(data.ageCompositions)
      .enter()
      .append("g")
      .attr("class", "age-group")
      .attr("transform", d => `translate(${xScale(d.ageGroup)}, 0)`);

    ageGroupBars.selectAll("rect")
      .data(d => employmentTypes.map(type => ({ 
          key: type, 
          value: d[type as keyof AgeSpecificEmploymentValue] as number, 
          ageGroup: d.ageGroup 
      })))
      .enter()
      .append("rect")
      .attr("x", d => xSubgroupScale(d.key)!)
      .attr("y", d => yScale(d.value))
      .attr("width", xSubgroupScale.bandwidth())
      .attr("height", d => chartHeight - yScale(d.value))
      .attr("fill", d => colorScale(d.key));

    // Menambahkan sumbu X
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + MARGIN.bottom - 10)
        .text("Kelompok Usia")
        .style("font-size", "12px");


    // Menambahkan sumbu Y
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2s"))) // Format angka (misal: 1.0K, 2.5M)
      .selectAll("text")
        .style("font-size", "10px");

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartHeight / 2)
        .attr("y", -MARGIN.left + 20)
        .text("Jumlah Pekerja")
        .style("font-size", "12px");

    // Judul Chart (opsional, bisa dari ChartCard)
    // svg.append("text")
    //   .attr("x", width / 2)
    //   .attr("y", MARGIN.top / 2)
    //   .attr("text-anchor", "middle")
    //   .style("font-size", "16px")
    //   .style("font-weight", "bold")
    //   .text(`Komposisi Usia Pekerja di ${data.countryName} (${data.year})`);

    // Legenda
    const legend = g.selectAll(".legend")
      .data(employmentTypes)
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
      .attr("x", chartWidth - 18) // Posisi legenda
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", colorScale);

    legend.append("text")
      .attr("x", chartWidth - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .style("font-size", "10px")
      .text(d => d === 'fullTime' ? 'Penuh Waktu' : 'Paruh Waktu');

  }, [data, width, height]);

  if (!data && width > 0 && height > 0) {
    return (
      <svg ref={svgRef} width={width} height={height}>
        <text x={width/2} y={height/2} textAnchor="middle" fill="#888">
          Pilih negara untuk melihat data komposisi usia.
        </text>
      </svg>
    );
  }
  
  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default AgeCompositionBarChart;

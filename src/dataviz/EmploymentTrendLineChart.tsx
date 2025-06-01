// src/dataviz/EmploymentTrendLineChart.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { CountryTimeSeriesData, EmploymentTrendLineChartProps, TimeSeriesPoint } from '../lib/types';
import { formatSIAxis } from '../lib/d3-utils';

const MARGIN = { top: 30, right: 160, bottom: 60, left: 70 }; // Margin kanan lebih untuk legenda

const EmploymentTrendLineChart = ({
  data,
  width,
  height,
  selectedCountryCodes = [],
}: EmploymentTrendLineChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const displayData = useMemo(() => {
    if (selectedCountryCodes && selectedCountryCodes.length > 0) {
      return data.filter(country => selectedCountryCodes.includes(country.countryCode));
    }
    return data; // Tampilkan semua jika tidak ada yang dipilih (atau maksimal N negara)
  }, [data, selectedCountryCodes]);

  useEffect(() => {
    if (!svgRef.current || displayData.length === 0 || width === 0 || height === 0) {
      if(svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) {
        d3.select(svgRef.current).selectAll("*").remove();
        return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

    const allYears = displayData.flatMap(country => country.values.map(v => v.year));
    const allValues = displayData.flatMap(country => country.values.map(v => v.value));

    if (allYears.length === 0 || allValues.length === 0) {
        // Tidak ada data valid untuk digambar
        return;
    }
    
    const [minYear, maxYear] = d3.extent(allYears) as [number, number];
    const maxValue = d3.max(allValues) || 1;


    const xScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0])
      .nice();

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const lineGenerator = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .defined(d => !isNaN(d.value) && d.value !== null) // Abaikan titik null/NaN
      .curve(d3.curveMonotoneX);

    // Tooltip Element
    let tooltip = d3.select<HTMLDivElement, unknown>(`#tooltip-linechart`);
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
        .attr("id", "tooltip-linechart")
        .attr("class", "tooltip absolute p-2 text-xs bg-opacity-80 bg-white border border-gray-300 rounded shadow-lg pointer-events-none z-10")
        .style("visibility", "hidden");
    }

    displayData.forEach((country) => {
      chartGroup.append('path')
        .datum(country.values)
        .attr('fill', 'none')
        .attr('stroke', colorScale(country.countryCode))
        .attr('stroke-width', 2.5)
        .attr('d', lineGenerator)
        .attr('class', `line line-${country.countryCode}`)
        .on("mouseover", function (event) {
          d3.selectAll(`.line`).attr('opacity', 0.2); // Redupkan semua garis
          d3.select(this).attr("stroke-width", 4).attr('opacity', 1); // Tebalkan dan cerahkan garis ini
          tooltip.style("visibility", "visible")
                 .html(`<b>${country.countryName}</b>`)
                 .style("top", (event.pageY - 25) + "px")
                 .style("left", (event.pageX + 10) + "px")
                 .style("background-color", colorScale(country.countryCode))
                 .style("color", "white"); // Sesuaikan warna teks jika perlu
        })
        .on("mouseout", function () {
          d3.selectAll(`.line`).attr('opacity', 1); // Kembalikan opasitas semua garis
          d3.select(this).attr("stroke-width", 2.5);
          tooltip.style("visibility", "hidden");
        });
    });

    const xAxis = d3.axisBottom(xScale)
                    .ticks(Math.min(maxYear - minYear, 10))
                    .tickFormat(d3.format("d"));
    chartGroup.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .append("text")
        .attr("y", MARGIN.bottom - 20)
        .attr("x", innerWidth / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("class", "text-sm")
        .text("Tahun");

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatSIAxis);
    chartGroup.append('g')
      .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -MARGIN.left + 20)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("class", "text-sm")
        .text("Jumlah Pekerja");

    const legend = chartGroup.selectAll(".legend-line")
      .data(displayData) // Hanya tampilkan legenda untuk data yang ditampilkan
      .enter()
      .append("g")
      .attr("class", "legend-line")
      .attr("transform", (d, i) => `translate(${innerWidth + 15}, ${i * 20})`);

    legend.append("rect")
      .attr("x", 0)
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", d => colorScale(d.countryCode));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 6)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .attr("class", "text-xs cursor-default")
      .text(d => d.countryName.length > 20 ? d.countryName.substring(0,18) + "..." : d.countryName)
      .on("mouseover", function(event, d_legend) {
          d3.selectAll(`.line`).attr('opacity', 0.2);
          d3.select(`.line-${d_legend.countryCode}`).attr('stroke-width', 4).attr('opacity', 1);
      })
      .on("mouseout", function() {
          d3.selectAll(`.line`).attr('opacity', 1).attr('stroke-width', 2.5);
      });
      
    return () => {
      // Tooltip di body tidak perlu diremove di sini jika di-reuse
    };

  }, [displayData, width, height]);

  if (width === 0 || height === 0) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Menunggu ukuran kontainer...</div>;
  }
  if (displayData.length === 0 && data.length > 0 && selectedCountryCodes && selectedCountryCodes.length > 0){
      return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Tidak ada data untuk negara yang dipilih.</div>;
  }
  if (displayData.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Tidak ada data tren untuk ditampilkan.</div>;
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};
export default EmploymentTrendLineChart;
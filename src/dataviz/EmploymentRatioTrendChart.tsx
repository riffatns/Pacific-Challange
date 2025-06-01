// src/dataviz/EmploymentRatioTrendChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CountryEmploymentRatioTrend } from '../lib/types';

interface EmploymentRatioTrendChartProps {
  data: CountryEmploymentRatioTrend | null;
  width: number;
  height: number;
}

const MARGIN = { top: 40, right: 50, bottom: 60, left: 70 };

const EmploymentRatioTrendChart: React.FC<EmploymentRatioTrendChartProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.values || data.values.length === 0 || width === 0 || height === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    const xScale = d3.scalePoint<number>()
      .domain(data.values.map(d => d.year).sort(d3.ascending))
      .range([0, chartWidth])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data.values, d => d.ratio) || 1]) // Max ratio or 1 if no data
      .nice()
      .range([chartHeight, 0]);

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Axes
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle");
      
    g.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + MARGIN.bottom - 10)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text("Tahun");

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".1f")); // Format for ratio
    g.append("g").call(yAxis);

    g.append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -MARGIN.left + 20)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text("Rasio Penuh Waktu / Paruh Waktu");

    // Line generator
    const line = d3.line<{ year: number; ratio: number }>()
      .x(d => xScale(d.year)!)
      .y(d => yScale(d.ratio))
      .defined(d => d.ratio !== null && !isNaN(d.ratio)) // Handle potential null/NaN ratios
      .curve(d3.curveMonotoneX);

    // Draw line
    g.append("path")
      .datum(data.values.sort((a,b) => a.year - b.year))
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "1px")
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("font-size", "12px")
      .style("color", "black");

    // Add circles for data points and tooltips
    g.selectAll(".dot-ratio")
      .data(data.values.filter(d => d.ratio !== null && !isNaN(d.ratio)))
      .enter().append("circle")
      .attr("class", "dot-ratio")
      .attr("cx", d => xScale(d.year)!)
      .attr("cy", d => yScale(d.ratio))
      .attr("r", 5)
      .style("fill", "steelblue")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        tooltip.html(`<strong>Tahun ${d.year}</strong><br/>Rasio FT/PT: ${d.ratio.toFixed(2)}<br/>(Penuh: ${d3.format(",")(d.fullTime)}, Paruh: ${d3.format(",")(d.partTime)})`)
          .style("visibility", "visible");
        d3.select(event.currentTarget).transition().duration(150).attr("r", 7);
      })
      .on("mousemove", (event) => {
        tooltip.style("top", (event.pageY - 10) + "px")
               .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", (event) => {
        tooltip.style("visibility", "hidden");
        d3.select(event.currentTarget).transition().duration(150).attr("r", 5);
      });

    // Chart Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", MARGIN.top / 2 + 5)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Tren Rasio Pekerja Penuh Waktu vs Paruh Waktu di ${data.countryName}`);

  }, [data, width, height]);

  if (!data && width > 0 && height > 0) {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Data tidak tersedia untuk negara ini.");
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default EmploymentRatioTrendChart;

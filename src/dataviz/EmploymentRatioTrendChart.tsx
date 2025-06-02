// src/dataviz/EmploymentRatioTrendChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CountryEmploymentRatioTrend } from '../lib/types';
import { formatSIAxis } from '../lib/d3-utils';

interface EmploymentRatioTrendChartProps {
  data: CountryEmploymentRatioTrend | null;
  width: number;
  height: number;
}

const MARGIN = { top: 40, right: 120, bottom: 60, left: 70 };

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

    // Scale for worker counts instead of ratio
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data.values, d => Math.max(d.fullTimeCount || 0, d.partTimeCount || 0)) || 1])
      .nice()
      .range([chartHeight, 0]);

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

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
      .text("Year");

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatSIAxis);
    g.append("g").call(yAxis);

    g.append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -MARGIN.left + 20)
      .style("font-size", "12px")
      .style("fill", "#333")
      .text("Number of Workers");

    // Line generators for both lines
    const createLine = () => d3.line<any>()
      .x(d => xScale(d.year)!)
      .y(d => yScale(d.count))
      .curve(d3.curveMonotoneX);

    const sortedData = [...data.values].sort((a, b) => a.year - b.year);

    // Prepare data for both lines
    const fullTimeData = sortedData.map(d => ({ year: d.year, count: d.fullTimeCount }))
      .filter(d => d.count > 0);
    const partTimeData = sortedData.map(d => ({ year: d.year, count: d.partTimeCount }))
      .filter(d => d.count > 0);

    // Draw full-time line
    g.append("path")
      .datum(fullTimeData)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6") // blue-500
      .attr("stroke-width", 2)
      .attr("d", createLine())
      .attr("class", "full-time-line");

    // Draw part-time line
    g.append("path")
      .datum(partTimeData)
      .attr("fill", "none")
      .attr("stroke", "#f97316") // orange-500
      .attr("stroke-width", 2)
      .attr("d", createLine())
      .attr("class", "part-time-line");

    // Add data points
    g.selectAll(".dot-full-time")
      .data(fullTimeData)
      .enter().append("circle")
      .attr("class", "dot-full-time")
      .attr("cx", d => xScale(d.year)!)
      .attr("cy", d => yScale(d.count))
      .attr("r", 5)
      .style("fill", "#3b82f6")
      .style("cursor", "pointer");

    g.selectAll(".dot-part-time")
      .data(partTimeData)
      .enter().append("circle")
      .attr("class", "dot-part-time")
      .attr("cx", d => xScale(d.year)!)
      .attr("cy", d => yScale(d.count))
      .attr("r", 5)
      .style("fill", "#f97316")
      .style("cursor", "pointer");

    // Add legend
    const legend = g.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data([
        { label: "Full-time Workers", color: "#3b82f6" },
        { label: "Part-time Workers", color: "#f97316" }
      ])
      .enter().append("g")
      .attr("transform", (d, i) => `translate(${chartWidth + 10},${i * 20 + 10})`);

    legend.append("rect")
      .attr("x", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", d => d.color);

    legend.append("text")
      .attr("x", 24)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text(d => d.label);

    // Add tooltips
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
      .style("color", "black")
      .style("pointer-events", "none");

    const showTooltip = (event: MouseEvent, d: any, type: string) => {
      tooltip.html(`<strong>Year ${d.year}</strong><br/>${type}: ${d3.format(",")(d.count)}`)
        .style("visibility", "visible")
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
      d3.select(event.target as Element).transition().duration(150).attr("r", 7);
    };

    const hideTooltip = (event: MouseEvent) => {
      tooltip.style("visibility", "hidden");
      d3.select(event.target as Element).transition().duration(150).attr("r", 5);
    };

    // Add tooltip interactions
    g.selectAll(".dot-full-time")
      .on("mouseover", (e, d) => showTooltip(e, d, "Full-time"))
      .on("mouseout", hideTooltip);

    g.selectAll(".dot-part-time")
      .on("mouseover", (e, d) => showTooltip(e, d, "Part-time"))
      .on("mouseout", hideTooltip);

    // Chart Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", MARGIN.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Employment Trends in ${data.countryName}`);

  }, [data, width, height]);

  if (!data && width > 0 && height > 0) {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("No data available for this country.");
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default EmploymentRatioTrendChart;

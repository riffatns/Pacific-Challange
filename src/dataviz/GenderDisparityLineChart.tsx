// src/dataviz/GenderDisparityLineChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CountryGenderEmploymentData } from '../lib/types';

interface GenderDisparityLineChartProps {
  data: CountryGenderEmploymentData | null;
  width: number;
  height: number;
}

const MARGIN = { top: 40, right: 150, bottom: 60, left: 70 };

const GenderDisparityLineChart: React.FC<GenderDisparityLineChartProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.trend || data.trend.length === 0 || width === 0 || height === 0) {
      d3.select(svgRef.current).selectAll("*").remove(); // Clear previous chart
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    // Data is structured as { year: number, male: number, female: number }[]
    const trendData = data.trend;

    const allYears = Array.from(new Set(trendData.map(d => d.year))).sort(d3.ascending);
    const allValues = trendData.reduce((acc, d) => {
      acc.push(d.male, d.female);
      return acc;
    }, [] as number[]);

    const xScale = d3.scalePoint<number>()
      .domain(allYears)
      .range([0, chartWidth])
      .padding(0.5);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allValues) || 0])
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
      .style("fill", "#333")      .text("Year");

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => d3.format("~s")(d));
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

    // Line generator for MALE data
    const lineMale = d3.line<{ year: number; male: number }>()
      .x(d => xScale(d.year)!)
      .y(d => yScale(d.male))
      .curve(d3.curveMonotoneX);

    // Line generator for FEMALE data
    const lineFemale = d3.line<{ year: number; female: number }>()
      .x(d => xScale(d.year)!)
      .y(d => yScale(d.female))
      .curve(d3.curveMonotoneX);

    // Colors
    const colorScale = d3.scaleOrdinal<string>().domain(['Male', 'Female']).range(['#1f77b4', '#ff7f0e']);

    // Draw MALE line
    const maleLineData = trendData.filter(d => d.male > 0).sort((a, b) => a.year - b.year);
    if (maleLineData.length > 0) {
      g.append("path")
        .datum(maleLineData)
        .attr("fill", "none")
        .attr("stroke", colorScale('Male'))
        .attr("stroke-width", 2.5)
        .attr("d", lineMale);
    }

    // Draw FEMALE line
    const femaleLineData = trendData.filter(d => d.female > 0).sort((a, b) => a.year - b.year);
    if (femaleLineData.length > 0) {
      g.append("path")
        .datum(femaleLineData)
        .attr("fill", "none")
        .attr("stroke", colorScale('Female'))
        .attr("stroke-width", 2.5)
        .attr("d", lineFemale);
    }

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
    // For MALE data points
    if (maleLineData.length > 0) {
        g.selectAll(".dot-male")
          .data(maleLineData)
          .enter().append("circle")
          .attr("class", "dot-male")
          .attr("cx", d => xScale(d.year)!)
          .attr("cy", d => yScale(d.male))
          .attr("r", 5)
          .style("fill", colorScale('Male'))
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {            tooltip.html(`<strong>Male (${d.year})</strong><br/>Count: ${d3.format(",")(d.male)}`)
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
    }

    // For FEMALE data points
    if (femaleLineData.length > 0) {
        g.selectAll(".dot-female")
          .data(femaleLineData)
          .enter().append("circle")
          .attr("class", "dot-female")
          .attr("cx", d => xScale(d.year)!)
          .attr("cy", d => yScale(d.female))
          .attr("r", 5)
          .style("fill", colorScale('Female'))
          .style("cursor", "pointer")
          .on("mouseover", (event, d) => {
            tooltip.html(`<strong>Female (${d.year})</strong><br/>Count: ${d3.format(",")(d.female)}`)
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
    }
    
    // Legend
    const legend = svg.selectAll(".legend")
      .data(['Male', 'Female'])
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${chartWidth + MARGIN.left + 10},${MARGIN.top + i * 25})`);

    legend.append("rect")
      .attr("x", 0)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", d => colorScale(d));

    legend.append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .style("font-size", "12px")      .text(d => d === 'Male' ? 'Male' : 'Female');

    // Chart Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", MARGIN.top / 2 + 5)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Gender Employment Disparity in ${data.countryName}`);

  }, [data, width, height]);

  if (!data && width > 0 && height > 0) { // Handle case where data is null but dimensions are set (e.g. country selected but no data)
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

export default GenderDisparityLineChart;

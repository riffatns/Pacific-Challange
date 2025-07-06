// src/dataviz/GenderDisparityLineChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CountryGenderEmploymentData } from '../lib/types';

interface GenderDisparityLineChartProps {
  data: CountryGenderEmploymentData | null;
  width: number;
  height: number;
}

const MARGIN = { top: 40, right: 160, bottom: 60, left: 80 };

const GenderDisparityLineChart: React.FC<GenderDisparityLineChartProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !data.trend || data.trend.length === 0 || width === 0 || height === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    const trendData = data.trend;

    const allYears = Array.from(new Set(trendData.map(d => d.year))).sort(d3.ascending);
    const allValues = trendData.reduce((acc, d) => {
      acc.push(d.male, d.female);
      return acc;
    }, [] as number[]);

    const xScale = d3.scalePoint<number>()
      .domain(allYears)
      .range([0, chartWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allValues) || 0])
      .nice()
      .range([chartHeight, 0]);

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Enhanced color scheme matching image 2
    const colorScale = d3.scaleOrdinal<string>()
      .domain(['Male', 'Female'])
      .range(['#4dd0e1', '#ad1457']); // Teal for male, Pink/Purple for female

    // Add subtle grid lines
    const gridGroup = g.append("g").attr("class", "grid");
    
    // Horizontal grid lines
    gridGroup.selectAll(".grid-line-y")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#f1f5f9")
      .attr("stroke-width", 1);

    // Vertical grid lines
    gridGroup.selectAll(".grid-line-x")
      .data(allYears)
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", d => xScale(d)!)
      .attr("x2", d => xScale(d)!)
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "#f8fafc")
      .attr("stroke-width", 1);

    // Line generators with smooth curves
    const lineMale = d3.line<{ year: number; male: number }>()
      .x(d => xScale(d.year)!)
      .y(d => yScale(d.male))
      .curve(d3.curveCardinal.tension(0.3));

    const lineFemale = d3.line<{ year: number; female: number }>()
      .x(d => xScale(d.year)!)
      .y(d => yScale(d.female))
      .curve(d3.curveCardinal.tension(0.3));

    // Enhanced tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "gender-chart-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))")
      .style("color", "white")
      .style("padding", "12px 16px")
      .style("border-radius", "12px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("z-index", "9999")
      .style("box-shadow", "0 10px 25px rgba(0, 0, 0, 0.3)")
      .style("border", "1px solid rgba(255, 255, 255, 0.1)")
      .style("backdrop-filter", "blur(10px)");

    // Process and draw lines
    const maleLineData = trendData.filter(d => d.male > 0).sort((a, b) => a.year - b.year);
    const femaleLineData = trendData.filter(d => d.female > 0).sort((a, b) => a.year - b.year);

    // Draw male line with gradient
    if (maleLineData.length > 0) {
      // Add gradient definition for male line
      const maleGradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "male-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", yScale(d3.max(maleLineData, d => d.male) || 0))
        .attr("x2", 0).attr("y2", yScale(0));

      maleGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale('Male'))
        .attr("stop-opacity", 0.8);

      maleGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale('Male'))
        .attr("stop-opacity", 0.2);

      g.append("path")
        .datum(maleLineData)
        .attr("fill", "none")
        .attr("stroke", colorScale('Male'))
        .attr("stroke-width", 4)
        .attr("d", lineMale)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    }

    // Draw female line with gradient
    if (femaleLineData.length > 0) {
      // Add gradient definition for female line
      const femaleGradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "female-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", yScale(d3.max(femaleLineData, d => d.female) || 0))
        .attr("x2", 0).attr("y2", yScale(0));

      femaleGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale('Female'))
        .attr("stop-opacity", 0.8);

      femaleGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale('Female'))
        .attr("stop-opacity", 0.2);

      g.append("path")
        .datum(femaleLineData)
        .attr("fill", "none")
        .attr("stroke", colorScale('Female'))
        .attr("stroke-width", 4)
        .attr("d", lineFemale)
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
    }

    // Enhanced data points for male
    if (maleLineData.length > 0) {
      g.selectAll(".dot-male")
        .data(maleLineData)
        .enter().append("circle")
        .attr("class", "dot-male")
        .attr("cx", d => xScale(d.year)!)
        .attr("cy", d => yScale(d.male))
        .attr("r", 8)
        .style("fill", colorScale('Male'))
        .style("stroke", "#ffffff")
        .style("stroke-width", 3)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
        .on("mouseover", (event, d) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr("r", 10)
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.25))");
          
          tooltip
            .style("visibility", "visible")
            .html(`
              <div style="font-weight: bold; margin-bottom: 8px; color: ${colorScale('Male')}; font-size: 14px;">Male Employment</div>
              <div style="margin-bottom: 4px;"><strong>Year:</strong> ${d.year}</div>
              <div style="margin-bottom: 4px;"><strong>Count:</strong> ${d3.format(",")(d.male)}</div>
            `);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("top", (event.pageY - 15) + "px")
            .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseout", (event) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr("r", 8)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))");
          
          tooltip.style("visibility", "hidden");
        });
    }

    // Enhanced data points for female
    if (femaleLineData.length > 0) {
      g.selectAll(".dot-female")
        .data(femaleLineData)
        .enter().append("circle")
        .attr("class", "dot-female")
        .attr("cx", d => xScale(d.year)!)
        .attr("cy", d => yScale(d.female))
        .attr("r", 8)
        .style("fill", colorScale('Female'))
        .style("stroke", "#ffffff")
        .style("stroke-width", 3)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))")
        .on("mouseover", (event, d) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr("r", 10)
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.25))");
          
          tooltip
            .style("visibility", "visible")
            .html(`
              <div style="font-weight: bold; margin-bottom: 8px; color: ${colorScale('Female')}; font-size: 14px;">Female Employment</div>
              <div style="margin-bottom: 4px;"><strong>Year:</strong> ${d.year}</div>
              <div style="margin-bottom: 4px;"><strong>Count:</strong> ${d3.format(",")(d.female)}</div>
            `);
        })
        .on("mousemove", (event) => {
          tooltip
            .style("top", (event.pageY - 15) + "px")
            .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseout", (event) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr("r", 8)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.15))");
          
          tooltip.style("visibility", "hidden");
        });
    }

    // Enhanced axes with styling
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format("d"))
      .tickSize(-chartHeight)
      .tickPadding(10);

    const xAxisGroup = g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis);

    xAxisGroup.selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#4b5563");

    xAxisGroup.selectAll("path, line")
      .style("stroke", "#e5e7eb")
      .style("stroke-width", 1);

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => d3.format("~s")(d))
      .tickSize(-chartWidth)
      .tickPadding(10);

    const yAxisGroup = g.append("g").call(yAxis);

    yAxisGroup.selectAll("text")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#4b5563");

    yAxisGroup.selectAll("path, line")
      .style("stroke", "#e5e7eb")
      .style("stroke-width", 1);

    // Enhanced axis labels
    g.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 45)
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "#374151")
      .text("Year");

    g.append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -50)
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", "#374151")
      .text("Number of employed persons");

    // Enhanced legend with modern styling
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth + 20}, 20)`);

    const legendData = [
      { label: "Male", color: colorScale('Male') },
      { label: "Female", color: colorScale('Female') }
    ];

    const legendItems = legend.selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 30})`);

    legendItems.append("circle")
      .attr("cx", 8)
      .attr("cy", 8)
      .attr("r", 8)
      .attr("fill", d => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.1))");

    legendItems.append("text")
      .attr("x", 24)
      .attr("y", 8)
      .attr("dy", "0.35em")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("fill", "#374151")
      .text(d => d.label);

    // Enhanced chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(`Gender Employment Disparity in ${data.countryName}`);

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.gender-chart-tooltip').remove();
    };

  }, [data, width, height]);

  if (!data && width > 0 && height > 0) {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("fill", "#6b7280")
      .text("No data available for this country.");
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default GenderDisparityLineChart;

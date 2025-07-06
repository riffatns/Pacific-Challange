// src/dataviz/AgeCompositionBarChart.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CountryAgeSpecificEmploymentData } from '../lib/types';

interface AgeCompositionBarChartProps {
  data: CountryAgeSpecificEmploymentData | null;
  width: number;
  height: number;
}

interface TooltipData {
  x: number;
  y: number;
  ageGroup: string;
  fullTime: number;
  partTime: number;
  total: number;
  type: 'full-time' | 'part-time';
}

const MARGIN = { top: 50, right: 140, bottom: 60, left: 120 };

const AgeCompositionBarChart: React.FC<AgeCompositionBarChartProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current || width <= 0 || height <= 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Process data - sort age groups logically and prepare for diverging chart
    const processedData = data.ageCompositions
      .filter(d => d.fullTime > 0 || d.partTime > 0)
      .sort((a, b) => {
        // Sort age groups in logical order
        const ageOrder = ['15-24 years', '25-54 years', '55-64 years', '65-99 years'];
        return ageOrder.indexOf(a.ageGroup) - ageOrder.indexOf(b.ageGroup);
      });

    // Find the maximum value to create symmetric scale
    const maxValue = Math.max(...processedData.map(d => Math.max(d.fullTime, d.partTime)));
    const scaleMax = maxValue * 1.1; // Add some padding

    // Scales
    const yScale = d3.scaleBand()
      .domain(processedData.map(d => d.ageGroup))
      .range([0, chartHeight])
      .padding(0.3);

    // X scale for values (symmetric around 0)
    const xScale = d3.scaleLinear()
      .domain([-scaleMax, scaleMax])
      .range([0, chartWidth]);

    // Modern color palette - consistent with other charts
    const fullTimeColor = "#3b82f6"; // Bright blue for full-time
    const partTimeColor = "#f59e0b"; // Amber for part-time
    const fullTimeHover = "#1d4ed8"; // Darker blue for hover
    const partTimeHover = "#d97706"; // Darker amber for hover

    // Add background with subtle gradient
    g.append("rect")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("fill", "url(#backgroundGradient)")
      .attr("rx", 8);

    // Define gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "backgroundGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f8fafc")
      .attr("stop-opacity", 0.3);
    
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f1f5f9")
      .attr("stop-opacity", 0.1);

    // Add subtle grid lines with better styling
    const gridLines = g.append("g").attr("class", "grid");
    
    // Vertical grid lines
    const xTicks = xScale.ticks(8);
    gridLines.selectAll(".grid-line")
      .data(xTicks.filter(d => d !== 0))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", -5)
      .attr("y2", chartHeight + 5)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1)
      .attr("opacity", 0.6);

    // Add center line (0 line) with better styling
    g.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", -5)
      .attr("y2", chartHeight + 5)
      .attr("stroke", "#475569")
      .attr("stroke-width", 2)
      .attr("opacity", 0.8);

    // Create bars for full-time employment (left side) with animation
    const fullTimeBars = g.selectAll(".fulltime-bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "fulltime-bar")
      .attr("x", xScale(0))
      .attr("y", d => yScale(d.ageGroup)!)
      .attr("width", 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", fullTimeColor)
      .attr("rx", 6)
      .style("filter", "drop-shadow(0 2px 8px rgba(59, 130, 246, 0.15))")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", fullTimeHover)
          .style("filter", "drop-shadow(0 4px 16px rgba(59, 130, 246, 0.25))");
        
        const rect = this.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          setTooltip({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top,
            ageGroup: d.ageGroup,
            fullTime: d.fullTime,
            partTime: d.partTime,
            total: d.fullTime + d.partTime,
            type: 'full-time'
          });
        }
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", fullTimeColor)
          .style("filter", "drop-shadow(0 2px 8px rgba(59, 130, 246, 0.15))");
        setTooltip(null);
      });

    // Animate full-time bars
    fullTimeBars
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .ease(d3.easeBackOut.overshoot(1.1))
      .attr("x", d => xScale(-d.fullTime))
      .attr("width", d => xScale(0) - xScale(-d.fullTime));

    // Create bars for part-time employment (right side) with animation
    const partTimeBars = g.selectAll(".parttime-bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "parttime-bar")
      .attr("x", xScale(0))
      .attr("y", d => yScale(d.ageGroup)!)
      .attr("width", 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", partTimeColor)
      .attr("rx", 6)
      .style("filter", "drop-shadow(0 2px 8px rgba(245, 158, 11, 0.15))")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", partTimeHover)
          .style("filter", "drop-shadow(0 4px 16px rgba(245, 158, 11, 0.25))");
        
        const rect = this.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          setTooltip({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top,
            ageGroup: d.ageGroup,
            fullTime: d.fullTime,
            partTime: d.partTime,
            total: d.fullTime + d.partTime,
            type: 'part-time'
          });
        }
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("fill", partTimeColor)
          .style("filter", "drop-shadow(0 2px 8px rgba(245, 158, 11, 0.15))");
        setTooltip(null);
      });

    // Animate part-time bars
    partTimeBars
      .transition()
      .duration(800)
      .delay((d, i) => i * 100 + 200)
      .ease(d3.easeBackOut.overshoot(1.1))
      .attr("width", d => xScale(d.partTime) - xScale(0));

    // Add value labels on bars with improved styling
    const fullTimeLabels = g.selectAll(".fulltime-label")
      .data(processedData)
      .enter()
      .append("text")
      .attr("class", "fulltime-label")
      .attr("x", d => xScale(-d.fullTime) - 12)
      .attr("y", d => yScale(d.ageGroup)! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#1e40af")
      .style("opacity", 0);

    // Animate full-time labels
    fullTimeLabels
      .transition()
      .duration(600)
      .delay((d, i) => i * 100 + 400)
      .style("opacity", 1)
      .text(d => d3.format(",.0f")(d.fullTime));

    const partTimeLabels = g.selectAll(".parttime-label")
      .data(processedData)
      .enter()
      .append("text")
      .attr("class", "parttime-label")
      .attr("x", d => xScale(d.partTime) + 12)
      .attr("y", d => yScale(d.ageGroup)! + yScale.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#b45309")
      .style("opacity", 0);

    // Animate part-time labels
    partTimeLabels
      .transition()
      .duration(600)
      .delay((d, i) => i * 100 + 600)
      .style("opacity", 1)
      .text(d => d3.format(",.0f")(d.partTime));

    // Y-axis (age groups) with improved styling
    const yAxis = g.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickSize(0));
    
    yAxis.selectAll("text")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("fill", "#1f2937");
    
    yAxis.selectAll("path, line")
      .style("stroke", "none");

    // X-axis (values) with improved styling
    const xAxis = g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .ticks(8)
        .tickFormat((d) => d === 0 ? "0" : d3.format(",.0f")(Math.abs(d as number)))
        .tickSize(6));
    
    xAxis.selectAll("text")
      .style("font-size", "11px")
      .style("font-weight", "500")
      .style("fill", "#4b5563");
    
    xAxis.selectAll("path")
      .style("stroke", "#d1d5db")
      .style("stroke-width", 1);
    
    xAxis.selectAll("line")
      .style("stroke", "#d1d5db")
      .style("stroke-width", 1);

    // Axis labels with better positioning
    g.append("text")
      .attr("class", "x-axis-label")
      .attr("text-anchor", "middle")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 45)
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("fill", "#374151")
      .text("Number of Workers");

    // Left and right side labels with improved styling
    g.append("text")
      .attr("class", "left-label")
      .attr("text-anchor", "middle")
      .attr("x", xScale(-scaleMax * 0.5))
      .attr("y", -25)
      .style("font-size", "14px")
      .style("font-weight", "700")
      .style("fill", fullTimeColor)
      .style("opacity", 0)
      .text("← Full-time Employment")
      .transition()
      .duration(600)
      .delay(800)
      .style("opacity", 1);

    g.append("text")
      .attr("class", "right-label")
      .attr("text-anchor", "middle")
      .attr("x", xScale(scaleMax * 0.5))
      .attr("y", -25)
      .style("font-size", "14px")
      .style("font-weight", "700")
      .style("fill", partTimeColor)
      .style("opacity", 0)
      .text("Part-time Employment →")
      .transition()
      .duration(600)
      .delay(1000)
      .style("opacity", 1);

    // Enhanced legend with modern styling
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth + 30}, 30)`);

    const legendData = [
      { label: "Full-time", color: fullTimeColor, description: "Workers employed full-time" },
      { label: "Part-time", color: partTimeColor, description: "Workers employed part-time" }
    ];

    const legendItems = legend.selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 35})`)
      .style("opacity", 0);

    // Animate legend items
    legendItems
      .transition()
      .duration(400)
      .delay((d, i) => 1200 + i * 200)
      .style("opacity", 1);

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("rx", 4)
      .attr("fill", d => d.color)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    legendItems.append("text")
      .attr("x", 26)
      .attr("y", 9)
      .attr("dy", "0.35em")
      .style("font-size", "13px")
      .style("font-weight", "600")
      .style("fill", "#1f2937")
      .text(d => d.label);

    legendItems.append("text")
      .attr("x", 26)
      .attr("y", 22)
      .style("font-size", "10px")
      .style("font-weight", "400")
      .style("fill", "#6b7280")
      .text(d => d.description);

  }, [data, width, height]);

  if (!data && width > 0 && height > 0) {
    return (
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} width={width} height={height}>
          <text x={width/2} y={height/2} textAnchor="middle" fill="#6b7280" fontSize="14">
            Select a country to view age composition data.
          </text>
        </svg>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="relative">
      <svg ref={svgRef} width={width} height={height}></svg>
      
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-gradient-to-br from-gray-900 to-gray-800 text-white px-4 py-3 rounded-xl shadow-2xl text-sm z-50 transition-all duration-300 border border-gray-700"
          style={{
            left: tooltip.x - 100,
            top: tooltip.y - 100,
            transform: 'translateX(-50%)',
            minWidth: '200px'
          }}
        >
          <div className="font-bold text-blue-200 text-base mb-2">{tooltip.ageGroup}</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-6">
              <span className="text-gray-300 flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{backgroundColor: tooltip.type === 'full-time' ? '#3b82f6' : '#f59e0b'}}
                ></div>
                {tooltip.type === 'full-time' ? 'Full-time:' : 'Part-time:'}
              </span>
              <span className="font-bold text-white text-lg">
                {d3.format(",.0f")(tooltip.type === 'full-time' ? tooltip.fullTime : tooltip.partTime)}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-600">
              <div className="flex justify-between items-center gap-6">
                <span className="text-gray-300 font-medium">Total Employment:</span>
                <span className="font-bold text-yellow-300 text-lg">
                  {d3.format(",.0f")(tooltip.total)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-6 mt-1">
                <span className="text-gray-400 text-xs">
                  {tooltip.type === 'full-time' ? 'Full-time' : 'Part-time'} percentage:
                </span>
                <span className="text-gray-300 text-sm">
                  {d3.format(".1%")((tooltip.type === 'full-time' ? tooltip.fullTime : tooltip.partTime) / tooltip.total)}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

export default AgeCompositionBarChart;

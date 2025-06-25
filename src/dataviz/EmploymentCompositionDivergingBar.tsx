// src/dataviz/EmploymentCompositionDivergingBar.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EmploymentDataPoint } from '../lib/types';

interface EmploymentCompositionDivergingBarProps {
  data: EmploymentDataPoint[];
  width: number;
  height: number;
}

interface TooltipData {
  x: number;
  y: number;
  countryName: string;
  fullTime: number;
  partTime: number;
  total: number;
  year: number;
  type: 'full-time' | 'part-time';
}

const MARGIN = { top: 60, right: 120, bottom: 50, left: 150 };

const EmploymentCompositionDivergingBar: React.FC<EmploymentCompositionDivergingBarProps> = ({ 
  data, 
  width, 
  height 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || width <= 0 || height <= 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Prepare data - calculate percentages and sort by total employment
    const processedData = data
      .filter(d => d.totalEmployed > 0)
      .map(d => ({
        ...d,
        fullTimePercentage: (d.fullTime / d.totalEmployed) * 100,
        partTimePercentage: (d.partTime / d.totalEmployed) * 100,
      }))
      .sort((a, b) => b.totalEmployed - a.totalEmployed)
      .slice(0, 12); // Show top 12 countries like in the image

    // Find the maximum percentage to create symmetric scale
    const maxPercentage = Math.max(...processedData.map(d => 
      Math.max(d.fullTimePercentage, d.partTimePercentage)
    ));
    const scaleMax = Math.ceil(maxPercentage / 10) * 10; // Round up to nearest 10

    // Scales
    const yScale = d3.scaleBand()
      .domain(processedData.map(d => d.countryName))
      .range([0, chartHeight])
      .padding(0.25);

    // X scale for percentages (symmetric around 0)
    const xScale = d3.scaleLinear()
      .domain([-scaleMax, scaleMax])
      .range([0, chartWidth]);

    // Colors - matching the design in the image
    const fullTimeColor = "#1e40af"; // Darker blue for full-time
    const partTimeColor = "#f59e0b"; // Amber for part-time

    // Add center line (0% line)
    g.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", -10)
      .attr("y2", chartHeight + 10)
      .attr("stroke", "#6b7280")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");

    // Create bars for full-time employment (left side)
    const fullTimeBars = g.selectAll(".fulltime-bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "fulltime-bar")
      .attr("x", d => xScale(-d.fullTimePercentage))
      .attr("y", d => yScale(d.countryName)!)
      .attr("width", d => xScale(0) - xScale(-d.fullTimePercentage))
      .attr("height", yScale.bandwidth())
      .attr("fill", fullTimeColor)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8);
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          countryName: d.countryName,
          fullTime: d.fullTime,
          partTime: d.partTime,
          total: d.totalEmployed,
          year: d.year,
          type: 'full-time'
        });
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        setTooltip(null);
      })
      .on("mousemove", function(event) {
        setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null);
      });

    // Create bars for part-time employment (right side)
    const partTimeBars = g.selectAll(".parttime-bar")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("class", "parttime-bar")
      .attr("x", xScale(0))
      .attr("y", d => yScale(d.countryName)!)
      .attr("width", d => xScale(d.partTimePercentage) - xScale(0))
      .attr("height", yScale.bandwidth())
      .attr("fill", partTimeColor)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 0.8);
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          countryName: d.countryName,
          fullTime: d.fullTime,
          partTime: d.partTime,
          total: d.totalEmployed,
          year: d.year,
          type: 'part-time'
        });
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        setTooltip(null);
      })
      .on("mousemove", function(event) {
        setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY } : null);
      });

    // Add percentage labels on bars
    processedData.forEach(d => {
      // Full-time percentage label
      if (d.fullTimePercentage > 5) { // Only show if bar is wide enough
        g.append("text")
          .attr("x", xScale(-d.fullTimePercentage / 2))
          .attr("y", yScale(d.countryName)! + yScale.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "10px")
          .style("font-weight", "600")
          .style("fill", "white")
          .text(`${d.fullTimePercentage.toFixed(1)}%`);
      }

      // Part-time percentage label
      if (d.partTimePercentage > 5) { // Only show if bar is wide enough
        g.append("text")
          .attr("x", xScale(d.partTimePercentage / 2))
          .attr("y", yScale(d.countryName)! + yScale.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "10px")
          .style("font-weight", "600")
          .style("fill", "white")
          .text(`${d.partTimePercentage.toFixed(1)}%`);
      }

      // Total employment numbers at the right
      g.append("text")
        .attr("x", chartWidth + 10)
        .attr("y", yScale(d.countryName)! + yScale.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .style("fill", "#6b7280")
        .style("font-size", "10px")
        .text(d.totalEmployed.toLocaleString());
    });

    // Add country names on the left
    g.selectAll(".country-label")
      .data(processedData)
      .enter()
      .append("text")
      .attr("class", "country-label")
      .attr("x", -10)
      .attr("y", d => yScale(d.countryName)! + yScale.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#374151")
      .text(d => d.countryName);

    // Add grid lines for better readability
    const gridLines = [-scaleMax, -scaleMax/2, scaleMax/2, scaleMax];
    gridLines.forEach(value => {
      g.append("line")
        .attr("x1", xScale(value))
        .attr("x2", xScale(value))
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);
    });

    // X-axis with percentage labels
    const xAxisTicks = [-scaleMax, -scaleMax/2, 0, scaleMax/2, scaleMax];
    
    // Add tick lines
    g.selectAll(".x-tick")
      .data(xAxisTicks)
      .enter()
      .append("line")
      .attr("class", "x-tick")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", chartHeight)
      .attr("y2", chartHeight + 5)
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 1);

    // Add tick labels
    g.selectAll(".x-label")
      .data(xAxisTicks)
      .enter()
      .append("text")
      .attr("class", "x-label")
      .attr("x", d => xScale(d))
      .attr("y", chartHeight + 18)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#6b7280")
      .text(d => Math.abs(d) + "%");

    // Add section headers
    g.append("text")
      .attr("x", xScale(-scaleMax/2))
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", fullTimeColor)
      .text("Full-time Employment");

    g.append("text")
      .attr("x", xScale(scaleMax/2))
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "600")
      .style("fill", partTimeColor)
      .text("Part-time Employment");

    // Add arrows pointing inward (like in the image)
    g.append("path")
      .attr("d", `M ${xScale(-5)} -35 L ${xScale(-15)} -35 L ${xScale(-10)} -25 Z`)
      .attr("fill", "#6b7280");

    g.append("path")
      .attr("d", `M ${xScale(5)} -35 L ${xScale(15)} -35 L ${xScale(10)} -25 Z`)
      .attr("fill", "#6b7280");

    // Add mouseleave event to container to ensure tooltip disappears
    const handleContainerMouseLeave = () => {
      setTooltip(null);
    };

    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('mouseleave', handleContainerMouseLeave);
    }

    // Cleanup function
    return () => {
      if (containerElement) {
        containerElement.removeEventListener('mouseleave', handleContainerMouseLeave);
      }
    };

  }, [data, width, height]);

  if (!data || data.length === 0) {
    return (
      <svg ref={svgRef} width={width} height={height}>
        <text x={width/2} y={height/2} textAnchor="middle" fill="#888">
          No employment data available.
        </text>
      </svg>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <svg ref={svgRef} width={width} height={height}></svg>
      
      {/* Custom Tooltip */}
      {tooltip && (
        <div 
          className="fixed pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm z-[9999]"
          style={{ 
            left: Math.min(tooltip.x + 10, window.innerWidth - 250), 
            top: Math.max(tooltip.y - 120, 10),
            minWidth: '220px',
            maxWidth: '280px'
          }}
        >
          <div className="font-semibold text-gray-900 mb-3 text-base">{tooltip.countryName}</div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: tooltip.type === 'full-time' ? '#1e40af' : '#f59e0b' }}
              ></div>
              <span className="font-medium text-gray-700">
                {tooltip.type === 'full-time' ? 'Full-time' : 'Part-time'} Employment
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-600">
                Count:
              </div>
              <div className="font-semibold text-right">
                {(tooltip.type === 'full-time' ? tooltip.fullTime : tooltip.partTime).toLocaleString()}
              </div>
              <div className="text-gray-600">
                Percentage:
              </div>
              <div className="font-semibold text-right">
                {((tooltip.type === 'full-time' ? tooltip.fullTime : tooltip.partTime) / tooltip.total * 100).toFixed(1)}%
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">Total Employment:</div>
                <div className="font-medium text-right">{tooltip.total.toLocaleString()}</div>
                <div className="text-gray-500">Data Year:</div>
                <div className="font-medium text-right">{tooltip.year}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploymentCompositionDivergingBar;

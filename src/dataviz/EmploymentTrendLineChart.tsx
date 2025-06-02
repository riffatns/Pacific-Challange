// src/dataviz/EmploymentTrendLineChart.tsx
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { CountryTimeSeriesData, EmploymentTrendLineChartProps, TimeSeriesPoint } from '../lib/types';
import { formatSIAxis } from '../lib/d3-utils';

const MARGIN = { top: 30, right: 180, bottom: 60, left: 70 }; // Increased right margin for wider legend

const EmploymentTrendLineChart = ({
  data,
  width,
  height,
  selectedCountryCodes = [],
}: EmploymentTrendLineChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // State for tracking country visibility (to support hiding/showing individual countries)
  const [hiddenCountries, setHiddenCountries] = useState<Set<string>>(new Set());

  const displayData = useMemo(() => {
    // First filter by selected country codes
    let filteredData = selectedCountryCodes && selectedCountryCodes.length > 0
      ? data.filter(country => selectedCountryCodes.includes(country.countryCode))
      : data;
    
    // Then exclude any manually hidden countries
    if (hiddenCountries.size > 0) {
      filteredData = filteredData.filter(country => !hiddenCountries.has(country.countryCode));
    }
    
    return filteredData;
  }, [data, selectedCountryCodes, hiddenCountries]);

  // Toggle visibility of a specific country
  const toggleCountryVisibility = (countryCode: string) => {
    setHiddenCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(countryCode)) {
        newSet.delete(countryCode);
      } else {
        newSet.add(countryCode);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // Reset hidden countries when selected countries change
    setHiddenCountries(new Set());
  }, [selectedCountryCodes]);

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

    // Extract all years and values from all countries
    const allYears = displayData.flatMap(country => country.values.map(v => v.year));
    const allValues = displayData.flatMap(country => country.values.map(v => v.value));

    if (allYears.length === 0 || allValues.length === 0) {
        // No valid data to draw
        return;
    }
    
    const [minYear, maxYear] = d3.extent(allYears) as [number, number];
    const maxValue = d3.max(allValues) || 1;

    const xScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue * 1.05]) // Add 5% padding at the top
      .range([innerHeight, 0])
      .nice();

    // Use an extended color palette since we may have many countries
    const colorScale = d3.scaleOrdinal<string>()
      .domain(displayData.map(d => d.countryCode))
      .range([...d3.schemeCategory10, ...d3.schemeSet2, ...d3.schemePaired, ...d3.schemeTableau10].slice(0, 30));

    // Create line generator with better interpolation for missing data
    const lineGenerator = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX); // Use monotone curve for smoother lines that pass through all points

    // Tooltip Element
    let tooltip = d3.select<HTMLDivElement, unknown>(`#tooltip-linechart`);
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
        .attr("id", "tooltip-linechart")
        .attr("class", "tooltip absolute p-2 text-xs bg-opacity-80 bg-white border border-gray-300 rounded shadow-lg pointer-events-none z-10")
        .style("visibility", "hidden");
    }

    // For clearer visualization with many lines, apply a thin transparent stroke first
    displayData.forEach((country) => {
      // Ensure data is sorted by year
      const sortedValues = [...country.values].sort((a, b) => a.year - b.year);
      
      // Draw thicker transparent line as background for better visibility
      chartGroup.append('path')
        .datum(sortedValues)
        .attr('fill', 'none')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 4)
        .attr('stroke-opacity', 0.5)
        .attr('d', lineGenerator);
        
      // Draw actual colored line
      chartGroup.append('path')
        .datum(sortedValues)
        .attr('fill', 'none')
        .attr('stroke', colorScale(country.countryCode))
        .attr('stroke-width', 2)
        .attr('d', lineGenerator)
        .attr('class', `line line-${country.countryCode}`)
        .on("mouseover", function (event) {
          // Dim all lines
          d3.selectAll(`.line`).style('opacity', '0.2');
          // Highlight this line
          d3.select(this).style('opacity', '1').attr('stroke-width', '3');
          
          tooltip.style("visibility", "visible")
                 .html(`<b>${country.countryName}</b>`)
                 .style("top", (event.pageY - 25) + "px")
                 .style("left", (event.pageX + 10) + "px")
                 .style("background-color", colorScale(country.countryCode))
                 .style("color", "white");
        })
        .on("mouseout", function () {
          // Restore all lines
          d3.selectAll(`.line`).style('opacity', '1').attr('stroke-width', '2');
          tooltip.style("visibility", "hidden");
        });
        
      // Add data points as circles for better visibility
      chartGroup.selectAll(`.dot-${country.countryCode}`)
        .data(sortedValues)
        .enter()
        .append('circle')
        .attr('class', `dot-${country.countryCode}`)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.value))
        .attr('r', 3)
        .attr('fill', colorScale(country.countryCode))
        .style('opacity', 0.7);
    });

    // X axis with year labels
    const xAxis = d3.axisBottom(xScale)
                  .ticks(Math.min(maxYear - minYear + 1, 10))
                  .tickFormat(d3.format("d"));
    
    chartGroup.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .append("text")
        .attr("y", MARGIN.bottom - 20)
        .attr("x", innerWidth / 2)        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("class", "text-sm")
        .text("Year");

    // Y axis with formatted numbers
    const yAxis = d3.axisLeft(yScale)
                  .ticks(5)
                  .tickFormat(formatSIAxis);
                  
    chartGroup.append('g')
      .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -MARGIN.left + 20)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("class", "text-sm")
        .text("Number of Workers");

    // Create a scrollable legend for many countries
    const legendContainerHeight = Math.min(innerHeight, 380); // Increased max height for more countries
    
    const legendContainer = chartGroup.append('g')
      .attr('class', 'legend-container')
      .attr('transform', `translate(${innerWidth + 10}, 0)`);
      
    // Background for the legend for better readability
    legendContainer.append('rect')
      .attr('x', -5)
      .attr('y', -5)
      .attr('width', MARGIN.right - 10)
      .attr('height', legendContainerHeight + 10)
      .attr('fill', 'white')
      .attr('opacity', 0.7)
      .attr('rx', 5);
      
    // Calculate if we need to show scrollable legend for too many countries
    const hasScrollableLegend = displayData.length > 15;
    const legendItemHeight = 18; // Height of each legend item
    const visibleLegendItems = hasScrollableLegend ? 
      Math.floor(legendContainerHeight / legendItemHeight) :
      displayData.length;
      
    const legend = legendContainer.selectAll('.legend-line')
      .data(displayData)
      .enter()
      .append('g')
      .attr('class', 'legend-line')
      .attr('transform', (d, i) => `translate(0, ${i * legendItemHeight})`)
      // Hide items that would overflow the container
      .attr('opacity', (d, i) => i < visibleLegendItems ? 1 : hasScrollableLegend ? 0 : 1);

    // Color box for each legend item
    legend.append('rect')
      .attr('x', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', d => colorScale(d.countryCode));

    // Legend text with country name and interactivity
    legend.append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('text-anchor', 'start')
      .style('cursor', 'pointer')
      .text(d => d.countryName.length > 18 ? d.countryName.substring(0, 16) + "..." : d.countryName)
      .on('mouseover', function(event, d) {
        // Dim all lines
        d3.selectAll(`.line`).style('opacity', '0.2');
        // Highlight this line
        d3.select(`.line-${d.countryCode}`).style('opacity', '1').attr('stroke-width', '3');
        // Highlight the dots
        d3.selectAll(`.dot-${d.countryCode}`).attr('r', 4).style('opacity', '1');
      })
      .on('mouseout', function() {
        // Restore all lines
        d3.selectAll(`.line`).style('opacity', '1').attr('stroke-width', '2');
        // Reset dots
        d3.selectAll(`circle[class^="dot-"]`).attr('r', 3).style('opacity', 0.7);
      })
      .on('click', function(event, d) {
        // Toggle visibility of this country
        toggleCountryVisibility(d.countryCode);
      });
        // Add title for the legend
    legendContainer.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Countries (click to hide)');
    
    // If we have many countries, add page indicators for the legend
    if (hasScrollableLegend) {
      // Add "scroll indication" text
      legendContainer.append('text')
        .attr('x', MARGIN.right / 2)
        .attr('y', legendContainerHeight + 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#666')
        .text(`Showing ${visibleLegendItems} of ${displayData.length} countries`);
    }
      
    return () => {
      // Tooltip will be reused, no need to remove
    };

  }, [displayData, width, height, toggleCountryVisibility]);
  if (width === 0 || height === 0) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Waiting for container size...</div>;
  }
  if (displayData.length === 0 && data.length > 0 && selectedCountryCodes && selectedCountryCodes.length > 0){
      return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">No data for the selected countries.</div>;
  }
  if (displayData.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">No trend data to display.</div>;
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};

export default EmploymentTrendLineChart;
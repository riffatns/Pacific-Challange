// src/dataviz/EmploymentTrendLineChart.tsx
import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { CountryTimeSeriesData, EmploymentTrendLineChartProps, TimeSeriesPoint } from '../lib/types';
import { formatSIAxis } from '../lib/d3-utils';

const MARGIN = { top: 60, right: 180, bottom: 60, left: 70 }; // Increased top margin to avoid filter overlap

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
    // Reset hidden countries when data or selected countries change
    setHiddenCountries(new Set());
  }, [selectedCountryCodes, data]);

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

    // Enhanced color palette matching bubble chart
    const colorScale = d3.scaleOrdinal<string>()
      .domain(displayData.map(d => d.countryCode))
      .range([
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
        '#14b8a6', '#f472b6', '#8b5a2b', '#6366f1', '#dc2626',
        '#059669', '#d97706', '#7c3aed', '#0891b2', '#ea580c'
      ]);

    // Enhanced line generator with smooth curves
    const lineGenerator = d3.line<TimeSeriesPoint>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveCardinal.tension(0.3)); // Smoother curves with tension

    // Enhanced tooltip styling - matching bubble chart
    let tooltip = d3.select<HTMLDivElement, unknown>(`#tooltip-linechart`);
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
        .attr("id", "tooltip-linechart")
        .attr("class", "tooltip")
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
    }

    // Add subtle grid lines for better readability
    const xGridGroup = chartGroup.append('g').attr('class', 'grid-x');
    const yGridGroup = chartGroup.append('g').attr('class', 'grid-y');

    // X grid lines
    xGridGroup
      .selectAll('.grid-line-x')
      .data(xScale.ticks(Math.min(maxYear - minYear + 1, 8)))
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.4);

    // Y grid lines
    yGridGroup
      .selectAll('.grid-line-y')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.4);

    // Enhanced line drawing with gradient effects and better styling
    displayData.forEach((country, index) => {
      // Ensure data is sorted by year
      const sortedValues = [...country.values].sort((a, b) => a.year - b.year);
      
      // Create gradient for each line
      const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", `line-gradient-${country.countryCode}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", innerWidth).attr("y2", 0);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(country.countryCode))
        .attr("stop-opacity", 0.8);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(country.countryCode))
        .attr("stop-opacity", 1);
        
      // Draw enhanced line with shadow effect
      chartGroup.append('path')
        .datum(sortedValues)
        .attr('fill', 'none')
        .attr('stroke', '#000000')
        .attr('stroke-width', 4)
        .attr('stroke-opacity', 0.1)
        .attr('d', lineGenerator)
        .attr('transform', 'translate(1,1)'); // Shadow offset
        
      // Draw main colored line with gradient
      const mainLine = chartGroup.append('path')
        .datum(sortedValues)
        .attr('fill', 'none')
        .attr('stroke', `url(#line-gradient-${country.countryCode})`)
        .attr('stroke-width', 3)
        .attr('d', lineGenerator)
        .attr('class', `line line-${country.countryCode}`)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))')
        .style('transition', 'all 0.3s ease')
        .on("mouseover", function (event) {
          // Dim all lines
          d3.selectAll(`.line`).style('opacity', '0.3');
          // Highlight this line
          d3.select(this).style('opacity', '1').attr('stroke-width', '4');
          
          tooltip.style("visibility", "visible")
                 .html(`<div style="font-weight: bold; margin-bottom: 4px;">${country.countryName}</div>
                        <div style="font-size: 11px; color: #ccc;">Click line to see details</div>`)
                 .style("top", (event.pageY - 15) + "px")
                 .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseout", function () {
          // Restore all lines
          d3.selectAll(`.line`).style('opacity', '1').attr('stroke-width', '3');
          tooltip.style("visibility", "hidden");
        });
        
      // Add enhanced data points as circles
      chartGroup.selectAll(`.dot-${country.countryCode}`)
        .data(sortedValues)
        .enter()
        .append('circle')
        .attr('class', `dot-${country.countryCode}`)
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', colorScale(country.countryCode))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .style('opacity', 0.9)
        .style('cursor', 'pointer')
        .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))')
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6)
            .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))');
          
          tooltip.style("visibility", "visible")
                 .html(`<div style="font-weight: bold; margin-bottom: 8px;">${country.countryName}</div>
                        <div style="margin-bottom: 4px;"><strong>Year:</strong> ${d.year}</div>
                        <div><strong>Employment:</strong> ${d.value.toLocaleString()}</div>`)
                 .style("top", (event.pageY - 15) + "px")
                 .style("left", (event.pageX + 15) + "px");
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 4)
            .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))');
          
          tooltip.style("visibility", "hidden");
        });
    });

    // Enhanced X axis with better styling
    const xAxis = d3.axisBottom(xScale)
                  .ticks(Math.min(maxYear - minYear + 1, 10))
                  .tickFormat(d3.format("d"));
    
    const xAxisGroup = chartGroup.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);
    
    // Style x-axis
    xAxisGroup.selectAll('.domain')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 2);
    
    xAxisGroup.selectAll('.tick line')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1);
    
    xAxisGroup.selectAll('.tick text')
      .attr('fill', '#374151')
      .attr('font-size', '12px')
      .attr('font-weight', '500');
    
    xAxisGroup.append("text")
        .attr("y", 45)
        .attr("x", innerWidth / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#374151")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .text("Year");

    // Enhanced Y axis with better styling
    const yAxis = d3.axisLeft(yScale)
                  .ticks(5)
                  .tickFormat(formatSIAxis);
                  
    const yAxisGroup = chartGroup.append('g')
      .call(yAxis);
    
    // Style y-axis
    yAxisGroup.selectAll('.domain')
      .attr('stroke', '#4b5563')
      .attr('stroke-width', 2);
    
    yAxisGroup.selectAll('.tick line')
      .attr('stroke', '#6b7280')
      .attr('stroke-width', 1);
    
    yAxisGroup.selectAll('.tick text')
      .attr('fill', '#374151')
      .attr('font-size', '12px')
      .attr('font-weight', '500');
    
    yAxisGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -innerHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#374151")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .text("Number of Workers");

    // Enhanced legend with better styling
    const legendContainerHeight = Math.min(innerHeight, 380);
    
    const legendContainer = chartGroup.append('g')
      .attr('class', 'legend-container')
      .attr('transform', `translate(${innerWidth + 15}, 0)`);
      
    // Enhanced background for the legend
    legendContainer.append('rect')
      .attr('x', -10)
      .attr('y', -15)
      .attr('width', MARGIN.right - 15)
      .attr('height', legendContainerHeight + 30)
      .attr('fill', 'white')
      .attr('opacity', 0.95)
      .attr('rx', 8)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))');
      
    // Add title for the legend with better styling
    legendContainer.append('text')
      .attr('x', 5)
      .attr('y', -2)
      .style('font-size', '13px')
      .style('font-weight', '700')
      .style('fill', '#1f2937')
      .text('Countries');
    
    legendContainer.append('text')
      .attr('x', 5)
      .attr('y', 12)
      .style('font-size', '10px')
      .style('fill', '#6b7280')
      .text('(click to toggle)');
      
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
      .attr('transform', (d, i) => `translate(0, ${25 + i * legendItemHeight})`)
      // Hide items that would overflow the container
      .attr('opacity', (d, i) => i < visibleLegendItems ? 1 : hasScrollableLegend ? 0 : 1)
      .style('cursor', 'pointer');

    // Enhanced color indicators
    legend.append('circle')
      .attr('cx', 8)
      .attr('cy', 6)
      .attr('r', 6)
      .attr('fill', d => colorScale(d.countryCode))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))');

    // Enhanced legend text with better interactivity
    legend.append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('text-anchor', 'start')
      .style('fill', '#374151')
      .text(d => d.countryName.length > 16 ? d.countryName.substring(0, 14) + "..." : d.countryName)
      .on('mouseover', function(event, d) {
        // Dim all lines
        d3.selectAll(`.line`).style('opacity', '0.3');
        // Highlight this line
        d3.select(`.line-${d.countryCode}`).style('opacity', '1').attr('stroke-width', '4');
        // Highlight the dots
        d3.selectAll(`.dot-${d.countryCode}`).attr('r', 5).style('opacity', '1');
        
        // Highlight legend item
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', 8)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25))');
        
        d3.select(this).select('text')
          .style('font-weight', '700')
          .style('fill', '#1f2937');
      })
      .on('mouseout', function() {
        // Restore all lines
        d3.selectAll(`.line`).style('opacity', '1').attr('stroke-width', '3');
        // Reset dots
        d3.selectAll(`circle[class^="dot-"]`).attr('r', 4).style('opacity', 0.9);
        
        // Reset legend item
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('r', 6)
          .style('filter', 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15))');
        
        d3.select(this).select('text')
          .style('font-weight', '500')
          .style('fill', '#374151');
      })
      .on('click', function(event, d) {
        // Toggle visibility of this country
        toggleCountryVisibility(d.countryCode);
      });
    // Enhanced scroll indication for many countries
    if (hasScrollableLegend) {
      // Add elegant "more countries" indicator
      legendContainer.append('text')
        .attr('x', MARGIN.right / 2 - 10)
        .attr('y', legendContainerHeight + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#6b7280')
        .text(`Showing ${visibleLegendItems} of ${displayData.length} countries`);
        
      legendContainer.append('text')
        .attr('x', MARGIN.right / 2 - 10)
        .attr('y', legendContainerHeight + 32)
        .attr('text-anchor', 'middle')
        .style('font-size', '9px')
        .style('fill', '#9ca3af')
        .text('Scroll to see more');
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
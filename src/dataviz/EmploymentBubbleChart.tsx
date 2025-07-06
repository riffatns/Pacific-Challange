// src/dataviz/EmploymentBubbleChart.tsx
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { EmploymentDataPoint } from '../lib/types';

interface EmploymentBubbleChartProps {
  data: EmploymentDataPoint[];
  width: number;
  height: number;
}

const MARGIN = { top: 40, right: 40, bottom: 60, left: 60 };

const EmploymentBubbleChart = ({ data, width, height }: EmploymentBubbleChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const processedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      partTimeRatio: d.totalEmployed > 0 ? (d.partTime / d.totalEmployed) * 100 : 0,
      fullTimeRatio: d.totalEmployed > 0 ? (d.fullTime / d.totalEmployed) * 100 : 0,
    }));
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || processedData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const chartWidth = width - MARGIN.left - MARGIN.right;
    const chartHeight = height - MARGIN.top - MARGIN.bottom;

    // Calculate min and max part-time ratios from the data
    const minPartTimeRatio = d3.min(processedData, d => d.partTimeRatio) || 0;
    const maxPartTimeRatio = d3.max(processedData, d => d.partTimeRatio) || 100;
    
    // Add some padding to the domain for better visualization
    const padding = (maxPartTimeRatio - minPartTimeRatio) * 0.1;
    const xDomainMin = Math.max(0, minPartTimeRatio - padding);
    const xDomainMax = Math.min(100, maxPartTimeRatio + padding);

    // Create scales - X scale now adapts to actual data range
    const xScale = d3.scaleLinear()
      .domain([xDomainMin, xDomainMax])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.totalEmployed) || 1])
      .range([chartHeight, 0]);

    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(processedData, d => d.totalEmployed) || 1])
      .range([8, 35]);

    // Enhanced color scale with better colors
    const colorScale = d3.scaleOrdinal([
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
    ]);

    // Main chart group
    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

    // Add grid lines
    const xGridGroup = chartGroup.append('g').attr('class', 'grid-x');
    const yGridGroup = chartGroup.append('g').attr('class', 'grid-y');

    // X grid lines
    xGridGroup
      .selectAll('.grid-line-x')
      .data(xScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    // Y grid lines
    yGridGroup
      .selectAll('.grid-line-y')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    // Add quadrant labels - adapt to actual data range
    const quadrantLabelGroup = chartGroup.append('g').attr('class', 'quadrant-labels');
    
    // Only add labels if they make sense with the data range
    const midPoint = (xDomainMin + xDomainMax) / 2;
    
    quadrantLabelGroup
      .append('text')
      .attr('x', chartWidth * 0.25)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text(`Lower Part-time (${xDomainMin.toFixed(0)}-${midPoint.toFixed(0)}%)`);

    quadrantLabelGroup
      .append('text')
      .attr('x', chartWidth * 0.75)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text(`Higher Part-time (${midPoint.toFixed(0)}-${xDomainMax.toFixed(0)}%)`);

    // Add a reference line at the midpoint instead of fixed 50%
    chartGroup
      .append('line')
      .attr('x1', xScale(midPoint))
      .attr('x2', xScale(midPoint))
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,6')
      .attr('opacity', 0.7);

    chartGroup
      .append('text')
      .attr('x', xScale(midPoint) + 8)
      .attr('y', 18)
      .attr('fill', '#ef4444')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.3)')
      .text(`${midPoint.toFixed(1)}% Midpoint`);

    // Enhanced tooltip styling
    const tooltip = d3.select('body').append('div')
      .attr('class', 'bubble-chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(30, 30, 30, 0.9))')
      .style('color', 'white')
      .style('padding', '12px 16px')
      .style('border-radius', '12px')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('z-index', '9999')
      .style('box-shadow', '0 10px 25px rgba(0, 0, 0, 0.3)')
      .style('border', '1px solid rgba(255, 255, 255, 0.1)')
      .style('backdrop-filter', 'blur(10px)');

    // Add bubbles with enhanced styling
    const bubbleGroup = chartGroup.append('g').attr('class', 'bubbles');

    bubbleGroup
      .selectAll('.bubble')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('class', 'bubble')
      .attr('cx', d => xScale(d.partTimeRatio))
      .attr('cy', d => yScale(d.totalEmployed))
      .attr('r', d => sizeScale(d.totalEmployed))
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('opacity', 0.8)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))')
      .style('transition', 'all 0.3s ease')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke-width', 4)
          .attr('r', sizeScale(d.totalEmployed) * 1.1)
          .style('filter', 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25))');
        
        tooltip
          .style('visibility', 'visible')
          .html(`
            <div style="font-weight: bold; margin-bottom: 8px; color: #fff; font-size: 14px;">${d.countryName}</div>
            <div style="margin-bottom: 4px;"><strong>Total Employment:</strong> ${d.totalEmployed.toLocaleString()}</div>
            <div style="margin-bottom: 4px;"><strong>Part-time Ratio:</strong> ${d.partTimeRatio.toFixed(1)}%</div>
            <div style="margin-bottom: 4px;"><strong>Full-time:</strong> ${d.fullTime.toLocaleString()}</div>
            <div style="margin-bottom: 4px;"><strong>Part-time:</strong> ${d.partTime.toLocaleString()}</div>
            <div style="font-size: 11px; color: #ccc; margin-top: 6px; border-top: 1px solid #555; padding-top: 4px;">Year: ${d.year}</div>
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 15) + 'px')
          .style('left', (event.pageX + 15) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke-width', 3)
          .attr('r', sizeScale(d.totalEmployed))
          .style('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))');
        
        tooltip.style('visibility', 'hidden');
      });

    // Add country labels for larger bubbles
    const labelGroup = chartGroup.append('g').attr('class', 'labels');

    labelGroup
      .selectAll('.country-label')
      .data(processedData.filter(d => d.totalEmployed > (d3.max(processedData, d => d.totalEmployed) || 0) * 0.3))
      .enter()
      .append('text')
      .attr('class', 'country-label')
      .attr('x', d => xScale(d.partTimeRatio))
      .attr('y', d => yScale(d.totalEmployed) + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#1f2937')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => d.countryName.length > 8 ? d.countryName.substring(0, 8) + '...' : d.countryName);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d => `${d}%`);

    const yAxis = d3.axisLeft(yScale)
      .ticks(5)
      .tickFormat(d3.format('.2s'));

    chartGroup
      .append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .attr('color', '#4b5563');

    chartGroup
      .append('g')
      .call(yAxis)
      .attr('color', '#4b5563');

    // Add axis labels
    chartGroup
      .append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .text('Part-time Employment Ratio (%)');

    chartGroup
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .text('Total Employment');

    // Cleanup function
    return () => {
      d3.select('body').selectAll('.bubble-chart-tooltip').remove();
    };

  }, [processedData, width, height]);

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="overflow-visible"
      />
    </div>
  );
};

export default EmploymentBubbleChart;

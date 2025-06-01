// src/dataviz/EmploymentCountryComparisonBar.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { EmploymentCountryComparisonBarProps, EmploymentDataPoint } from '../lib/types';
import { formatSIAxis, wrapText } from '../lib/d3-utils'; // Impor utilitas

// Definisikan margin di sini atau impor dari file constants
const MARGIN = { top: 30, right: 30, bottom: 100, left: 150 }; // Tingkatkan left margin untuk nama negara panjang

const EmploymentCountryComparisonBar = ({ data, width, height }: EmploymentCountryComparisonBarProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0 || width === 0 || height === 0) {
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

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.countryName))
      .range([0, innerHeight])
      .padding(0.2);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.totalEmployed) || 1]) // Pastikan domain tidak nol
      .range([0, innerWidth])
      .nice();

    const colorScale = d3.scaleOrdinal<string>()
      .domain(['fullTime', 'partTime'])
      .range(['#3b82f6', '#f97316']); // Tailwind: blue-500, orange-500

    const stackGenerator = d3.stack<EmploymentDataPoint>()
      .keys(['fullTime', 'partTime']);
    const series = stackGenerator(data);

    // Tooltip Element (dibuat sekali, dikontrol visibilitasnya)
    let tooltip = d3.select<HTMLDivElement, unknown>(`#tooltip-barchart`);
    if (tooltip.empty()) {
      tooltip = d3.select("body").append("div")
        .attr("id", "tooltip-barchart")
        .attr("class", "tooltip absolute p-2 text-xs bg-white border border-gray-300 rounded shadow-lg pointer-events-none z-10")
        .style("visibility", "hidden");
    }

    chartGroup.selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", (d) => `layer-${d.key}`)
      .attr("fill", d => colorScale(d.key))
      .selectAll("rect")
      .data(d_series => d_series.map(s_val => ({ ...s_val, seriesKey: d_series.key }))) // Tambahkan seriesKey ke data rect
      .enter()
      .append("rect")
      .attr("y", d_rect => yScale(d_rect.data.countryName)!)
      .attr("x", d_rect => xScale(d_rect[0]))
      .attr("width", d_rect => Math.max(0, xScale(d_rect[1]) - xScale(d_rect[0]))) // Pastikan width tidak negatif
      .attr("height", yScale.bandwidth())
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .on("mouseover", function(event, d_rect) {
        d3.select(this).attr("opacity", 0.8);
        const seriesKeyText = d_rect.seriesKey === 'fullTime' ? 'Penuh Waktu' : 'Paruh Waktu';
        const value = d_rect[1] - d_rect[0];
        tooltip.style("visibility", "visible")
               .html(`
                  <div class="font-bold text-sm mb-1">${d_rect.data.countryName} (${d_rect.data.year})</div>
                  <div class="text-xs">
                    <span style="color:${colorScale('fullTime')}">■</span> Penuh Waktu: ${d3.format(",")(d_rect.data.fullTime)}<br/>
                    <span style="color:${colorScale('partTime')}">■</span> Paruh Waktu: ${d3.format(",")(d_rect.data.partTime)}<br/>
                    Total: ${d3.format(",")(d_rect.data.totalEmployed)}<br/>
                    <hr class="my-1"/>
                    <i>${seriesKeyText}: ${d3.format(",")(value)}</i>
                  </div>
               `)
               .style("top", (event.pageY - 10) + "px")
               .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    const xAxis = d3.axisBottom(xScale).ticks(Math.min(5, innerWidth / 80)).tickFormat(formatSIAxis);
    chartGroup.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll("text")
        .attr("transform", "translate(-10,5)rotate(-45)")
        .style("text-anchor", "end");
    
    chartGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + MARGIN.bottom - 25)
        .attr("class", "text-sm fill-gray-700")
        .text("Jumlah Pekerja");

    const yAxis = d3.axisLeft(yScale);
    chartGroup.append('g').call(yAxis)
      .selectAll<SVGTextElement, unknown>(".tick text")
      .attr("class", "text-xs")
      .call(wrapText, MARGIN.left - 10); // Wrap text untuk nama negara yang panjang

    chartGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -MARGIN.left + 15)
        .attr("x", -innerHeight / 2)
        .attr("class", "text-sm fill-gray-700")
        .text("Negara/Wilayah");
    
    // Legenda (jika masih ada ruang, jika tidak bisa diletakkan di luar SVG via HTML)
    const legendData = [
        { key: 'fullTime', label: 'Pekerja Penuh Waktu', color: colorScale('fullTime') },
        { key: 'partTime', label: 'Pekerja Paruh Waktu', color: colorScale('partTime') },
    ];
    const legend = chartGroup.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(${innerWidth - 150}, ${i * 20 - MARGIN.top + 5})`); // Posisi di kanan atas

    legend.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', d => d.color);
    legend.append('text')
        .attr('x', 18)
        .attr('y', 9)
        .text(d => d.label)
        .attr('class', 'text-xs fill-gray-600');


    // Cleanup tooltip saat komponen unmount atau data berubah (di dalam useEffect)
    return () => {
      // Tidak perlu remove tooltip jika dibuat di body dan di-reuse,
      // tapi jika dibuat dinamis di dalam SVG, maka perlu diremove.
      // Untuk tooltip di body, cukup pastikan tidak ada duplikat ID.
    };

  }, [data, width, height]); // Sertakan semua dependensi yang relevan

  // Render logic untuk state loading/error/no-data sebaiknya dihandle di page.tsx
  // Komponen chart ini fokus pada rendering SVG jika data dan ukuran valid.
  if (width === 0 || height === 0) {
      return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Menunggu ukuran kontainer...</div>;
  }
  if (!data || data.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Tidak ada data untuk ditampilkan.</div>;
  }

  return <svg ref={svgRef} width={width} height={height}></svg>;
};
export default EmploymentCountryComparisonBar;
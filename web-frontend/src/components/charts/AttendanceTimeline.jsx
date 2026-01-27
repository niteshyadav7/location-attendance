import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const AttendanceTimeline = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Prepare data
    const timelineData = data.map(d => ({
      date: new Date(d.checkInTime),
      checkIn: new Date(d.checkInTime),
      checkOut: d.checkOutTime ? new Date(d.checkOutTime) : null,
      userName: d.userName,
      status: d.status
    })).sort((a, b) => a.date - b.date);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(timelineData, d => d.date))
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain([...new Set(timelineData.map(d => d.userName))])
      .range([0, height])
      .padding(0.2);

    // Color scale
    const colorScale = d3.scaleOrdinal()
      .domain(['PRESENT', 'CHECKED_OUT', 'ON_BREAK'])
      .range(['#10b981', '#3b82f6', '#f59e0b']);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6b7280');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6b7280');

    // Add grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat('')
      );

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'white')
      .style('padding', '12px')
      .style('border-radius', '8px')
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
      .style('font-size', '13px')
      .style('z-index', '1000');

    // Add timeline bars
    svg.selectAll('.timeline-bar')
      .data(timelineData)
      .enter()
      .append('rect')
      .attr('class', 'timeline-bar')
      .attr('x', d => xScale(d.checkIn))
      .attr('y', d => yScale(d.userName))
      .attr('width', d => {
        if (d.checkOut) {
          return Math.max(xScale(d.checkOut) - xScale(d.checkIn), 2);
        }
        return 5;
      })
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.status))
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);

        tooltip
          .style('visibility', 'visible')
          .html(`
            <strong>${d.userName}</strong><br/>
            Check In: ${d.checkIn.toLocaleTimeString()}<br/>
            ${d.checkOut ? `Check Out: ${d.checkOut.toLocaleTimeString()}` : 'Still working'}<br/>
            Status: ${d.status}
          `);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1);

        tooltip.style('visibility', 'hidden');
      });

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <>
      <svg ref={svgRef}></svg>
    </>
  );
};

export default AttendanceTimeline;

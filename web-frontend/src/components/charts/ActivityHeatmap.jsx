import React, { useMemo } from 'react';
import { HeatmapCircle } from '@visx/heatmap';
import { scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';

const ActivityHeatmap = ({ data }) => {
  const width = 800;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Transform data for heatmap
  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return days.map((day, dayIndex) => ({
      bin: dayIndex,
      bins: hours.map(hour => {
        // Calculate activity count for this day/hour combination
        const count = data.filter(record => {
          const date = new Date(record.checkInTime);
          const recordDay = date.getDay();
          const recordHour = date.getHours();
          return recordDay === (dayIndex + 1) % 7 && recordHour === hour;
        }).length;

        return {
          bin: hour,
          count
        };
      })
    }));
  }, [data]);

  const maxCount = Math.max(
    ...heatmapData.flatMap(d => d.bins.map(b => b.count))
  );

  const colorScale = scaleLinear({
    domain: [0, maxCount],
    range: ['#eef2ff', '#6366f1']
  });

  const xScale = scaleLinear({
    domain: [0, 24],
    range: [0, xMax]
  });

  const yScale = scaleLinear({
    domain: [0, 7],
    range: [0, yMax]
  });

  const binWidth = xMax / 24;
  const binHeight = yMax / 7;

  return (
    <>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <HeatmapCircle
            data={heatmapData}
            xScale={d => xScale(d) ?? 0}
            yScale={d => yScale(d) ?? 0}
            colorScale={colorScale}
            radius={Math.min(binWidth, binHeight) / 2 - 2}
            gap={2}
          >
            {heatmap =>
              heatmap.map(bins =>
                bins.map(bin => (
                  <circle
                    key={`heatmap-circle-${bin.row}-${bin.column}`}
                    cx={bin.cx}
                    cy={bin.cy}
                    r={bin.r}
                    fill={bin.color}
                    opacity={bin.opacity}
                  />
                ))
              )
            }
          </HeatmapCircle>

          {/* X-axis labels (Hours) */}
          {Array.from({ length: 24 }, (_, i) => i).map(hour => (
            <text
              key={`hour-${hour}`}
              x={xScale(hour + 0.5)}
              y={yMax + 20}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
            >
              {hour}h
            </text>
          ))}

          {/* Y-axis labels (Days) */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <text
              key={`day-${day}`}
              x={-10}
              y={yScale(i + 0.5)}
              textAnchor="end"
              fontSize={12}
              fill="#6b7280"
              dominantBaseline="middle"
            >
              {day}
            </text>
          ))}
        </Group>
      </svg>
      <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
        Darker colors indicate higher activity
      </div>
    </>
  );
};

export default ActivityHeatmap;

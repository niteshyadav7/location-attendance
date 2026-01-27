import React, { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#fff',
        padding: '10px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontSize: '12px'
      }}>
        <p style={{ fontWeight: 600, color: payload[0].payload.color }}>{payload[0].name}</p>
        <p>Count: {payload[0].value}</p>
        <p>Share: {(payload[0].percent * 100).toFixed(0)}%</p>
      </div>
    );
  }
  return null;
};

const DashboardCharts = memo(({ statusData, chartData }) => {
  const totalUsers = useMemo(() => {
    return statusData.reduce((acc, curr) => acc + curr.value, 0);
  }, [statusData]);

  return (
    <div className="charts-section">
      <div className="chart-card user-dist-card">
        <h3><PieChartIcon size={20} style={{ display: 'inline', marginRight: '8px' }} /> User Status</h3>
        <div className="chart-content-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '200px', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{totalUsers}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
            </div>
          </div>
          
          {/* Custom Legend */}
          <div className="custom-legend" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statusData.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: item.color }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{item.name}</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {item.value} users ({totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <h3><TrendingUp size={20} style={{ display: 'inline', marginRight: '8px' }} /> Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData.slice(-7)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="present" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Present" 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default DashboardCharts;

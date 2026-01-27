import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WorkingHoursBar = ({ data }) => {
  // Transform data for bar chart
  const chartData = data.slice(0, 10).map(user => ({
    name: user.userName?.split(' ')[0] || 'User',
    hours: user.totalHours || 0,
    days: user.presentDays || 0
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#1f2937' }}>
            {payload[0].payload.name}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#6366f1', fontSize: '14px' }}>
            Hours: {payload[0].value}h
          </p>
          <p style={{ margin: '2px 0 0 0', color: '#10b981', fontSize: '14px' }}>
            Days: {payload[1]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="hours" 
            fill="#6366f1" 
            radius={[8, 8, 0, 0]}
            name="Working Hours"
          />
          <Bar 
            dataKey="days" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name="Present Days"
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};

export default WorkingHoursBar;

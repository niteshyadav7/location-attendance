import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  APPROVED: '#10b981',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444'
};

const MoneyDistributionPie = ({ data }) => {
  const chartData = [
    { name: 'Approved', value: data.approvedAmount, count: data.approved },
    { name: 'Pending', value: data.pendingAmount, count: data.pending },
    { name: 'Rejected', value: data.rejectedAmount, count: data.rejected }
  ].filter(item => item.value > 0);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: '700' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
            {payload[0].name}
          </p>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Amount: ₹{payload[0].value.toLocaleString()}
          </p>
          <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Count: {payload[0].payload.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name.toUpperCase()]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => `${value} (₹${entry.payload.value.toLocaleString()})`}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
};

export default MoneyDistributionPie;

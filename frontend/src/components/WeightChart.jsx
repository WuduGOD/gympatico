import React from 'react'

export default function WeightChart({ logs }) {
  if (!logs || logs.length < 2) {
    return <p style={{ color: '#666', fontStyle: 'italic', marginTop: '10px' }}>Dodaj co najmniej 2 pomiary wagi, aby wyrysować wykres progresu.</p>
  }
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date))
  const weights = sortedLogs.map(l => parseFloat(l.weight))
  const maxWeight = Math.max(...weights) + 1
  const minWeight = Math.min(...weights) - 1
  const weightRange = maxWeight - minWeight || 1

  const width = 500
  const height = 200
  const paddingX = 40
  const paddingY = 30

  const points = sortedLogs.map((log, index) => {
    const x = paddingX + (index / (sortedLogs.length - 1)) * (width - paddingX * 2)
    const y = height - paddingY - ((parseFloat(log.weight) - minWeight) / weightRange) * (height - paddingY * 2)
    return { x, y, weight: log.weight, date: new Date(log.date).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) }
  })

  const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')

  return (
    <div style={{ marginTop: '15px', backgroundColor: '#2d2d2d', padding: '15px', borderRadius: '8px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#3d3d3d" strokeDasharray="4" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#444" />
        <path d={pathD} fill="none" stroke="#ff4757" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#ff4757" stroke="#1e1e1e" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 10} fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">{p.weight}kg</text>
            <text x={p.x} y={height - 10} fill="#888" fontSize="10" textAnchor="middle">{p.date}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
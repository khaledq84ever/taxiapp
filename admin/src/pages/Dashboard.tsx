import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';

interface Stats {
  totalUsers: number;
  totalDrivers: number;
  activeDrivers: number;
  totalTrips: number;
  completedTrips: number;
  pendingApprovals: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then((r) => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading) return <div style={styles.center}>Loading...</div>;

  const cards = [
    { label: 'Total Passengers', value: stats?.totalUsers, color: '#4CAF50' },
    { label: 'Total Drivers', value: stats?.totalDrivers, color: '#2196F3' },
    { label: 'Active Drivers', value: stats?.activeDrivers, color: '#FF9800' },
    { label: 'Total Trips', value: stats?.totalTrips, color: '#9C27B0' },
    { label: 'Completed Trips', value: stats?.completedTrips, color: '#00BCD4' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals, color: '#F44336' },
    { label: 'Total Revenue (SAR)', value: stats?.totalRevenue?.toFixed(2), color: '#FFD700' },
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard</h1>
      <div style={styles.grid}>
        {cards.map((c) => (
          <div key={c.label} style={{ ...styles.card, borderTop: `4px solid ${c.color}` }}>
            <div style={styles.cardValue}>{c.value ?? 0}</div>
            <div style={styles.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardValue: { fontSize: 36, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  cardLabel: { color: '#666', fontSize: 14 },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' },
};

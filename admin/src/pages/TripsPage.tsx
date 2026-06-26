import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: '#FF9800', ACCEPTED: '#2196F3', DRIVER_ARRIVED: '#9C27B0',
  IN_PROGRESS: '#00BCD4', COMPLETED: '#4CAF50', CANCELLED: '#F44336',
};

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getTrips(page, status || undefined).then((r) => {
      setTrips(r.data.trips);
      setTotal(r.data.total);
      setLoading(false);
    });
  }, [page, status]);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a2e' }}>Trips ({total})</h1>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={styles.select}>
          <option value="">All Status</option>
          {['REQUESTED','ACCEPTED','DRIVER_ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? <div>Loading...</div> : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              {['Passenger','Driver','Pickup','Dropoff','Fare','Status','Date'].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} style={styles.row}>
                <td style={styles.td}>{t.passenger?.name || t.passenger?.phone || '-'}</td>
                <td style={styles.td}>{t.driver?.user?.name || '-'}</td>
                <td style={styles.td}>{t.pickupAddress}</td>
                <td style={styles.td}>{t.dropoffAddress}</td>
                <td style={styles.td}>{t.finalFare ?? t.fareEstimate} SAR</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: STATUS_COLORS[t.status] || '#999' }}>
                    {t.status}
                  </span>
                </td>
                <td style={styles.td}>{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={styles.pageBtn}>Previous</button>
        <span style={{ lineHeight: '36px', color: '#666' }}>Page {page}</span>
        <button disabled={trips.length < 20} onClick={() => setPage(p => p + 1)} style={styles.pageBtn}>Next</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  select: { padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  headerRow: { background: '#f5f5f5' },
  th: { padding: '14px 16px', textAlign: 'left', fontWeight: 'bold', color: '#1a1a2e', fontSize: 14 },
  row: { borderTop: '1px solid #f0f0f0' },
  td: { padding: '14px 16px', color: '#444', fontSize: 14 },
  badge: { color: '#fff', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
  pageBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', cursor: 'pointer', background: '#fff' },
};

import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => adminApi.getPendingDrivers().then((r) => { setDrivers(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await adminApi.approveDriver(id);
    load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') || undefined;
    await adminApi.rejectDriver(id, reason);
    load();
  };

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 24 }}>
        Pending Driver Approvals ({drivers.length})
      </h1>
      {drivers.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>No pending applications</div>
      ) : (
        <div>
          {drivers.map((d) => (
            <div key={d.id} style={styles.card}>
              <div style={styles.info}>
                <div style={styles.name}>{d.user.name || d.user.phone}</div>
                <div style={styles.detail}>📞 {d.user.phone}</div>
                <div style={styles.detail}>🚗 {d.carMake} {d.carModel} {d.carYear} — {d.carColor}</div>
                <div style={styles.detail}>🔢 Plate: {d.carPlate} | License: {d.licenseNumber}</div>
                <div style={styles.detail}>📅 Applied: {new Date(d.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={styles.actions}>
                <button style={styles.approveBtn} onClick={() => approve(d.id)}>Approve</button>
                <button style={styles.rejectBtn} onClick={() => reject(d.id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  detail: { color: '#666', fontSize: 14, marginBottom: 3 },
  actions: { display: 'flex', gap: 10, flexDirection: 'column' },
  approveBtn: { background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' },
  rejectBtn: { background: '#F44336', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' },
};

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: '📊 Dashboard' },
  { path: '/drivers', label: '🚗 Driver Approvals' },
  { path: '/users', label: '👥 Users' },
  { path: '/trips', label: '🗺️ Trips' },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <div style={styles.sidebar}>
      <div style={styles.logo}>🚕 TaxiApp Admin</div>
      <nav>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{ ...styles.link, ...(pathname === item.path ? styles.active : {}) }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        style={styles.logout}
        onClick={() => { localStorage.removeItem('adminToken'); window.location.href = '/login'; }}
      >
        🚪 Logout
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: { width: 240, background: '#1a1a2e', minHeight: '100vh', padding: '24px 0', display: 'flex', flexDirection: 'column' },
  logo: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', padding: '0 24px 32px' },
  link: { display: 'block', padding: '14px 24px', color: '#ccc', textDecoration: 'none', fontSize: 15, transition: 'all 0.2s' },
  active: { color: '#FFD700', background: 'rgba(255,215,0,0.1)', borderRight: '3px solid #FFD700' },
  logout: { marginTop: 'auto', background: 'none', border: '1px solid #444', color: '#ccc', margin: '24px', padding: '12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
};

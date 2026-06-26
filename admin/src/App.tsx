import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DriversPage from './pages/DriversPage';
import TripsPage from './pages/TripsPage';

const isLoggedIn = () => !!localStorage.getItem('adminToken');

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" />;
}

function LoginPage() {
  const [phone, setPhone] = React.useState('+966');
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');

  const sendOtp = async () => {
    const res = await fetch('/api/v1/auth/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (res.ok) setStep('otp');
  };

  const verify = async () => {
    const res = await fetch('/api/v1/auth/verify-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (data.accessToken && data.user.role === 'ADMIN') {
      localStorage.setItem('adminToken', data.accessToken);
      window.location.href = '/';
    } else {
      alert('Not an admin account');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#1a1a2e', marginBottom: 8 }}>🚕 TaxiApp Admin</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          {step === 'phone' ? 'Enter your admin phone number' : `Enter the code sent to ${phone}`}
        </p>
        {step === 'phone' ? (
          <>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966..." style={inputStyle} />
            <button onClick={sendOtp} style={btnStyle}>Send OTP</button>
          </>
        ) : (
          <>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} style={inputStyle} />
            <button onClick={verify} style={btnStyle}>Login</button>
            <button onClick={() => setStep('phone')} style={{ ...btnStyle, background: '#f5f5f5', color: '#666', marginTop: 8 }}>Back</button>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 10, padding: '14px', marginBottom: 12, fontSize: 16, boxSizing: 'border-box' };
const btnStyle: React.CSSProperties = { width: '100%', background: '#FFD700', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', color: '#1a1a2e' };

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute><Layout><DriversPage /></Layout></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><Layout><TripsPage /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

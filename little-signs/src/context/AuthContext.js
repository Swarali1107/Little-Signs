import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('ls_token'));
  const [loading, setLoading] = useState(true);

  // On mount — verify token still valid
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.id) setUser(data);
        else         logout();
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);   // eslint-disable-line

  const login = async (email, password) => {
    const res  = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('ls_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const res  = await fetch(`${API}/auth/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    localStorage.setItem('ls_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('ls_token');
    setToken(null);
    setUser(null);
  };

  // Authenticated fetch helper — auto-attaches Bearer token
  const authFetch = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) { logout(); throw new Error('Session expired'); }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/crm';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'aflix_crm_token';
const USER_KEY = 'aflix_crm_user';

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.BACKEND_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token validity with backend if reachable
          try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                const refreshed: User = {
                  id: data.user.id || data.user._id,
                  name: data.user.name,
                  email: data.user.email,
                  role: data.user.role,
                  avatarInitials: (data.user.name || 'User')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'U',
                };
                setUser(refreshed);
                localStorage.setItem(USER_KEY, JSON.stringify(refreshed));
              }
            } else if (res.status === 401 || res.status === 403) {
              // Stale token, clear session
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              setToken(null);
              setUser(null);
            }
          } catch {
            // Keep local session if backend is momentarily unreachable
          }
        }
      } catch (e) {
        console.error('Error loading auth from localStorage', e);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        const authUser: User = {
          id: data.user.id || data.user._id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          avatarInitials: (data.user.name || cleanEmail)
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U',
        };

        setToken(data.token);
        setUser(authUser);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: data.message || data.msg || 'Invalid email or password' };
    } catch (err) {
      console.error('Login request error:', err);
      setIsLoading(false);
      return {
        success: false,
        error: 'Unable to reach authentication server. Please ensure the backend is running.',
      };
    }
  };

  const register = async (
    formData: RegisterData
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    setIsLoading(true);
    const cleanEmail = formData.email.trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: cleanEmail,
          password: formData.password,
          role: formData.role || 'sales_rep',
          phone: formData.phone ? formData.phone.trim() : '',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsLoading(false);
        return { success: true, message: data.message || 'User registered successfully' };
      }

      setIsLoading(false);
      return { success: false, error: data.message || 'Registration failed' };
    } catch (err) {
      console.error('Registration request error:', err);
      setIsLoading(false);
      return {
        success: false,
        error: 'Unable to reach registration server. Please ensure the backend is running.',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

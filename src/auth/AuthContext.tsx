import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '@/api/auth';
import { setUnauthorizedHandler } from '@/api/client';
import type { User } from '@/types';
import { authenticateBiometric, getBiometricCapability } from './biometrics';
import {
  clearToken,
  getToken,
  isBiometricEnabled,
  setBiometricEnabled,
  setToken,
} from './secureStore';

// loading  : başlangıçta token kontrol ediliyor
// noauth   : token yok → giriş/kayıt
// locked   : token var ama biyometrik kilit açılmayı bekliyor
// ready    : kimlik doğrulandı
type Status = 'loading' | 'noauth' | 'locked' | 'ready';

interface AuthState {
  status: Status;
  user: User | null;
  biometricLabel: string;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  unlock: () => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);
  const [biometricLabel, setBiometricLabel] = useState('Biyometri');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const logout = useCallback(async () => {
    await clearToken();
    await setBiometricEnabled(false);
    setBiometricEnabledState(false);
    setUserState(null);
    setStatus('noauth');
  }, []);

  // Token geçerliyse kullanıcıyı yükle, değilse oturumu kapat.
  const loadSession = useCallback(async () => {
    try {
      const me = await authApi.fetchMe();
      setUserState(me);
      setStatus('ready');
    } catch {
      await logout();
    }
  }, [logout]);

  // 401 yakalandığında otomatik çıkış.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // İlk açılış: cihaz biyometri yeteneği + saklı token kontrolü.
  useEffect(() => {
    (async () => {
      const cap = await getBiometricCapability();
      setBiometricLabel(cap.label);
      const token = await getToken();
      if (!token) {
        setStatus('noauth');
        return;
      }
      const bioOn = (await isBiometricEnabled()) && cap.available && cap.enrolled;
      setBiometricEnabledState(bioOn);
      if (bioOn) setStatus('locked');
      else await loadSession();
    })();
  }, [loadSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setToken(res.token);
    setUserState(res.user);
    setStatus('ready');
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res = await authApi.register(email, password, fullName);
    await setToken(res.token);
    setUserState(res.user);
    setStatus('ready');
  }, []);

  // Kilit ekranında biyometri ile doğrula.
  const unlock = useCallback(async () => {
    const ok = await authenticateBiometric('Destek Mobil kilidini açın');
    if (ok) await loadSession();
    return ok;
  }, [loadSession]);

  // Ayarlardan biyometrik girişi aç — önce bir kez doğrulama ister.
  const enableBiometric = useCallback(async () => {
    const cap = await getBiometricCapability();
    if (!cap.available || !cap.enrolled) return false;
    const ok = await authenticateBiometric('Biyometrik girişi etkinleştirin');
    if (ok) {
      await setBiometricEnabled(true);
      setBiometricEnabledState(true);
    }
    return ok;
  }, []);

  const disableBiometric = useCallback(async () => {
    await setBiometricEnabled(false);
    setBiometricEnabledState(false);
  }, []);

  const setUser = useCallback((u: User) => setUserState(u), []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        biometricLabel,
        biometricEnabled,
        login,
        register,
        logout,
        unlock,
        enableBiometric,
        disableBiometric,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

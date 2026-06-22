'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDeviceId } from '@/utils/deviceId';

export interface GuestContext {
  lastBrowsePostId?: number;
  lastBrowseClubId?: number;
}

export interface AuthState {
  isLoggedIn: boolean;
  identityType: 'guest' | 'user';
  deviceId: string;
  userInfo: any | null;
  guestContext: GuestContext;
}

interface AuthContextType extends AuthState {
  loginSuccess: (result: any) => void;
  logout: () => void;
  setGuestContext: (ctx: GuestContext) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isLoggedIn: false,
    identityType: 'guest',
    deviceId: '',
    userInfo: null,
    guestContext: {},
  });

  // 初始化
  useEffect(() => {
    const deviceId = getDeviceId();
    const token = localStorage.getItem('gamden_token');
    const userStr = localStorage.getItem('gamden_user');

    setState({
      isLoggedIn: !!token,
      identityType: token ? 'user' : 'guest',
      deviceId,
      userInfo: userStr ? JSON.parse(userStr) : null,
      guestContext: {},
    });
  }, []);

  // 登录成功
  const loginSuccess = useCallback((result: any) => {
    const { token, refresh_token, user_id, territory_coord_x, territory_coord_y } = result;

    localStorage.setItem('gamden_token', token);
    localStorage.setItem('gamden_refresh_token', refresh_token);
    localStorage.setItem(
      'gamden_user',
      JSON.stringify({ user_id, territory_coord_x, territory_coord_y })
    );

    setState((prev) => ({
      ...prev,
      isLoggedIn: true,
      identityType: 'user',
      userInfo: { user_id, territory_coord_x, territory_coord_y },
    }));
  }, []);

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem('gamden_token');
    localStorage.removeItem('gamden_refresh_token');
    localStorage.removeItem('gamden_user');

    setState((prev) => ({
      ...prev,
      isLoggedIn: false,
      identityType: 'guest',
      userInfo: null,
    }));
  }, []);

  // 设置游客上下文
  const setGuestContext = useCallback((ctx: GuestContext) => {
    setState((prev) => ({
      ...prev,
      guestContext: { ...prev.guestContext, ...ctx },
    }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        loginSuccess,
        logout,
        setGuestContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

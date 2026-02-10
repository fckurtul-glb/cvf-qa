'use client';
import { createContext, useContext } from 'react';
interface AuthState { isAuthenticated: boolean; user: any; loading: boolean; }
const Ctx = createContext<AuthState>({ isAuthenticated: false, user: null, loading: true });
export function useAuth() { return useContext(Ctx); }

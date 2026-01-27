import { create } from 'zustand';
import { UserProfile, Organization } from '../types';

interface AuthState {
  user: UserProfile | null;
  organization: Organization | null; // MULTI-TENANCY: Current user's organization
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void; // MULTI-TENANCY: Set organization
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null, // MULTI-TENANCY: Initialize organization as null
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }), // MULTI-TENANCY: Set organization
  loading: true,
  setLoading: (loading) => set({ loading }),
}));


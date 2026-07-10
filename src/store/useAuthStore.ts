import { create } from 'zustand';
import { UserProfile, Organization } from '../types';

interface AuthState {
  user: UserProfile | null;
  organization: Organization | null; // MULTI-TENANCY: Current user's organization
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void; // MULTI-TENANCY: Set organization
  loading: boolean;
  setLoading: (loading: boolean) => void;
  // IMPERSONATION: Explorer Mode for Super Admin
  impersonatorUser: UserProfile | null;
  impersonatorOrganization: Organization | null;
  impersonateTenant: (targetUser: UserProfile, targetOrg: Organization) => void;
  exitImpersonation: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null, // MULTI-TENANCY: Initialize organization as null
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }), // MULTI-TENANCY: Set organization
  loading: true,
  setLoading: (loading) => set({ loading }),
  // IMPERSONATION STATE
  impersonatorUser: null,
  impersonatorOrganization: null,
  impersonateTenant: (targetUser, targetOrg) => set((state) => ({
    impersonatorUser: state.user,
    impersonatorOrganization: state.organization,
    user: { ...targetUser, role: 'company_admin' }, // Cloned profile impersonating company_admin
    organization: targetOrg,
  })),
  exitImpersonation: () => set((state) => ({
    user: state.impersonatorUser,
    organization: state.impersonatorOrganization,
    impersonatorUser: null,
    impersonatorOrganization: null,
  })),
}));


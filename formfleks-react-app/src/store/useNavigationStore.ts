import { create } from 'zustand';
import { apiClient } from '../lib/axios';

export interface FormTemplateDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  categoryName?: string;
  active: boolean;
}

interface NavigationState {
  authorizedForms: FormTemplateDto[];
  isLoading: boolean;
  isError: boolean;
  fetchAuthorizedForms: () => Promise<void>;
  clearNavigation: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  authorizedForms: [],
  isLoading: false,
  isError: false,

  fetchAuthorizedForms: async () => {
    set({ isLoading: true, isError: false });
    try {
      const { data } = await apiClient.get<FormTemplateDto[]>('/dynamic-forms/templates');
      const activeForms = Array.isArray(data) ? data : [];
      set({ authorizedForms: activeForms, isLoading: false });
    } catch {
      set({ isLoading: false, isError: true, authorizedForms: [] });
    }
  },

  clearNavigation: () => {
    set({ authorizedForms: [], isLoading: false, isError: false });
  }
}));

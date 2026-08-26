import { apiClient } from '@/lib/axios';

export interface SurveyDesignerOption {
    id: string;
    label: string;
    sortOrder: number;
}

export interface SurveyDesignerQuestion {
    id: string;
    type: number; // enum index
    title: string;
    description?: string;
    isRequired: boolean;
    sortOrder: number;
    settingsJson?: string;
    visibilityRuleJson?: string;
    options?: SurveyDesignerOption[];
}

export interface SurveyDesignerSection {
    id: string;
    title: string;
    description?: string;
    sortOrder: number;
    questions: SurveyDesignerQuestion[];
}

export interface SaveSurveyTemplatePayload {
  id: string;
  title: string;
  description: string;
  defaultIsAnonymous: boolean;
  sections: SurveyDesignerSection[];
}

export interface SurveyTemplateListDto {
  id: string;
  title: string;
  description: string;
  defaultIsAnonymous: boolean;
  versionCount: number;
  createdAt: string;
}

export const surveyDesignerService = {
  getTemplates: async (search?: string, activeOnly?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (activeOnly) params.append('activeOnly', 'true');
    const response = await apiClient.get<SurveyTemplateListDto[]>(`/admin/surveys/templates?${params.toString()}`);
    return response.data;
  },

  getTemplateDetails: async (id: string) => {
    const response = await apiClient.get<SaveSurveyTemplatePayload & { versionId: string }>(`/admin/surveys/templates/${id}/details`);
    return response.data;
  },

  createTemplate: async (title: string, description: string) => {
    const response = await apiClient.post<{ id: string }>('/admin/surveys/templates', { title, description, defaultIsAnonymous: false });
    return response.data.id;
  },

  duplicateTemplate: async (id: string) => {
    const response = await apiClient.post<{ id: string }>(`/admin/surveys/templates/${id}/duplicate`);
    return response.data.id;
  },

  deleteTemplate: async (id: string) => {
    await apiClient.delete(`/admin/surveys/templates/${id}`);
  },

  updateTemplate: async (payload: SaveSurveyTemplatePayload) => {
    return new Promise<SaveSurveyTemplatePayload & { versionId: string }>((resolve, reject) => {
      _updateQueue = _updateQueue.then(async () => {
        try {
          const response = await apiClient.put<SaveSurveyTemplatePayload & { versionId: string }>(`/admin/surveys/templates/${payload.id}`, payload);
          resolve(response.data);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
};

let _updateQueue: Promise<void> = Promise.resolve();

import { apiClient } from '@/lib/axios';

export interface SurveyFillDto {
  campaignId: string;
  campaignTitle: string;
  isAnonymous: boolean;
  configurationJson: string; // JSON string containing sections, questions, options
}

export interface SurveyAnswerDto {
  questionId: string;
  textValue?: string | null;
  numericValue?: number | null;
  selectedOptionIds?: string[] | null;
}

export interface SubmitSurveyResponsePayload {
  token: string;
  answers: SurveyAnswerDto[];
}

export interface SubmitSurveyResult {
  success: boolean;
  receiptCode: string | null;
}

export const surveyFillService = {
  getSurveyByToken: async (token: string): Promise<SurveyFillDto> => {
    const response = await apiClient.get<SurveyFillDto>(`/surveys/responses/token/${token}`);
    return response.data;
  },

  startSurvey: async (token: string): Promise<boolean> => {
    const response = await apiClient.post<boolean>(`/surveys/responses/token/${token}/start`);
    return response.data;
  },

  submitResponse: async (payload: SubmitSurveyResponsePayload): Promise<SubmitSurveyResult> => {
    const response = await apiClient.post<SubmitSurveyResult>('/surveys/responses', payload);
    return response.data;
  },

  uploadFile: async (file: File, token: string, questionId: string): Promise<{ fileId: string; fileName: string; size: number; contentType: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('token', token);
    formData.append('questionId', questionId);
    
    const response = await apiClient.post('/SurveyFiles/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

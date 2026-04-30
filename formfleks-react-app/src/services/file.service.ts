import { apiClient } from '@/lib/axios';

export type FileUploadResponse = {
  url: string;
  fileName: string;
  size: number;
};

class FileService {
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<FileUploadResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  }
}

export const fileService = new FileService();

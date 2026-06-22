import { apiClient } from '@/lib/axios';

export interface IntegrationQueryDto {
    id: string;
    name: string;
    connectionName: string;
    queryTemplate: string;
    parametersJson?: string;
    engine: number;
}

export interface IntegrationQueryUpsertDto {
    name: string;
    connectionName: string;
    queryTemplate: string;
    parametersJson?: string;
    engine: number;
}

export interface IntegrationQueryLookupDto {
    id: string;
    name: string;
    parametersJson?: string;
}

class IntegrationQueryService {
    async getAll(): Promise<IntegrationQueryDto[]> {
        const { data } = await apiClient.get<IntegrationQueryDto[]>('/IntegrationQueries');
        return data;
    }

    async getLookup(): Promise<IntegrationQueryLookupDto[]> {
        const { data } = await apiClient.get<IntegrationQueryLookupDto[]>('/IntegrationQueries/lookup');
        return data;
    }

    async getById(id: string): Promise<IntegrationQueryDto> {
        const { data } = await apiClient.get<IntegrationQueryDto>(`/IntegrationQueries/${id}`);
        return data;
    }

    async create(payload: IntegrationQueryUpsertDto): Promise<IntegrationQueryDto> {
        const { data } = await apiClient.post<IntegrationQueryDto>('/IntegrationQueries', payload);
        return data;
    }

    async update(id: string, payload: IntegrationQueryUpsertDto): Promise<IntegrationQueryDto> {
        const { data } = await apiClient.put<IntegrationQueryDto>(`/IntegrationQueries/${id}`, payload);
        return data;
    }

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/IntegrationQueries/${id}`);
    }
}

export const integrationQueryService = new IntegrationQueryService();

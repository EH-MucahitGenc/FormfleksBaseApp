import { apiClient } from '@/lib/axios';

export interface DynamicFieldSchema {
  dataField: string;
  editorType: 'text' | 'number' | 'date' | 'time' | 'datetime' | 'select' | 'textarea' | 'boolean';
  label: string;
  isRequired: boolean;
  colSpan?: number;
  lookupData?: Array<{ id: string | number; name: string }>;
}

export interface DynamicSectionSchema {
  id: string;
  title: string;
  fields: DynamicFieldSchema[];
}

export interface DynamicFormTemplateDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  sections: DynamicSectionSchema[];
}

// --- Gerçek Arka Yüz Tipleri (Backend Types) ---
export interface BackendFormFieldDto {
  fieldKey: string;
  label: string;
  fieldType: number; // 1: Text, 2: Textarea, 3: Checkbox, 4: Dropdown, 5: Date, 6: Time, 7: DateTime, 10: File
  isRequired: boolean;
  sortOrder: number;
  sectionTitle: string;
  placeholder?: string;
  optionsJson?: string; 
  active: boolean;
}

export interface BackendFormSectionDto {
  title: string;
  sortOrder: number;
}

export interface FormDefinitionDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  sections: BackendFormSectionDto[];
  fields: BackendFormFieldDto[];
}

// --- Ön Yüz Uyarlayıcıları (Frontend Adapters) ---

/**
 * @service DynamicFormService
 * @description Dinamik form şablonlarının getirilmesi, taslak kaydedilmesi ve form taleplerinin onaya sunulması işlemlerini yöneten servis sınıfı.
 * Arka yüz (Backend) veri modellerini, ön yüz (Frontend) UI bileşenlerinin beklediği yapıya çeviren Adapter metodlarını (mapBackendToFrontend) barındırır.
 */
class DynamicFormService {
  async getTemplateByCode(code: string): Promise<DynamicFormTemplateDto> {
    const { data } = await apiClient.get<FormDefinitionDto>(`/dynamic-forms/${code}`);
    return this.mapBackendToFrontend(data);
  }

  async saveDraftFormData(formTypeId: string, payload: any, draftId?: string): Promise<{ requestId: string; currentStepNo: number; status: number; concurrencyToken: string }> {
    const values = Object.keys(payload).map(key => {
      const val = payload[key];
      if (val === undefined || val === null || val === '') return null;
      
      let mapped = { fieldKey: key, valueText: null as string | null, valueNumber: null as number | null, valueBool: null as boolean | null };
      
      if (typeof val === 'boolean') {
        mapped.valueBool = val;
      } else if (typeof val === 'number') {
        mapped.valueNumber = val;
      } else if (typeof val === 'object') {
        mapped.valueText = JSON.stringify(val);
      } else {
        mapped.valueText = val;
      }
      return mapped;
    }).filter(x => x !== null);

    const { data } = await apiClient.post(`/dynamic-forms/requests/draft`, {
       requestId: draftId || null,
       formTypeId: formTypeId,
       values: values
    });
    return data;
  }

  async submitDraft(requestId: string): Promise<void> {
    await apiClient.post(`/dynamic-forms/requests/submit`, {
       requestId: requestId
    });
  }

  private mapBackendToFrontend(dto: any): DynamicFormTemplateDto {
    if (!dto) return null as any;

    const dtoId = dto.id || dto.Id || dto.formTypeId || dto.FormTypeId || '';
    const dtoCode = dto.code || dto.Code || '';
    const dtoName = dto.name || dto.Name || '';
    const dtoDesc = dto.description || dto.Description || '';
    const rawSections = dto.sections || dto.Sections || [];

    const parsedSections: DynamicSectionSchema[] = [];

    rawSections.forEach((sec: any, sIdx: number) => {
      const sectionId = sec.sectionId || sec.SectionId || `sec_${sIdx}`;
      const title = sec.title || sec.Title || 'Genel Bilgiler';
      const rawFields = sec.fields || sec.Fields || [];

      const parsedFields: DynamicFieldSchema[] = [];

      rawFields.forEach((f: any) => {
         const fieldType = f.fieldType || f.FieldType || 1;
         const fieldKey = f.key || f.Key || f.fieldKey || f.FieldKey || `field_${Math.random().toString(36).substr(2, 5)}`;
         const label = f.label || f.Label || fieldKey;
         const isRequired = f.isRequired || f.IsRequired || false;
         const optionsJson = f.optionsJson || f.OptionsJson;

         let editorType: DynamicFieldSchema['editorType'] = 'text';
         let lookupData;

         switch(fieldType) {
           case 1: editorType = 'text'; break;
           case 2: editorType = 'textarea'; break;
           case 3: editorType = 'boolean'; break;
           case 4: 
             editorType = 'select'; 
             if (optionsJson) {
               try {
                 const parsed = JSON.parse(optionsJson);
                 if (Array.isArray(parsed)) {
                   lookupData = parsed.map((item, i) => {
                     if (typeof item === 'string') return { id: item, name: item };
                     const id = item.id || item.Id !== undefined ? item.Id : i;
                     const name = item.name || item.Name || item.text || item.Text || item.value || item.Value || JSON.stringify(item);
                     return { id, name };
                   });
                 } else if (typeof parsed === 'object') {
                     lookupData = Object.keys(parsed).map(k => ({ id: k, name: parsed[k] }));
                 }
               } catch {
                 lookupData = optionsJson.split(',').map((s: string) => ({ id: s.trim(), name: s.trim() }));
               }
             }
             break;
           case 5: editorType = 'date'; break;
           case 6: editorType = 'time'; break;
           case 7: editorType = 'datetime'; break; 
           case 10: editorType = 'text'; break; // File
         }

         parsedFields.push({
           dataField: fieldKey,
           label: label,
           isRequired: isRequired,
           colSpan: editorType === 'textarea' ? 2 : 1,
           editorType,
           lookupData
         });
      });

      parsedSections.push({
        id: sectionId,
        title: title,
        fields: parsedFields
      });
    });

    const res = {
      id: dtoId,
      code: dtoCode,
      name: dtoName,
      description: dtoDesc,
      sections: parsedSections
    };
    
    console.log("Mapped Nested Form Schema:", res);
    return res;
  }
}

export const dynamicFormService = new DynamicFormService();

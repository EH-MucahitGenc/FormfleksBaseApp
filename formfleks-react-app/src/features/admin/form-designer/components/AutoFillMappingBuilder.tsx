import React, { useEffect, useState } from 'react';
import { integrationQueryService, type IntegrationQueryDto } from '@/services/integration-query.service';
import { integrationsService } from '@/services/integrations.service';
import { FfButton } from '@/components/ui/index';
import SelectBox from 'devextreme-react/select-box';
import { Play, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import notify from 'devextreme/ui/notify';

export interface FormFieldOption {
  id: string;
  label: string;
}

interface AutoFillMappingBuilderProps {
  settings: any;
  onChange: (newSettings: any) => void;
  availableFields: FormFieldOption[];
}

export const AutoFillMappingBuilder: React.FC<AutoFillMappingBuilderProps> = ({
  settings,
  onChange,
  availableFields
}) => {
  const [queryDef, setQueryDef] = useState<IntegrationQueryDto | null>(null);
  const [sqlParams, setSqlParams] = useState<string[]>([]);
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [outputColumns, setOutputColumns] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Parse SQL parameters when query is loaded
  useEffect(() => {
    if (settings.queryId) {
      integrationQueryService.getById(settings.queryId).then(q => {
        setQueryDef(q);
        // Extract :PARAM or @PARAM
        const matches = q.queryTemplate.match(/(?<!\w)[:@]([a-zA-Z0-9_]+)/g);
        if (matches) {
           // Remove prefix
           const params = Array.from(new Set(matches.map(m => m.substring(1))));
           setSqlParams(params);
           
           // Initialize mappings if empty
           const currentMappings = settings.inputMappings || {};
           const newMappings = { ...currentMappings };
           let changed = false;
           params.forEach(p => {
              if (newMappings[p] === undefined) {
                 newMappings[p] = "";
                 changed = true;
              }
           });
           if (changed) {
              onChange({ ...settings, inputMappings: newMappings });
           }
        } else {
           setSqlParams([]);
        }
      }).catch(err => {
         console.error("Failed to load query", err);
      });
    } else {
      setQueryDef(null);
      setSqlParams([]);
    }
  }, [settings.queryId]);

  const handleInputMappingChange = (paramName: string, fieldId: string) => {
    const newMappings = { ...(settings.inputMappings || {}) };
    if (fieldId) {
      newMappings[paramName] = fieldId;
    } else {
      delete newMappings[paramName];
    }
    onChange({ ...settings, inputMappings: newMappings });
  };

  const handleTestQuery = async () => {
    if (!settings.queryId) return;
    setIsTesting(true);
    setTestSuccess(false);
    try {
      const results = await integrationsService.executeIntegrationQuery(settings.queryId, testValues);
      const firstResult = Array.isArray(results) ? results[0] : results;
      
      if (firstResult && typeof firstResult === 'object') {
        const cols = Object.keys(firstResult);
        setOutputColumns(cols);
        setTestSuccess(true);
        notify("Test başarılı, kolonlar çekildi.", "success", 2000);
      } else {
        notify("Sorgu boş döndü, kolonlar çekilemedi.", "warning", 3000);
      }
    } catch (e: any) {
      console.error(e);
      notify(e.response?.data?.message || "Test sorgusu çalıştırılırken hata oluştu.", "error", 4000);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddOutputMapping = () => {
     const currentOutputs = Array.isArray(settings.outputMappings) ? [...settings.outputMappings] : [];
     currentOutputs.push({ sourceKey: "", targetFieldKey: "" });
     onChange({ ...settings, outputMappings: currentOutputs });
  };

  const handleUpdateOutputMapping = (index: number, field: 'sourceKey' | 'targetFieldKey', value: string) => {
     const currentOutputs = Array.isArray(settings.outputMappings) ? [...settings.outputMappings] : [];
     currentOutputs[index][field] = value;
     onChange({ ...settings, outputMappings: currentOutputs });
  };

  const handleRemoveOutputMapping = (index: number) => {
     const currentOutputs = Array.isArray(settings.outputMappings) ? [...settings.outputMappings] : [];
     currentOutputs.splice(index, 1);
     onChange({ ...settings, outputMappings: currentOutputs });
  };

  const currentInputMappings = settings.inputMappings || {};
  const currentOutputMappings = Array.isArray(settings.outputMappings) ? settings.outputMappings : [];

  return (
    <div className="space-y-6 text-sm">
       {/* INPUT MAPPINGS */}
       <div className="bg-brand-gray/10 rounded p-4">
          <h4 className="font-semibold text-brand-dark mb-3 flex items-center">
             1. Girdi (Parametre) Eşleştirmesi
          </h4>
          <p className="text-xs text-brand-gray mb-4">
             Sorgunun çalışması için gereken parametreleri formunuzdaki alanlarla eşleştirin. 
             Eşleştirilen alanların <b>tümü</b> doldurulduğunda sorgu otomatik çalışır.
          </p>

          {!queryDef && (
             <div className="text-center py-4 text-brand-gray italic">Sorgu yükleniyor...</div>
          )}

          {queryDef && sqlParams.length === 0 && (
             <div className="text-brand-success bg-brand-success/10 p-3 rounded">
                Bu sorgu hiçbir dış parametre almıyor. Direkt çalıştırılabilir.
             </div>
          )}

          {sqlParams.length > 0 && (
             <div className="space-y-3">
                {sqlParams.map(param => (
                   <div key={param} className="flex items-center gap-3">
                      <div className="w-1/3 bg-white border border-brand-gray/30 p-2 rounded text-xs font-mono font-medium truncate" title={param}>
                         {param}
                      </div>
                      <div className="text-brand-gray">=</div>
                      <div className="w-2/3">
                         <SelectBox
                            dataSource={availableFields}
                            displayExpr="label"
                            valueExpr="id"
                            value={currentInputMappings[param] || null}
                            onValueChanged={(e) => handleInputMappingChange(param, e.value)}
                            placeholder="Form alanı seçin..."
                            searchEnabled={true}
                            showClearButton={true}
                         />
                      </div>
                   </div>
                ))}
             </div>
          )}
       </div>

       {/* TEST QUERY SECTION */}
       {queryDef && sqlParams.length > 0 && (
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded p-4">
             <h4 className="font-semibold text-brand-primary mb-3">Çıktı Kolonlarını Getir (Test)</h4>
             <p className="text-xs text-brand-gray mb-4">
                Sonuç eşleştirmesinde çıktı kolonlarını (Örn: ADSOYAD) elle yazmamak için 
                buraya geçici test değerleri girip çalıştırın. Dönen kolonlar listeye eklenecektir.
             </p>
             <div className="grid grid-cols-2 gap-3 mb-4">
                {sqlParams.map(param => (
                   <div key={"test_"+param} className="space-y-1">
                      <label className="text-xs font-medium text-brand-dark">{param}</label>
                      <input 
                         type="text" 
                         className="w-full border border-surface-muted bg-white rounded p-1.5 text-xs focus:outline-none focus:border-brand-primary" 
                         placeholder="Test değeri..." 
                         value={testValues[param] || ''}
                         onChange={e => setTestValues({...testValues, [param]: e.target.value})}
                      />
                   </div>
                ))}
             </div>
             <div className="flex items-center gap-3">
                <FfButton 
                   variant="outline" 
                   size="sm" 
                   onClick={handleTestQuery}
                   isLoading={isTesting}
                   leftIcon={<Play className="w-4 h-4" />}
                >
                   Test Sorgusu Çalıştır
                </FfButton>
                {testSuccess && <span className="text-brand-success text-xs flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Kolonlar getirildi</span>}
             </div>
          </div>
       )}

       {/* OUTPUT MAPPINGS */}
       <div className="bg-brand-gray/10 rounded p-4">
          <div className="flex items-center justify-between mb-3">
             <h4 className="font-semibold text-brand-dark">
                2. Çıktı (Sonuç) Eşleştirmesi
             </h4>
             <FfButton variant="outline" size="sm" onClick={handleAddOutputMapping} leftIcon={<Plus className="w-4 h-4"/>}>
                Eşleştirme Ekle
             </FfButton>
          </div>
          <p className="text-xs text-brand-gray mb-4">
             Sorgudan dönen kolonları, formunuzdaki hedef alanlara yerleştirin.
          </p>

          {currentOutputMappings.length === 0 ? (
             <div className="text-center py-6 border-2 border-dashed border-brand-gray/30 rounded text-brand-gray">
                Henüz çıktı eşleştirmesi eklenmedi.
             </div>
          ) : (
             <div className="space-y-3">
                {currentOutputMappings.map((mapping: any, idx: number) => (
                   <div key={idx} className="flex items-center gap-2">
                      <div className="w-[45%]">
                         {outputColumns.length > 0 ? (
                            <SelectBox
                               dataSource={outputColumns}
                               value={mapping.sourceKey}
                               onValueChanged={(e) => handleUpdateOutputMapping(idx, 'sourceKey', e.value)}
                               placeholder="SQL Kolonu seçin..."
                               searchEnabled={true}
                               showClearButton={true}
                               acceptCustomValue={true}
                               onCustomItemCreating={(e) => {
                                  if (!e.text) return;
                                  const customItem = e.text;
                                  setOutputColumns(prev => [...prev, customItem]);
                                  e.customItem = customItem;
                               }}
                            />
                         ) : (
                            <input 
                               type="text" 
                               className="w-full border border-gray-300 rounded p-[7px] text-sm" 
                               placeholder="SQL Kolonu (Örn: ADSOYAD)" 
                               value={mapping.sourceKey || ''}
                               onChange={(e) => handleUpdateOutputMapping(idx, 'sourceKey', e.target.value)}
                            />
                         )}
                      </div>
                      <div className="text-brand-gray">=</div>
                      <div className="w-[45%]">
                         <SelectBox
                            dataSource={availableFields}
                            displayExpr="label"
                            valueExpr="id"
                            value={mapping.targetFieldKey}
                            onValueChanged={(e) => handleUpdateOutputMapping(idx, 'targetFieldKey', e.value)}
                            placeholder="Hedef Form Alanı..."
                            searchEnabled={true}
                            showClearButton={true}
                         />
                      </div>
                      <button onClick={() => handleRemoveOutputMapping(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Sil">
                         <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                ))}
             </div>
          )}
       </div>
    </div>
  );
};

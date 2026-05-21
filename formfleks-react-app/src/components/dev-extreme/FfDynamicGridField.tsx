import React, { useMemo, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import DataGrid, { Column, Editing, RequiredRule, Lookup } from 'devextreme-react/data-grid';
import { cn } from '../ui';
import { DownloadCloud } from 'lucide-react';
import { ExcelImportModal } from './ExcelImportModal';

export interface FfDynamicGridFieldProps {
  name: string;
  label: string;
  columnsSchema: any[];
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * @component FfDynamicGridField
 * @description Dinamik formlarda tablo (Grid) şeklinde çoklu veri girişi (Master-Detail) sağlayan bileşen.
 * Tasarım ekranında (Form Builder) belirlenen kolonlara göre DevExtreme DataGrid render eder.
 */
export const FfDynamicGridField: React.FC<FfDynamicGridFieldProps> = ({ 
  name, label, columnsSchema, required, className, disabled 
}) => {
  const { control } = useFormContext();

  // Şemadaki kolonları DevExtreme formatına dönüştür
  const columns = useMemo(() => {
    return columnsSchema?.map(col => ({
       dataField: col.dataField,
       caption: col.label,
       dataType: col.editorType === 'number' ? 'number' : col.editorType === 'date' ? 'date' : 'string',
       isRequired: col.isRequired,
       editorType: col.editorType,
       options: col.options,
    })) || [];
  }, [columnsSchema]);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-brand-dark flex items-center gap-1">
          {label}
          {required && <span className="text-status-danger">*</span>}
        </label>
        
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-full transition-colors"
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            Excel'den Aktar
          </button>
        )}
      </div>
      <Controller
        name={name}
        control={control}
        rules={{ required: required ? "Bu alan zorunludur" : false }}
        render={({ field: { onChange, value }, fieldState: { error } }) => {
          
          // Arka yüzden string olarak gelen JSON verisini parse et (Eğer daha önce parse edilmediyse)
          let gridData = [];
          if (Array.isArray(value)) {
            gridData = value;
          } else if (value && typeof value === 'string') {
            try {
              gridData = JSON.parse(value);
            } catch {
              gridData = [];
            }
          }

          return (
            <div className={cn("border rounded-xl overflow-hidden", error ? "border-status-danger" : "border-surface-muted")}>
              <DataGrid
                dataSource={gridData}
                showBorders={true}
                disabled={disabled}
                columnAutoWidth={true}
                wordWrapEnabled={true}
                onSaved={(e) => {
                  // Hücre (cell) düzenleme sonrası veya satır ekleme/silme işlemi tamamlandığında tüm grid datasını form state'ine geçir
                  const newData = e.component.option('dataSource') as any[];
                  onChange([...(newData || [])]); // Dizi referansını yenileyerek hook-form'un algılamasını sağla
                }}
              >
                <Editing
                  mode="cell"
                  allowAdding={!disabled}
                  allowUpdating={!disabled}
                  allowDeleting={!disabled}
                  selectTextOnEditStart={true}
                  startEditAction="click"
                />
                
                {columns.map(col => (
                  <Column 
                    key={col.dataField} 
                    dataField={col.dataField} 
                    caption={col.caption} 
                    dataType={col.dataType as any}
                  >
                    {col.isRequired && <RequiredRule message={`${col.caption} zorunludur`} />}
                    {col.editorType === 'select' && col.options && (
                      <Lookup dataSource={col.options.split(',').map((x: string) => x.trim())} />
                    )}
                  </Column>
                ))}
              </DataGrid>
              {error && <span className="text-xs text-status-danger mt-1 px-3 pb-2 block bg-surface-base">{error.message}</span>}
              <ExcelImportModal
                isOpen={isExcelModalOpen}
                onClose={() => setIsExcelModalOpen(false)}
                columns={columns}
                onImport={(newData) => {
                  const currentData = [...gridData];
                  const mergedData = [...currentData, ...newData];
                  onChange(mergedData); // Hook form state update
                  setIsExcelModalOpen(false);
                }}
              />
            </div>
          );
        }}
      />
    </div>
  );
};

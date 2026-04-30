import React, { useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import DataGrid, { Column, Editing, RequiredRule } from 'devextreme-react/data-grid';
import { cn } from '../ui';

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
       // Geliştirme notu: İleride select (dropdown) için lookup özelliği eklenebilir.
    })) || [];
  }, [columnsSchema]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-brand-dark flex items-center gap-1">
        {label}
        {required && <span className="text-status-danger">*</span>}
      </label>
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
                  // Batch düzenleme sonrası tüm grid datasını form state'ine geçir
                  const newData = e.component.option('dataSource');
                  onChange(newData);
                }}
              >
                <Editing
                  mode="batch"
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
                  </Column>
                ))}
              </DataGrid>
              {error && <span className="text-xs text-status-danger mt-1 px-3 pb-2 block bg-surface-base">{error.message}</span>}
            </div>
          );
        }}
      />
    </div>
  );
};

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';
import { GlassCard } from '@/components/ui/GlassCard';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import DataGrid, { Column, SearchPanel, Paging, Pager, FilterRow, HeaderFilter, GroupPanel, Grouping, ColumnChooser } from 'devextreme-react/data-grid';
import { FileText } from 'lucide-react';
import { flattenFormTypeData } from './reportDataFlattener';

interface Props {
  startDate?: string;
  endDate?: string;
}

export const HrDynamicFormReport = ({ startDate, endDate }: Props) => {
  const [selectedFormType, setSelectedFormType] = useState<string>('');

  // Fetch all form details (we filter by formType client side for speed since we already have the flattener logic)
  const { data: detailedData = [], isLoading } = useQuery({
    queryKey: ['hr-all-form-details', startDate, endDate],
    queryFn: () => reportService.getAllHrFormDetails(startDate, endDate)
  });

  // Extract unique form types from the data
  const formTypes = useMemo(() => {
    const types = new Set<string>();
    detailedData.forEach(d => {
      if (d.formTypeName) types.add(d.formTypeName);
    });
    return Array.from(types).sort();
  }, [detailedData]);

  // Flatten the data for the selected form type
  const { columns, dataSource } = useMemo(() => {
    if (!selectedFormType || detailedData.length === 0) return { columns: [], dataSource: [] };
    const filtered = detailedData.filter(d => d.formTypeName === selectedFormType);
    return flattenFormTypeData(filtered);
  }, [detailedData, selectedFormType]);

  if (isLoading) {
    return <FfSkeletonLoader type="grid" count={1} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface-base border border-surface-muted rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-dark">Form Detay Raporu</h3>
            <p className="text-xs text-brand-gray">Raporunu görüntülemek istediğiniz form tipini seçin.</p>
          </div>
        </div>
        <select
          value={selectedFormType}
          onChange={(e) => setSelectedFormType(e.target.value)}
          className="bg-surface-muted/50 border border-surface-muted rounded-lg px-4 py-2 text-sm font-medium text-brand-dark min-w-[250px] outline-none"
        >
          <option value="">-- Form Tipi Seçiniz --</option>
          {formTypes.map(ft => (
            <option key={ft} value={ft}>{ft}</option>
          ))}
        </select>
      </div>

      {selectedFormType ? (
        <GlassCard className="flex-1">
          <DataGrid
            dataSource={dataSource}
            showBorders={true}
            columnAutoWidth={true}
            allowColumnResizing={true}
            allowColumnReordering={true}
            wordWrapEnabled={true}
            rowAlternationEnabled={true}
            hoverStateEnabled={true}
            className="w-full h-[calc(100vh-280px)] font-sans"
          >
            <ColumnChooser enabled={true} mode="select" />
            <GroupPanel visible={true} emptyPanelText="Sütunu buraya sürükleyerek gruplayın" />
            <Grouping autoExpandAll={false} />
            <SearchPanel visible={true} width={240} placeholder="Tabloda ara..." />
            <FilterRow visible={true} />
            <HeaderFilter visible={true} />
            <Paging defaultPageSize={15} />
            <Pager showPageSizeSelector={true} allowedPageSizes={[10, 15, 30, 50, 100]} showInfo={true} />

            {columns.map(col => (
              <Column
                key={col.dataField}
                dataField={col.dataField}
                caption={col.caption}
              />
            ))}
          </DataGrid>
        </GlassCard>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-base/50 border border-dashed border-surface-muted rounded-xl">
          <FileText className="h-12 w-12 text-brand-gray/30 mb-4" />
          <h4 className="text-base font-semibold text-brand-gray">Lütfen Bir Form Tipi Seçin</h4>
          <p className="text-sm text-brand-gray/70">Detaylı tabloyu görebilmek için yukarıdan bir form tipi seçmelisiniz.</p>
        </div>
      )}
    </div>
  );
};

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
      <div className="flex flex-col gap-4 rounded-2xl border border-surface-muted/80 bg-white p-5 shadow-[0_18px_55px_rgba(24,24,27,0.055)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-brand-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-brand-dark">Form Detay Raporu</h3>
            <p className="text-xs text-brand-gray">Alan bazlı detayları görmek için bir form tipi seçin.</p>
          </div>
        </div>
        <select
          value={selectedFormType}
          onChange={(e) => setSelectedFormType(e.target.value)}
          className="min-w-[260px] rounded-xl border border-surface-muted bg-surface-ground/45 px-4 py-2.5 text-sm font-semibold text-brand-dark outline-none transition-colors focus:border-brand-primary/45"
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
            className="formfleks-premium-grid ff-grid-restored h-[calc(100vh-280px)] w-full font-sans"
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-muted bg-white/70 py-24">
          <FileText className="mb-4 h-12 w-12 text-brand-gray/30" />
          <h4 className="text-base font-bold text-brand-dark">Form tipi seçerek başlayın</h4>
          <p className="mt-1 text-sm text-brand-gray">Detaylı tabloyu görebilmek için yukarıdan bir form tipi seçmelisiniz.</p>
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useRef } from 'react';
import DataGrid, {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Export,
  Sorting,
  Toolbar,
  Item
} from 'devextreme-react/data-grid';
import { useQuery } from '@tanstack/react-query';
import { FfEmptyState } from '../shared/FfEmptyState';
import { FfSkeletonLoader } from '../shared/FfSkeletonLoader';
import { AlertCircle } from 'lucide-react';
import { cn } from '../ui';
import 'devextreme/dist/css/dx.light.css'; // Will be overridden by global CSS
import './dx-overrides.css'; // We'll create this to fix DX borders and make it look premium

export interface FfDataGridProps {
  queryKey: string[];
  fetchFn: () => Promise<any[]>;
  columns: any[]; // DevExpress Column configuration array or children
  title?: string;
  enableExport?: boolean;
  enableSearch?: boolean;
  pageSize?: number;
  className?: string;
  onRowClick?: (e: any) => void;
  toolbarItems?: React.ReactNode;
}

export const FfDataGrid: React.FC<FfDataGridProps> = ({
  queryKey,
  fetchFn,
  columns,
  title,
  enableExport = true,
  enableSearch = true,
  pageSize = 20,
  className,
  onRowClick,
  toolbarItems
}) => {
  const gridRef = useRef<any>(null);

  // TanStack Query for seamless server state management
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey,
    queryFn: fetchFn,
    // By default staleTime is 0, which means instant background refetching on mount.
    // This solves grid caching problems like invisible new approvals.
  });

  const handleRowClick = useCallback((e: any) => {
    if (onRowClick) {
      onRowClick(e);
    }
  }, [onRowClick]);

  if (isLoading) {
    return (
      <div className={cn("w-full h-[400px]", className)}>
        <FfSkeletonLoader type="grid" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("bg-status-danger/10 border border-status-danger/20 rounded-lg p-4 flex items-start gap-3 w-full h-full min-h-[200px] justify-center flex-col text-center", className)}>
        <AlertCircle className="h-8 w-8 text-status-danger mx-auto mb-2 shrink-0" />
        <h4 className="text-status-danger font-semibold">Veriler Yüklenemedi</h4>
        <p className="text-sm text-status-danger font-medium mt-1">
          Sunucu ile iletişim kurarken bir hata oluştu: {(error as Error).message}
        </p>
      </div>
    );
  }

  // Pure Empty State implementation bypassing awful native DX empty template
  if (!data || data.length === 0) {
    return <FfEmptyState className={className} />;
  }

  return (
    <div className={cn("ff-datagrid-wrapper w-full h-full relative", className)}>

      <DataGrid
        ref={gridRef}
        dataSource={data}
        showBorders={false} // Crucial for Bento Box modern premium aesthetic
        showColumnLines={false}
        showRowLines={true}
        rowAlternationEnabled={true}
        allowColumnResizing={true}
        columnAutoWidth={true}
        hoverStateEnabled={true}
        onRowClick={handleRowClick}
        className="formfleks-premium-grid"
      >
        <Sorting mode="multiple" />
        <FilterRow visible={true} />
        <HeaderFilter visible={true} />
        {enableSearch && <SearchPanel visible={true} width={240} placeholder="Tabloda Ara..." />}
        {enableExport && <Export enabled={true} formats={['xlsx', 'pdf']} allowExportSelectedData={true} />}
        
        <Paging defaultPageSize={pageSize} />
        <Pager
          showPageSizeSelector={true}
          allowedPageSizes={[10, 20, 50, 100]}
          showInfo={true}
          infoText="Toplam {2} kayıttan {0} - {1} arası gösteriliyor"
        />

        {/* Support passing DxGridToolbar items via children/props if needed */}
        {(title || toolbarItems) && (
          <Toolbar>
            {title && <Item location="before"><div className="text-lg font-bold text-brand-dark py-1">{title}</div></Item>}
            {toolbarItems && <Item location="after">{toolbarItems}</Item>}
            <Item name="exportButton" />
            <Item name="searchPanel" />
          </Toolbar>
        )}

        {/* Map custom simplified column definitions to native DevExpress columns */}
        {columns.map((col, index) => (
           <Column 
             key={col.dataField || index} 
             dataField={col.dataField} 
             caption={col.caption} 
             dataType={col.dataType}
             width={col.width}
             minWidth={col.minWidth}
             cellRender={col.cellRender}
             alignment={col.alignment}
             filterValue={col.filterValue !== undefined ? col.filterValue : undefined}
             allowFiltering={col.allowFiltering}
           />
        ))}
      </DataGrid>
    </div>
  );
};

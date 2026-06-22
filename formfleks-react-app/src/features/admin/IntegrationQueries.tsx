import React, { useState, useEffect } from 'react';
import { integrationQueryService } from '@/services/integration-query.service';
import type { IntegrationQueryDto, IntegrationQueryUpsertDto } from '@/services/integration-query.service';
import { DataGrid, Column, Editing, Paging, FilterRow, HeaderFilter, Form, Popup } from 'devextreme-react/data-grid';
import 'devextreme-react/text-area';
import notify from 'devextreme/ui/notify';

export const IntegrationQueries: React.FC = () => {
  const [queries, setQueries] = useState<IntegrationQueryDto[]>([]);

  const loadData = async () => {
    try {
      const data = await integrationQueryService.getAll();
      setQueries(data);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Bir hata oluştu.', 'error', 3000);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRowInserting = async (e: any) => {
    e.cancel = true;
    try {
      const payload: IntegrationQueryUpsertDto = {
        name: e.data.name,
        connectionName: e.data.connectionName,
        queryTemplate: e.data.queryTemplate,
        parametersJson: e.data.parametersJson || '',
        engine: e.data.engine || 1
      };
      await integrationQueryService.create(payload);
      notify('Kayıt başarıyla eklendi.', 'success', 3000);
      await loadData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Kayıt eklenemedi.', 'error', 3000);
    }
  };

  const handleRowUpdating = async (e: any) => {
    e.cancel = true;
    const updatedData = { ...e.oldData, ...e.newData };
    try {
      const payload: IntegrationQueryUpsertDto = {
        name: updatedData.name,
        connectionName: updatedData.connectionName,
        queryTemplate: updatedData.queryTemplate,
        parametersJson: updatedData.parametersJson || '',
        engine: updatedData.engine || 1
      };
      await integrationQueryService.update(e.key, payload);
      notify('Kayıt başarıyla güncellendi.', 'success', 3000);
      await loadData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Kayıt güncellenemedi.', 'error', 3000);
    }
  };

  const handleRowRemoving = async (e: any) => {
    e.cancel = true;
    try {
      await integrationQueryService.delete(e.key);
      notify('Kayıt başarıyla silindi.', 'success', 3000);
      await loadData();
    } catch (err: any) {
      notify(err.response?.data?.message || 'Kayıt silinemedi.', 'error', 3000);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Dış Veri Kaynakları (Entegrasyon Sorguları)</h1>
      <DataGrid
        dataSource={queries}
        keyExpr="id"
        showBorders={true}
        columnAutoWidth={true}
        onRowInserting={handleRowInserting}
        onRowUpdating={handleRowUpdating}
        onRowRemoving={handleRowRemoving}
      >
        <FilterRow visible={true} />
        <HeaderFilter visible={true} />
        <Paging defaultPageSize={10} />
        <Editing
          mode="popup"
          allowUpdating={true}
          allowAdding={true}
          allowDeleting={true}
        >
          <Popup title="Entegrasyon Sorgusu" showTitle={true} width={700} height={550} />
          <Form colCount={2}>
          </Form>
        </Editing>

        <Column dataField="name" caption="Sorgu Adı" validationRules={[{ type: 'required' }]} formItem={{ colSpan: 1 }} />
        <Column 
          dataField="engine" 
          caption="Veritabanı Türü" 
          validationRules={[{ type: 'required' }]} 
          formItem={{ colSpan: 1 }}
          lookup={{
            dataSource: [
              { id: 1, text: 'SQL Server' },
              { id: 2, text: 'Oracle' },
              { id: 3, text: 'PostgreSQL' }
            ],
            valueExpr: 'id',
            displayExpr: 'text'
          }}
        />
        <Column dataField="connectionName" caption="Bağlantı Adı" validationRules={[{ type: 'required' }]} formItem={{ colSpan: 2 }} />
        <Column 
          dataField="queryTemplate" 
          caption="SQL Sorgusu" 
          visible={false} 
          formItem={{ visible: true, colSpan: 2, editorType: 'dxTextArea', editorOptions: { height: 120 }, isRequired: true }} 
        />
        <Column 
          dataField="parametersJson" 
          caption="Parametreler (JSON)" 
          visible={false} 
          formItem={{ visible: true, colSpan: 2, editorType: 'dxTextArea', editorOptions: { height: 100 } }} 
        />
      </DataGrid>
    </div>
  );
};

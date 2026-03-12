import React, { useCallback, useState } from 'react';
import { ShieldCheck, Code, Settings2 } from 'lucide-react';
import { PageHeader, FfButton } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { systemAdminService } from '@/services/system-admin.service';

export const AuditLogs: React.FC = () => {
  const [modalContent, setModalContent] = useState<string | null>(null);

  const handleShowDetails = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      setModalContent(JSON.stringify(parsed, null, 2));
    } catch {
      setModalContent(jsonStr);
    }
  }, []);

  const closeModal = () => setModalContent(null);

  // --- Grid Renderers ---
  const idRender = useCallback((cellData: any) => (
    <span className="font-mono text-xs text-brand-gray/80 tracking-tight" title={cellData.value}>
      {String(cellData.value).substring(0, 8)}...
    </span>
  ), []);

  const actionRender = useCallback((cellData: any) => {
    const action = cellData.value as string;
    let badgeClass = "bg-surface-muted text-brand-dark border-surface-muted";
    let label = action;

    switch (action) {
      case 'FormSubmitted':
        badgeClass = "bg-brand-primary/10 text-brand-primary border-brand-primary/20";
        label = "Form İletildi";
        break;
      case 'Approved':
        badgeClass = "bg-status-success/10 text-status-success border-status-success/20";
        label = "Onaylandı";
        break;
      case 'Rejected':
        badgeClass = "bg-status-danger/10 text-status-danger border-status-danger/20";
        label = "Reddedildi";
        break;
      case 'ReturnedForRevision':
        badgeClass = "bg-status-warning/10 text-status-warning border-status-warning/20";
        label = "Revizyona Gitti";
        break;
      case 'Updated':
        badgeClass = "bg-status-info/10 text-status-info border-status-info/20";
        label = "Güncellendi";
        break;
      case 'Assigned':
        badgeClass = "bg-brand-copper/10 text-brand-copper border-brand-copper/20";
        label = "Rol Atandı";
        break;
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${badgeClass}`}>
        {label}
      </span>
    );
  }, []);

  const targetRender = useCallback((cellData: any) => {
    const tType = cellData.data.entityType;
    const tId = cellData.data.entityId;
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-sm text-brand-dark">{tType}</span>
        <span className="font-mono text-xs text-brand-gray" title={tId}>{String(tId).substring(0, 8)}...</span>
      </div>
    );
  }, []);

  const detailRender = useCallback((cellData: any) => {
    const json = cellData.data.detailJson;
    if (!json) return <span className="text-brand-gray/50 text-xs italic">Detay yok</span>;

    return (
      <button 
        onClick={() => handleShowDetails(json)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-gray bg-surface-muted border border-surface-muted rounded-md hover:bg-white hover:text-brand-primary hover:border-brand-primary/30 transition-all"
      >
        <Code className="h-3 w-3" />
        JSON Bak
      </button>
    );
  }, [handleShowDetails]);

  const dateRender = useCallback((cellData: any) => {
    const date = new Date(cellData.value);
    return (
      <div className="flex flex-col text-right">
        <span className="text-sm font-medium text-brand-dark">
          {date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
        <span className="text-xs text-brand-gray">
          {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    );
  }, []);

  const columns = [
    { dataField: 'id', caption: 'Log ID', width: 100, cellRender: idRender, alignment: 'center' },
    { dataField: 'actionType', caption: 'İşlem Tipi', width: 160, cellRender: actionRender },
    { caption: 'Hedef (Entity)', width: 200, cellRender: targetRender },
    { dataField: 'actorUserId', caption: 'Aktör (Kullanıcı)', width: 140, cellRender: idRender, alignment: 'center' },
    { caption: 'Log Detayı', minWidth: 200, cellRender: detailRender },
    { dataField: 'createdAt', caption: 'Tarih', width: 140, dataType: 'datetime', sortOrder: 'desc', cellRender: dateRender, alignment: 'right' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader 
        title="Sistem Logları (Audit)" 
        description="Sistem içerisindeki tüm kritik işlemlerin, form onay süreçlerinin ve yetki değişimlerinin detaylı log kayıtları." 
        className="shrink-0 mb-4"
        actions={
          <FfButton variant="outline" leftIcon={<Settings2 className="h-4 w-4" />}>
            Dışa Aktar (CSV)
          </FfButton>
        }
      />

      <div className="flex-1 min-h-0 bg-surface-base rounded-xl shadow-soft border border-surface-muted overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-surface-muted bg-surface-hover flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-primary font-bold">
                <ShieldCheck className="h-5 w-5" />
                İşlem Kayıtları
            </div>
            <div className="text-xs text-brand-gray font-medium">Son 30 Gün</div>
        </div>
        <FfDataGrid 
          queryKey={['adminAuditLogs']}
          fetchFn={systemAdminService.getAuditLogs}
          columns={columns}
          pageSize={20}
        />
      </div>

      {/* JSON Viewer Modal Overlay */}
      {modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-surface-muted w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-surface-muted flex items-center justify-between bg-surface-hover">
              <h3 className="font-bold text-brand-dark flex items-center gap-2">
                <Code className="h-5 w-5 text-brand-primary" />
                Log JSON Verisi (Detay)
              </h3>
              <button 
                onClick={closeModal}
                className="text-brand-gray hover:text-brand-dark focus:outline-none"
              >
                <div className="h-6 w-6 flex items-center justify-center text-lg">&times;</div>
              </button>
            </div>
            <div className="p-5 bg-surface-base overflow-auto max-h-[60vh]">
              <pre className="text-sm font-mono text-brand-dark bg-surface-muted border border-surface-hover rounded-lg p-4 custom-scrollbar whitespace-pre-wrap">
                {modalContent}
              </pre>
            </div>
            <div className="px-5 py-4 border-t border-surface-muted bg-surface-hover flex justify-end">
              <FfButton variant="primary" onClick={closeModal}>
                Kapat
              </FfButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

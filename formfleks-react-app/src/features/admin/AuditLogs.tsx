import React, { useCallback, useState } from 'react';
import { ShieldCheck, Code, Settings2, Mail, Eye, X } from 'lucide-react';
import { PageHeader, FfButton, PageContainer, GlassCard } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { systemAdminService } from '@/services/system-admin.service';
import type { EmailLogDetailDto } from '@/services/system-admin.service';

export const AuditLogs: React.FC = () => {
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'audit' | 'email'>('audit');
  const [emailDetail, setEmailDetail] = useState<EmailLogDetailDto | null>(null);
  const [emailDetailLoading, setEmailDetailLoading] = useState(false);

  const handleShowDetails = useCallback((jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      setModalContent(JSON.stringify(parsed, null, 2));
    } catch {
      setModalContent(jsonStr);
    }
  }, []);

  const closeModal = () => setModalContent(null);

  const handleShowEmail = useCallback(async (id: string) => {
    setEmailDetailLoading(true);
    try {
      setEmailDetail(await systemAdminService.getEmailLog(id));
    } finally {
      setEmailDetailLoading(false);
    }
  }, []);

  // --- Grid Renderers ---
  const idRender = useCallback((cellData: any) => (
    <span className="font-mono text-xs text-brand-gray/80 tracking-tight" title={cellData.value}>
      {String(cellData.value).substring(0, 8)}...
    </span>
  ), []);

  const actorRender = useCallback((cellData: any) => {
    const actorName = cellData.data.actorName;
    if (actorName) {
      return <span className="font-semibold text-sm text-brand-dark">{actorName}</span>;
    }
    return <span className="font-mono text-xs text-brand-gray/80">{String(cellData.value).substring(0, 8)}...</span>;
  }, []);

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
    const tName = cellData.data.targetName;
    const tId = cellData.data.entityId;
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-sm text-brand-dark">{tType}</span>
        {tName && tName !== tId ? (
           <span className="text-xs text-brand-primary font-medium mt-0.5">{tName}</span>
        ) : (
           <span className="font-mono text-xs text-brand-gray mt-0.5" title={tId}>{String(tId).substring(0, 8)}...</span>
        )}
      </div>
    );
  }, []);

  const detailRender = useCallback((cellData: any) => {
    const json = cellData.data.detailJson;
    if (!json) return <span className="text-brand-gray/50 text-xs italic">Detay yok</span>;

    return (
      <button 
        onClick={() => handleShowDetails(json)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-gray bg-surface-muted border border-surface-muted rounded-md hover:bg-surface-base hover:text-brand-primary hover:border-brand-primary/30 transition-all"
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
    { dataField: 'actorUserId', caption: 'Aktör (Kullanıcı)', width: 180, cellRender: actorRender },
    { caption: 'Log Detayı', minWidth: 200, cellRender: detailRender },
    { dataField: 'createdAt', caption: 'Tarih', width: 140, dataType: 'datetime', sortOrder: 'desc', cellRender: dateRender, alignment: 'right' }
  ];

  const emailStatusRender = useCallback((cellData: any) => {
    const status = String(cellData.value);
    const classes: Record<string, string> = {
      Sent: 'bg-status-success/10 text-status-success border-status-success/20',
      Pending: 'bg-status-info/10 text-status-info border-status-info/20',
      Processing: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
      Failed: 'bg-status-warning/10 text-status-warning border-status-warning/20',
      DeadLetter: 'bg-status-danger/10 text-status-danger border-status-danger/20',
      Suppressed: 'bg-surface-muted text-brand-gray border-surface-muted'
    };
    const labels: Record<string, string> = {
      Sent: 'Gönderildi', Pending: 'Bekliyor', Processing: 'Gönderiliyor', Failed: 'Tekrar Denenecek',
      DeadLetter: 'Başarısız', Suppressed: 'Gönderim Kapalı'
    };
    return <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${classes[status] ?? classes.Suppressed}`}>{labels[status] ?? status}</span>;
  }, []);

  const emailRecipientsRender = useCallback((cellData: any) => (
    <div className="text-sm text-brand-dark truncate" title={(cellData.value ?? []).join(', ')}>
      {(cellData.value ?? []).join(', ')}
    </div>
  ), []);

  const emailDetailRender = useCallback((cellData: any) => (
    <button
      onClick={() => handleShowEmail(cellData.data.id)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-gray bg-surface-muted border border-surface-muted rounded-md hover:bg-surface-base hover:text-brand-primary hover:border-brand-primary/30 transition-all"
      title="E-posta ayrıntısını aç"
    >
      <Eye className="h-3.5 w-3.5" />
      İncele
    </button>
  ), [handleShowEmail]);

  const emailColumns = [
    { dataField: 'status', caption: 'Durum', width: 145, cellRender: emailStatusRender },
    { dataField: 'messageType', caption: 'E-posta Türü', width: 180 },
    { dataField: 'toAddresses', caption: 'Alıcılar', minWidth: 220, cellRender: emailRecipientsRender },
    { dataField: 'subject', caption: 'Konu', minWidth: 260 },
    { dataField: 'attemptCount', caption: 'Deneme', width: 90, alignment: 'center' },
    { dataField: 'queuedAt', caption: 'Kuyruğa Alındı', width: 165, dataType: 'datetime', sortOrder: 'desc', cellRender: dateRender },
    { caption: 'İçerik', width: 105, cellRender: emailDetailRender, alignment: 'center' }
  ];

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <PageHeader 
          title="Sistem Logları"
        description="Kritik sistem işlemlerini ve e-posta gönderimlerini ayrıntılı olarak izleyin."
        className="shrink-0 mb-4"
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Sistem & Araçlar', href: '/admin/audit-logs' },
          { label: 'Sistem Logları' }
        ]}
        actions={
          <FfButton variant="outline" leftIcon={<Settings2 className="h-4 w-4" />}>
            Dışa Aktar (CSV)
          </FfButton>
        }
      />

      <GlassCard noPadding className="flex-1 min-h-0 flex flex-col">
        <div className="px-5 py-3 border-b border-surface-muted bg-surface-hover flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-md">
              <button onClick={() => setActiveView('audit')} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold ${activeView === 'audit' ? 'bg-surface-base text-brand-primary shadow-sm' : 'text-brand-gray'}`}>
                <ShieldCheck className="h-4 w-4" /> İşlem Kayıtları
              </button>
              <button onClick={() => setActiveView('email')} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold ${activeView === 'email' ? 'bg-surface-base text-brand-primary shadow-sm' : 'text-brand-gray'}`}>
                <Mail className="h-4 w-4" /> E-posta Kayıtları
              </button>
            </div>
            <div className="text-xs text-brand-gray font-medium">Son 500 kayıt</div>
        </div>
        {activeView === 'audit' ? (
          <FfDataGrid queryKey={['adminAuditLogs']} fetchFn={systemAdminService.getAuditLogs} columns={columns} pageSize={20} />
        ) : (
          <FfDataGrid queryKey={['adminEmailLogs']} fetchFn={systemAdminService.getEmailLogs} columns={emailColumns} pageSize={20} />
        )}
      </GlassCard>

      {/* JSON Viewer Modal Overlay */}
      {modalContent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f172a]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-base rounded-xl shadow-xl border border-surface-muted w-full max-w-2xl overflow-hidden flex flex-col">
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

      {(emailDetail || emailDetailLoading) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0f172a]/40 backdrop-blur-sm">
          <div className="bg-surface-base rounded-lg shadow-xl border border-surface-muted w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-surface-muted flex items-center justify-between bg-surface-hover">
              <div>
                <h3 className="font-bold text-brand-dark flex items-center gap-2"><Mail className="h-5 w-5 text-brand-primary" /> E-posta Gönderim Detayı</h3>
                {emailDetail && <p className="text-xs text-brand-gray mt-1">{emailDetail.subject}</p>}
              </div>
              <button onClick={() => setEmailDetail(null)} className="p-1 text-brand-gray hover:text-brand-dark" title="Kapat"><X className="h-5 w-5" /></button>
            </div>
            {emailDetailLoading ? (
              <div className="p-10 text-center text-brand-gray">E-posta kaydı yükleniyor...</div>
            ) : emailDetail && (
              <div className="overflow-auto p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <div><span className="block text-xs text-brand-gray">Kimden</span><span className="font-medium text-brand-dark break-all">{emailDetail.fromAddress || '-'}</span></div>
                  <div><span className="block text-xs text-brand-gray">Kime</span><span className="font-medium text-brand-dark break-all">{emailDetail.toAddresses.join(', ')}</span></div>
                  <div><span className="block text-xs text-brand-gray">Durum / Deneme</span><span className="font-medium text-brand-dark">{emailDetail.status} / {emailDetail.attemptCount}</span></div>
                  <div><span className="block text-xs text-brand-gray">Kuyruk zamanı</span><span className="font-medium text-brand-dark">{new Date(emailDetail.queuedAt).toLocaleString('tr-TR')}</span></div>
                  <div><span className="block text-xs text-brand-gray">Gönderim zamanı</span><span className="font-medium text-brand-dark">{emailDetail.sentAt ? new Date(emailDetail.sentAt).toLocaleString('tr-TR') : '-'}</span></div>
                  <div><span className="block text-xs text-brand-gray">Referans</span><span className="font-mono text-xs text-brand-dark break-all">{emailDetail.referenceType || '-'} / {emailDetail.referenceId || '-'}</span></div>
                </div>
                {emailDetail.lastError && <div className="p-3 border border-status-danger/20 bg-status-danger/5 text-status-danger text-sm rounded-md whitespace-pre-wrap">{emailDetail.lastError}</div>}
                <div>
                  <h4 className="font-semibold text-sm text-brand-dark mb-2">E-posta Gövdesi</h4>
                  <iframe title="E-posta gövdesi" sandbox="" srcDoc={emailDetail.bodyHtml} className="w-full h-[430px] border border-surface-muted rounded-md bg-white" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div><h4 className="font-semibold text-sm text-brand-dark mb-2">Gönderim Başlıkları</h4><pre className="text-xs font-mono bg-surface-muted border border-surface-hover rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify(JSON.parse(emailDetail.headersJson || '{}'), null, 2)}</pre></div>
                  <div><h4 className="font-semibold text-sm text-brand-dark mb-2">Ek Dosya İzleri</h4><pre className="text-xs font-mono bg-surface-muted border border-surface-hover rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify(JSON.parse(emailDetail.attachmentManifestJson || '[]'), null, 2)}</pre></div>
                </div>
                <div className="text-xs text-brand-gray font-mono break-all">Body SHA-256: {emailDetail.bodySha256}</div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </PageContainer>
  );
};

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/index';
import { useQuery } from '@tanstack/react-query';
import { formService } from '@/services/form.service';
import { ArrowLeft, CheckCircle, Clock, FileText } from 'lucide-react';

export const FormDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Load request details. Since we don't have a specific getRequestById in our mock yet, we simulate one.
  const { data, isLoading } = useQuery({
    queryKey: ['form-request', id],
    queryFn: async () => {
      // Find from my requests as a fallback
      const requests = await formService.getMyRequests();
      const req = requests.find(r => r.requestId === id) || {
        requestId: id,
        requestNo: `REQ_${id}`,
        formTypeName: 'Örnek Form (Detay Görünümü)',
        status: 2, // Pending
        createdAt: new Date().toISOString()
      };
      
      // Simulate fetch delay
      await new Promise(r => setTimeout(r, 600));

      return {
        ...req,
        fields: [
          { label: 'Talep Açıklaması', value: 'Yeni bir monitör ihtiyacım var.' },
          { label: 'Öncelik', value: 'Yüksek' },
          { label: 'Gerekçe', value: 'Mevcut monitör ekranında sorunlar var ve verimliliğimi düşürüyor.' }
        ],
        workflow: [
          { step: 'Bölüm Yöneticisi Onayı', status: 'Approved', actor: 'Ahmet Yılmaz', date: new Date().toISOString() },
          { step: 'IT Departmanı Onayı', status: 'Pending', actor: 'IT Destek Grubu', date: null }
        ]
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/forms')}
          className="p-2 hover:bg-surface-muted rounded-full text-brand-gray transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={`${data.formTypeName} - Detay`}
          description={`${data.requestNo || data.requestId} numaralı talebin detayları`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-6">
            <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              Form İçeriği
            </h3>
            <div className="space-y-4">
              {data.fields.map((f: any, i: number) => (
                <div key={i} className="pb-4 border-b border-surface-muted last:border-0 last:pb-0">
                  <span className="block text-xs font-semibold text-brand-gray uppercase tracking-wider mb-1">
                    {f.label}
                  </span>
                  <span className="text-sm font-medium text-brand-dark">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-surface-muted p-6">
            <h3 className="text-sm font-bold text-brand-dark mb-4 pb-3 border-b border-surface-muted">
              Durum Bilgileri
            </h3>
            
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-surface-muted space-y-6">
                {data.workflow.map((w: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[31px] top-1 p-1 rounded-full bg-white border-2 ${
                      w.status === 'Approved' ? 'border-status-success text-status-success' : 'border-status-warning text-status-warning'
                    }`}>
                      {w.status === 'Approved' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-dark">{w.step}</h4>
                      <div className="text-xs text-brand-gray mt-1">
                        Sorumlu: <span className="font-medium text-brand-dark">{w.actor}</span>
                      </div>
                      {w.date && (
                        <div className="text-xs text-brand-gray mt-0.5">
                          Tarih: {new Date(w.date).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

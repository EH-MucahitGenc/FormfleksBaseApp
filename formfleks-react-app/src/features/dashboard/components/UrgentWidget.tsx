import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { GlassCard, FfButton } from '@/components/ui/index';

export interface UrgentApprovalItem {
  requestId: string;
  requestNo: string;
  formTypeName: string;
  createdAt: string;
}

interface UrgentWidgetProps {
  items?: UrgentApprovalItem[];
}

export const UrgentWidget: React.FC<UrgentWidgetProps> = ({ items }) => {
  const navigate = useNavigate();

  return (
    <GlassCard noPadding className="overflow-hidden">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-brand-dark flex items-center gap-2">
          <Clock className="h-5 w-5 text-status-warning" />
          Acil Onay Bekleyenler
        </h3>
        <button
          onClick={() => navigate('/approvals')}
          className="text-xs font-semibold text-brand-primary hover:text-brand-dark flex items-center gap-1 transition-colors"
        >
          Tümünü Gör <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="divide-y border-surface-muted">
        {!items || items.length === 0 ? (
          <div className="p-6 text-center text-sm text-brand-gray">
            Bekleyen acil bir işiniz bulunmamaktadır.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.requestId} className="p-4 hover:bg-surface-muted/30 transition-colors flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-brand-dark">{item.formTypeName}</div>
                <div className="text-xs text-brand-gray mt-1">
                  Talep No: {item.requestNo} • {new Date(item.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <FfButton variant="outline" size="sm" onClick={() => navigate('/approvals')}>
                İncele
              </FfButton>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};

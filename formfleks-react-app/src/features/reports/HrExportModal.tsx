import { useState } from 'react';
import { FfModal } from '@/components/ui/FfModal';
import { FfButton } from '@/components/ui';
import { Download, Calendar, FileText } from 'lucide-react';
import { FfDateBox } from '@/components/dev-extreme/FfDateBox';
import { reportService } from '@/services/report.service';
import { exportHrReportToExcel } from './useExcelExport';
import { notify } from '@/lib/notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
  availableFormTypes: string[];
}

export const HrExportModal = ({ isOpen, onClose, defaultStartDate, defaultEndDate, availableFormTypes }: Props) => {
  const [startDate, setStartDate] = useState<string | undefined>(defaultStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(defaultEndDate);
  const [selectedFormType, setSelectedFormType] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Fetch fresh data for the selected date range
      const [summaryData, trendData, detailedData] = await Promise.all([
        reportService.getHrSummaryReport(startDate, endDate),
        reportService.getHrAdvancedAnalytics(startDate, endDate).then(res => res.trendMetrics || []),
        reportService.getAllHrFormDetails(startDate, endDate)
      ]);

      // Filter by form type if a specific one is selected
      const filteredDetails = selectedFormType === 'ALL' 
        ? detailedData 
        : detailedData.filter(d => d.formTypeName === selectedFormType);
        
      const filteredSummary = selectedFormType === 'ALL'
        ? summaryData
        : summaryData.filter(d => d.formTypeName === selectedFormType);

      await exportHrReportToExcel({
        detailedData: filteredDetails, 
        summaryData: filteredSummary, 
        trendData, 
        filters: {
          startDate,
          endDate,
          formType: selectedFormType === 'ALL' ? 'Tüm Formlar' : selectedFormType
        }
      });

      notify.success("Rapor başarıyla Excel'e aktarıldı.");
      onClose();
    } catch (error) {
      console.error("Export error", error);
      notify.error("Rapor dışa aktarılırken bir hata oluştu.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <FfModal isOpen={isOpen} onClose={onClose} title="Excel'e Aktar">
      <div className="flex flex-col gap-5 py-2">
        
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
          <p>Seçtiğiniz tarih aralığına ait tüm detaylı ve özet form verileri derlenip Excel dosyasına aktarılacaktır.</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brand-dark flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-primary" />
              Tarih Aralığı
            </label>
            <div className="grid grid-cols-2 gap-3">
              <FfDateBox
                value={startDate ? new Date(startDate) : undefined}
                onValueChanged={(e: any) => setStartDate(e.value ? new Date(e.value).toISOString() : undefined)}
                placeholder="Başlangıç Tarihi"
              />
              <FfDateBox
                value={endDate ? new Date(endDate) : undefined}
                onValueChanged={(e: any) => setEndDate(e.value ? new Date(e.value).toISOString() : undefined)}
                placeholder="Bitiş Tarihi"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-brand-dark flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-primary" />
              Aktarılacak Form Tipi
            </label>
            <select
              value={selectedFormType}
              onChange={e => setSelectedFormType(e.target.value)}
              className="bg-surface-base border border-surface-muted rounded-lg px-3 py-2 text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
            >
              <option value="ALL">Tüm Formlar (Ayrı Sekmeler Halinde)</option>
              {availableFormTypes.map(ft => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <FfButton variant="outline" onClick={onClose} disabled={isExporting}>
            İptal
          </FfButton>
          <FfButton leftIcon={<Download className="h-4 w-4"/>} onClick={handleExport} isLoading={isExporting}>
            {isExporting ? 'Hazırlanıyor...' : 'Excel\'e Aktar'}
          </FfButton>
        </div>
      </div>
    </FfModal>
  );
};

import { forwardRef } from 'react';
import type { FormRequestDetailedDto } from '@/services/form.service';

interface PrintableFormDetailProps {
  data: FormRequestDetailedDto;
}

export const PrintableFormDetail = forwardRef<HTMLDivElement, PrintableFormDetailProps>(
  ({ data }, ref) => {
    
    const getStatusText = (status: number) => {
      switch(status) {
        case 1: return 'Taslak';
        case 2: return 'Onaya Sunuldu';
        case 3: return 'Onay Aşamasında';
        case 4: return 'Onaylandı';
        case 5: return 'Reddedildi';
        case 6: return 'İptal Edildi';
        case 7: return 'Revizyona İade Edildi';
        default: return 'Bilinmiyor';
      }
    };

    const getWorkflowStatusText = (status: string) => {
      switch(status) {
        case 'Approved': return 'Onaylandı';
        case 'Rejected': return 'Reddedildi';
        case 'ReturnedForRevision': return 'İade Edildi';
        case 'Pending': return 'Bekliyor';
        case 'Future': return 'Sırada';
        case 'Submitted': return 'Talebi Açtı';
        default: return status;
      }
    };

    return (
      <div 
        ref={ref} 
        className="print-container bg-white text-black p-8 font-sans w-full max-w-[210mm] mx-auto hidden print:block"
        style={{ color: '#000', backgroundColor: '#fff', fontSize: '12pt', lineHeight: 1.5 }}
      >
        <style type="text/css" media="print">
          {`
            @page { size: A4 portrait; margin: 15mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
            .print-container { display: block !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
            * { color: #000 !important; text-shadow: none !important; box-shadow: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .brand-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section-title { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; font-weight: bold; font-size: 14pt; }
            th { background-color: #f3f4f6 !important; }
          `}
        </style>

        {/* Kurumsal Başlık (Header) */}
        <div className="brand-header flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight m-0 p-0 text-black">{data.formTypeName}</h1>
            <p className="text-sm font-medium text-gray-700 m-0 mt-1">Form Talep ve Onay Belgesi</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-black border border-black px-3 py-1 bg-gray-50 uppercase">
              {data.requestNo}
            </div>
            <div className="text-xs mt-2 font-medium">Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Belge Özeti ve Mevcut Durum */}
        <div className="mb-6 grid grid-cols-2 gap-4 border border-gray-300 rounded p-4">
          <div>
            <span className="text-xs uppercase text-gray-500 font-bold block mb-1">Form Tipi</span>
            <span className="font-semibold text-sm">{data.formTypeName} ({data.formTypeCode})</span>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase text-gray-500 font-bold block mb-1">Nihai Durum</span>
            <span className="font-bold text-sm uppercase px-2 py-1 border border-black inline-block bg-gray-100">
              {getStatusText(data.status)}
            </span>
          </div>
        </div>

        <h2 className="section-title">Form İçerik Verileri</h2>
        
        <table className="w-full border-collapse border border-gray-300 text-sm mb-8">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-left w-1/3 bg-gray-100 font-bold text-xs uppercase">Alan Adı</th>
              <th className="border border-gray-300 p-2 text-left w-2/3 bg-gray-100 font-bold text-xs uppercase">Girilen Değer</th>
            </tr>
          </thead>
          <tbody>
            {data.values && data.values.length > 0 ? data.values.map((v, idx) => (
              <tr key={idx}>
                <td className="border border-gray-300 p-2 font-medium bg-gray-50">{v.label}</td>
                <td className="border border-gray-300 p-2 font-bold break-words">{v.valueText || '-'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={2} className="border border-gray-300 p-4 text-center italic text-gray-500">
                  Form verisi bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="section-title">Onay / Red Tarihçesi ve Aksiyonlar</h2>

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-left bg-gray-100 font-bold text-xs uppercase w-1/5">Tarih / Saat</th>
              <th className="border border-gray-300 p-2 text-left bg-gray-100 font-bold text-xs uppercase w-1/5">Aşama / Durum</th>
              <th className="border border-gray-300 p-2 text-left bg-gray-100 font-bold text-xs uppercase w-1/4">Sorumlu Kişi</th>
              <th className="border border-gray-300 p-2 text-left bg-gray-100 font-bold text-xs uppercase w-auto">Yorum / Not</th>
            </tr>
          </thead>
          <tbody>
            {data.workflow && data.workflow.length > 0 ? data.workflow.map((w, idx) => (
              <tr key={idx} className={w.status === 'Future' ? 'opacity-60 grayscale' : ''}>
                <td className="border border-gray-300 p-2 whitespace-nowrap text-xs">
                  {w.date ? new Date(w.date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                </td>
                <td className="border border-gray-300 p-2 font-medium">
                  <div className="font-bold">{w.step}</div>
                  <div className="text-xs uppercase mt-1">[{getWorkflowStatusText(w.status)}]</div>
                </td>
                <td className="border border-gray-300 p-2 font-semibold">
                  {w.actor}
                </td>
                <td className="border border-gray-300 p-2 text-xs italic">
                  {w.comment ? `"${w.comment}"` : '-'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="border border-gray-300 p-4 text-center italic text-gray-500">
                  Onay adım kaydı bulunmamaktadır.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-16 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          Bu belge elektronik onay takip sistemi (Formfleks) üzerinden {new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak üretilmiştir.
          Belge üzerindeki tüm onay kayıtları KVKK kapsamında Log.Db veri tabanında tutulmaktadır. Kimlik doğrulama ID: {data.requestId}
        </div>
      </div>
    );
  }
);

PrintableFormDetail.displayName = 'PrintableFormDetail';

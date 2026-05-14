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
            .print-container { display: block !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; position: relative; z-index: 1; }
            * { color: #000 !important; text-shadow: none !important; box-shadow: none !important; }
            table { page-break-inside: auto; border-color: #000 !important; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            .section-title { background-color: #000 !important; color: #fff !important; padding: 4px 8px; font-weight: bold; font-size: 11pt; text-transform: uppercase; margin-top: 20px; margin-bottom: 0px; -webkit-print-color-adjust: exact; print-color-adjust: exact; border: 2px solid #000; border-bottom: none; }
            th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(0, 0, 0, 0.04) !important; z-index: -1; pointer-events: none; white-space: nowrap; font-weight: 900; }
          `}
        </style>

        {/* Watermark */}
        <div className="watermark">{data.requesterCompany?.toLowerCase().includes("erkurt") ? "ERKURT HOLDİNG" : "FORMFLEKS"}</div>

        {/* Kurumsal Başlık (Header) */}
        <div className="flex border-2 border-black mb-4 items-stretch bg-white">
          <div className="w-1/4 border-r-2 border-black p-4 flex flex-col items-center justify-center">
             <img 
               src={data.requesterCompany?.toLowerCase().includes("erkurt") ? "/erkurtlogo.svg" : "/logo.svg"} 
               alt={data.requesterCompany?.toLowerCase().includes("erkurt") ? "Erkurt Holding" : "Formfleks"} 
               className="max-h-12 object-contain" 
             />
          </div>
          <div className="w-2/4 p-4 flex flex-col items-center justify-center text-center">
            <h1 className="text-xl font-black uppercase m-0 p-0">{data.formTypeName}</h1>
            <p className="text-xs font-bold mt-1">KURUMSAL FORM VE ONAY BELGESİ</p>
          </div>
          <div className="w-1/4 border-l-2 border-black flex flex-col text-[10px] font-bold">
            <div className="border-b border-black p-2 flex justify-between items-center h-1/3"><span>DOKÜMAN TİPİ:</span> <span className="text-right">{data.formTypeCode}</span></div>
            <div className="border-b border-black p-2 flex justify-between items-center h-1/3"><span>KAYIT NO:</span> <span className="text-right">{data.requestNo}</span></div>
            <div className="p-2 flex justify-between items-center h-1/3"><span>ÇIKTI TARİHİ:</span> <span className="text-right">{new Date().toLocaleDateString('tr-TR')}</span></div>
          </div>
        </div>

        {/* Belge Özeti ve Mevcut Durum */}
        <div className="mb-6 flex border-2 border-black bg-gray-50">
          <div className="w-1/2 p-3 border-r-2 border-black">
            <span className="text-[10px] uppercase font-bold block mb-1">NİHAİ DURUM:</span>
            <span className="font-black text-sm uppercase px-2 py-1 border border-black inline-block bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {getStatusText(data.status)}
            </span>
          </div>
          <div className="w-1/2 p-3">
            <span className="text-[10px] uppercase font-bold block mb-1">TALEP EDEN BİLGİSİ (SİSTEM LOG):</span>
            <span className="font-semibold text-xs leading-tight block">Talebi başlatan sistem kullanıcısı kimliği sunucuda kriptolanmış log kayıtlarında 5651 sayılı kanun gereği saklanmaktadır.</span>
          </div>
        </div>

        <h2 className="section-title">1. FORM İÇERİK BİLGİLERİ</h2>
        
        <table className="w-full border-collapse border-2 border-black text-sm mb-6">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left w-1/3 bg-gray-100 font-bold text-[10px] uppercase">Veri Alanı</th>
              <th className="border border-black p-2 text-left w-2/3 bg-gray-100 font-bold text-[10px] uppercase">Sisteme Girilen Değer</th>
            </tr>
          </thead>
          <tbody>
            {data.values && data.values.length > 0 ? data.values.map((v, idx) => {
              if (v.fieldType === 11 && v.valueText) {
                try {
                  const gridData = JSON.parse(v.valueText);
                  let gridCols: any[] = [];
                  if (v.optionsJson) {
                     gridCols = JSON.parse(v.optionsJson);
                  } else if (Array.isArray(gridData) && gridData.length > 0) {
                     gridCols = Object.keys(gridData[0]).map(k => ({ dataField: k, caption: k }));
                  }

                  if (Array.isArray(gridData)) {
                    return (
                      <tr key={idx}>
                        <td colSpan={2} className="border border-black p-0">
                          <div className="bg-gray-100 font-bold p-2 text-xs border-b border-black">{v.label} (Liste Verisi)</div>
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr>
                                <th className="border-b border-r border-black p-1 w-8 text-center bg-gray-50">#</th>
                                {gridCols.map((c: any) => (
                                  <th key={c.dataField} className="border-b border-r border-black p-1 font-bold bg-gray-50">{c.caption || c.label || c.dataField}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {gridData.length === 0 ? (
                                <tr>
                                  <td colSpan={gridCols.length + 1} className="p-2 text-center text-gray-500 italic">Veri girilmemiş</td>
                                </tr>
                              ) : gridData.map((row: any, rIdx: number) => (
                                <tr key={rIdx}>
                                  <td className="border-b border-r border-black p-1 text-center">{rIdx + 1}</td>
                                  {gridCols.map((c: any) => {
                                    let val = row[c.dataField];
                                    if (val === true) val = "Evet";
                                    if (val === false) val = "Hayır";
                                    return (
                                      <td key={c.dataField} className="border-b border-r border-black p-1">{val ?? '-'}</td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    );
                  }
                } catch(e) {}
              }

              if (v.fieldType === 10 && v.valueText) {
                return (
                  <tr key={idx}>
                    <td className="border border-black p-2 font-bold bg-gray-50 text-xs">{v.label}</td>
                    <td className="border border-black p-2 font-bold break-words italic text-gray-600 text-xs">
                      [Eklenmiş Dosya: {v.valueText.split('/').pop()}]
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={idx}>
                  <td className="border border-black p-2 font-bold bg-gray-50 text-xs">{v.label}</td>
                  <td className="border border-black p-2 font-medium break-words text-xs">{v.valueText || '-'}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={2} className="border border-black p-4 text-center italic text-gray-500">
                  Form verisi bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="section-title">2. ONAY / RED TARİHÇESİ VE DİJİTAL İZLER</h2>

        <table className="w-full border-collapse border-2 border-black text-sm">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left bg-gray-100 font-bold text-[10px] uppercase w-1/5">İşlem Tarihi</th>
              <th className="border border-black p-2 text-left bg-gray-100 font-bold text-[10px] uppercase w-1/5">Aşama / Durum</th>
              <th className="border border-black p-2 text-left bg-gray-100 font-bold text-[10px] uppercase w-1/4">İşlemi Yapan</th>
              <th className="border border-black p-2 text-left bg-gray-100 font-bold text-[10px] uppercase w-auto">Sistem Notu / Yorum</th>
            </tr>
          </thead>
          <tbody>
            {data.workflow && data.workflow.length > 0 ? data.workflow.map((w, idx) => (
              <tr key={idx} className={w.status === 'Future' ? 'opacity-60 grayscale' : ''}>
                <td className="border border-black p-2 whitespace-nowrap text-[11px] font-medium">
                  {w.date ? new Date(w.date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                </td>
                <td className="border border-black p-2 font-medium">
                  <div className="font-bold text-[11px]">{w.step}</div>
                  <div className="text-[10px] uppercase mt-1">[{getWorkflowStatusText(w.status)}]</div>
                </td>
                <td className="border border-black p-2 font-bold text-[11px]">
                  {w.actor}
                </td>
                <td className="border border-black p-2 text-[11px] italic">
                  {w.comment ? `"${w.comment}"` : '-'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="border border-black p-4 text-center italic text-gray-500">
                  Onay adım kaydı bulunmamaktadır.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-8 border-2 border-black p-3 bg-gray-50 flex items-start gap-3">
          <div className="text-3xl">⚠️</div>
          <div className="text-[9px] leading-tight text-justify font-medium">
            <strong className="block text-[10px] mb-1 uppercase">KVKK Aydınlatma ve Gizlilik Beyanı</strong>
            6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, bu belgede yer alan veriler Erkurt Holding Aydınlatma Metni'ne uygun olarak, yalnızca Formfleks İş Akış Sistemi çerçevesinde ve belgenin tahsis amacına yönelik hukuki/operasyonel gereklilikler sebebiyle işlenmektedir. Bu belgede yer alan kişisel veriler, yetkisiz üçüncü şahıslarla paylaşılamaz, kopyalanamaz veya amacı dışında kullanılamaz. Elektronik onay takip sistemi (Formfleks) üzerinden {new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak üretilmiştir. Tüm dijital izler ve kimlik doğrulama logları 5651 sayılı kanun gereği sunucu veri tabanlarında kriptolanmış olarak tutulmaktadır. <br/><strong>Belge Doğrulama Referansı: {data.requestId}</strong>
          </div>
        </div>
      </div>
    );
  }
);

PrintableFormDetail.displayName = 'PrintableFormDetail';

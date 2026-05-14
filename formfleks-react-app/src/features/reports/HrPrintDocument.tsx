import React from 'react';
import type { HrSummaryReportDto } from '@/services/report.service';

interface Props {
  summaryData: HrSummaryReportDto[];
  filters: {
    location?: string;
    department?: string;
    personName?: string;
    dateLabel?: string;
  };
  generatedAt?: string;
}

const NAVY  = '#1E3A5F';
const BLUE  = '#2D6A9F';
const LIGHT = '#D6E8F7';
const ORANGE= '#F97316';

// Inline-style KPI card that prints reliably
const KpiCard = ({ label, value, bgColor, color }: { label: string; value: string | number; bgColor: string; color: string }) => (
  <div style={{
    backgroundColor: bgColor, color, borderRadius: 10, padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
    WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' as any,
  }}>
    <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{value}</span>
  </div>
);

export const HrPrintDocument = React.forwardRef<HTMLDivElement, Props>(
  ({ summaryData, filters, generatedAt }, ref) => {
    if (!summaryData) return null;

    const totalForms    = summaryData.reduce((s,c) => s + c.totalForms, 0);
    const totalApproved = summaryData.reduce((s,c) => s + c.totalApproved, 0);
    const totalRejected = summaryData.reduce((s,c) => s + c.totalRejected, 0);
    const totalDraft    = summaryData.reduce((s,c) => s + c.totalDraft, 0);
    const approvalRate  = totalForms > 0 ? Math.round((totalApproved / totalForms) * 100) : 0;
    const uniquePersons = new Set(summaryData.map(d => d.requestorUserId)).size;

    const filterText = [
      filters.location   ? `📍 ${filters.location}` : null,
      filters.department ? `🏢 ${filters.department}` : null,
      filters.personName ? `👤 ${filters.personName}` : null,
      filters.dateLabel  ? `📅 ${filters.dateLabel}` : null,
    ].filter(Boolean).join('   ·   ') || '📅 Tüm Dönemler — Tüm Şube / Departman / Personel';

    // Department grouped data
    const deptMap: Record<string, { location: string; total: number; approved: number; rejected: number }> = {};
    summaryData.forEach(d => {
      const k = `${d.location}__${d.department}`;
      if (!deptMap[k]) deptMap[k] = { location: d.location, total: 0, approved: 0, rejected: 0 };
      deptMap[k].total    += d.totalForms;
      deptMap[k].approved += d.totalApproved;
      deptMap[k].rejected += d.totalRejected;
    });
    const deptRows = Object.entries(deptMap).sort((a,b)=>b[1].total-a[1].total).map(([k,v]) => ({ dept: k.split('__')[1], ...v }));

    const rateColor = (rate: number) => rate >= 80 ? { bg: '#D4EDDA', fg: '#155724' } : rate >= 50 ? { bg: '#FFF3CD', fg: '#856404' } : { bg: '#F8D7DA', fg: '#721C24' };

    return (
      <div ref={ref} style={{ fontFamily: "'Outfit', 'Calibri', sans-serif", backgroundColor: '#fff', padding: 0, margin: 0 }}>

        {/* ─── PAGE 1: COVER + KPIs ─── */}
        <div style={{ pageBreakAfter: 'always' }}>
          {/* Header Banner */}
          <div style={{
            background: NAVY, color: '#fff', padding: '24px 32px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' as any,
          }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
                FORMFLEKS
                <span style={{ color: ORANGE, marginLeft: 8 }}>İK FORM ANALİZ RAPORU</span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
                İnsan Kaynakları · Form Kullanım & Performans Özeti
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 10, opacity: 0.8 }}>
              <div>Oluşturulma: {generatedAt || new Date().toLocaleString('tr-TR')}</div>
              <div style={{ marginTop: 2, fontStyle: 'italic' }}>Gizlilik: Dahili Kullanım</div>
            </div>
          </div>

          {/* Filter strip */}
          <div style={{
            background: LIGHT, padding: '8px 32px', fontSize: 10, color: NAVY,
            fontWeight: 600, borderBottom: `2px solid ${BLUE}`,
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' as any,
          }}>
            🔍 Filtre: {filterText}
          </div>

          {/* KPI cards */}
          <div style={{ padding: '24px 32px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
              ▪ Dönem Özeti
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <KpiCard label="Toplam Form"     value={totalForms}     bgColor={NAVY}      color="#fff" />
              <KpiCard label="Aktif Personel"  value={uniquePersons}  bgColor={BLUE}      color="#fff" />
              <KpiCard label="✅ Onaylanan"    value={totalApproved}  bgColor="#D4EDDA"   color="#155724" />
              <KpiCard label="❌ Reddedilen"   value={totalRejected}  bgColor="#F8D7DA"   color="#721C24" />
              <KpiCard label="📝 Taslak"       value={totalDraft}     bgColor="#E2E3E5"   color="#383D41" />
              <KpiCard label="📊 Onay Oranı"   value={`%${approvalRate}`} bgColor={approvalRate>=80?'#D4EDDA':approvalRate>=50?'#FFF3CD':'#F8D7DA'} color={approvalRate>=80?'#155724':approvalRate>=50?'#856404':'#721C24'} />
            </div>
          </div>

          {/* Department summary table on page 1 */}
          <div style={{ padding: '16px 32px 32px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
              ▪ Departman Bazlı Özet
            </div>
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
              <thead>
                <tr>
                  {['#', 'Departman', 'Şube', 'Toplam', '✅ Onaylanan', '❌ Reddedilen', '📊 Onay Oranı'].map(h => (
                    <th key={h} style={{ background: NAVY, color: '#fff', padding: '8px 10px', textAlign: 'center', fontWeight: 700, border: `1px solid ${BLUE}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' as any }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptRows.slice(0, 20).map((row, i) => {
                  const rate = row.total > 0 ? Math.round((row.approved/row.total)*100) : 0;
                  const { bg, fg } = rateColor(rate);
                  return (
                    <tr key={i} style={{ background: i%2===0?'#F0F7FF':'#fff', WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>
                      <td style={{ textAlign:'center', padding:'5px 8px', border:'1px solid #e2e8f0', fontWeight:600, color:NAVY }}>{i+1}</td>
                      <td style={{ padding:'5px 10px', border:'1px solid #e2e8f0', fontWeight:600 }}>{row.dept}</td>
                      <td style={{ padding:'5px 10px', border:'1px solid #e2e8f0', color:'#64748b' }}>{row.location}</td>
                      <td style={{ textAlign:'center', padding:'5px 8px', border:'1px solid #e2e8f0', fontWeight:700 }}>{row.total}</td>
                      <td style={{ textAlign:'center', padding:'5px 8px', border:'1px solid #e2e8f0', color:'#155724', background:'#D4EDDA', fontWeight:600, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{row.approved}</td>
                      <td style={{ textAlign:'center', padding:'5px 8px', border:'1px solid #e2e8f0', color:'#721C24', background:'#F8D7DA', fontWeight:600, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{row.rejected}</td>
                      <td style={{ textAlign:'center', padding:'5px 8px', border:'1px solid #e2e8f0', background:bg, color:fg, fontWeight:700, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>%{rate}</td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr style={{ background: BLUE, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>
                  {['','GENEL TOPLAM','',totalForms,totalApproved,totalRejected,`%${approvalRate}`].map((v,i)=>(
                    <td key={i} style={{ textAlign:'center', padding:'7px 8px', border:'1px solid #1E3A5F', fontWeight:800, color:'#fff', WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── PAGE 2: PERSONEL KARNESİ ─── */}
        <div>
          {/* Section header */}
          <div style={{ background: BLUE, color:'#fff', padding:'14px 32px', WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>
            <div style={{ fontSize:15, fontWeight:700 }}>👥 Detaylı Personel Karnesi</div>
            <div style={{ fontSize:9, opacity:0.8, marginTop:2 }}>Personel bazlı form kullanım detayı</div>
          </div>

          <div style={{ padding: '16px 32px 32px' }}>
            <table className="print-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:8.5 }}>
              <thead>
                <tr>
                  {['#','Personel','Departman','Şube','Form Tipi','Toplam','✅ Onaylanan','❌ Reddedilen','📝 Taslak','📊 Onay Oranı'].map(h=>(
                    <th key={h} style={{ background:NAVY, color:'#fff', padding:'7px 6px', textAlign:'center', fontWeight:700, border:`1px solid ${BLUE}`, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryData.map((item, i) => {
                  const rate = item.totalForms>0 ? Math.round((item.totalApproved/item.totalForms)*100) : 0;
                  const {bg,fg} = rateColor(rate);
                  return (
                    <tr key={i} style={{ background:i%2===0?'#F0F7FF':'#fff', WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>
                      <td style={{ textAlign:'center', padding:'4px 5px', border:'1px solid #e2e8f0', fontWeight:600, color:NAVY, fontSize:8 }}>{i+1}</td>
                      <td style={{ padding:'4px 7px', border:'1px solid #e2e8f0', fontWeight:600, fontSize:8 }}>{item.fullName}</td>
                      <td style={{ padding:'4px 7px', border:'1px solid #e2e8f0', fontSize:8, color:'#374151' }}>{item.department}</td>
                      <td style={{ padding:'4px 7px', border:'1px solid #e2e8f0', fontSize:8, color:'#64748b' }}>{item.location}</td>
                      <td style={{ padding:'4px 7px', border:'1px solid #e2e8f0', fontSize:8 }}>{item.formTypeName}</td>
                      <td style={{ textAlign:'center', padding:'4px 5px', border:'1px solid #e2e8f0', fontWeight:700, fontSize:9 }}>{item.totalForms}</td>
                      <td style={{ textAlign:'center', padding:'4px 5px', border:'1px solid #e2e8f0', color:'#155724', background:'#D4EDDA', fontWeight:600, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{item.totalApproved}</td>
                      <td style={{ textAlign:'center', padding:'4px 5px', border:'1px solid #e2e8f0', color:'#721C24', background:'#F8D7DA', fontWeight:600, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{item.totalRejected}</td>
                      <td style={{ textAlign:'center', padding:'4px 5px', border:'1px solid #e2e8f0', color:'#383D41', background:'#E2E3E5', WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>{item.totalDraft}</td>
                      <td style={{ textAlign:'center', padding:'4px 5px', border:'1px solid #e2e8f0', background:bg, color:fg, fontWeight:700, WebkitPrintColorAdjust:'exact', printColorAdjust:'exact' as any }}>%{rate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ borderTop:`2px solid ${LIGHT}`, padding:'10px 32px', display:'flex', justifyContent:'space-between', color:'#94a3b8', fontSize:8 }}>
            <span>FORMFLEKS İK Raporlama Modülü · Gizli — Dahili Kullanım</span>
            <span>Oluşturulma: {generatedAt || new Date().toLocaleString('tr-TR')}</span>
          </div>
        </div>

      </div>
    );
  }
);
HrPrintDocument.displayName = 'HrPrintDocument';

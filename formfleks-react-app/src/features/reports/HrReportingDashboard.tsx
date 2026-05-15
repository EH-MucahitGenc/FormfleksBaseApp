import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';
import { PageHeader, FfButton } from '@/components/ui/index';
import { GlassCard } from '@/components/ui/GlassCard';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import DataGrid, { Column, SearchPanel, Paging, Pager, FilterRow, HeaderFilter, Summary, TotalItem, GroupPanel, Grouping } from 'devextreme-react/data-grid';
import { Download, FileText, Filter, PieChart as PieChartIcon, BarChart as BarChartIcon, Printer, TrendingUp, Clock, CheckCircle, XCircle, Building2, MapPin, Users } from 'lucide-react';
import { HrReportDetailModal } from './HrReportDetailModal';
import { exportHrReportToExcel } from './useExcelExport';
import { HrPrintDocument } from './HrPrintDocument';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { useReactToPrint } from 'react-to-print';

const COLORS = ['#F97316','#3B82F6','#10B981','#8B5CF6','#EC4899','#14B8A6','#F43F5E','#EAB308','#6366F1','#84CC16'];
const STATUS_COLORS: Record<string,string> = { 'Taslak':'#94A3B8','Onay Bekliyor':'#F59E0B','Onaylandı':'#10B981','Reddedildi':'#EF4444','İptal':'#64748B' };

export const HrReportingDashboard = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Formfleks_IK_Rapor' });

  // === Date filter ===
  const [dateMode, setDateMode] = useState<'all'|'thisMonth'|'lastMonth'|'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // === Cascading hierarchy: Şube → Departman → Personel ===
  const [selLocation, setSelLocation] = useState('');
  const [selDepartment, setSelDepartment] = useState('');
  const [selUserId, setSelUserId] = useState('');

  const [activeTab, setActiveTab] = useState<'summary'|'advanced'>('summary');
  const [selectedRow, setSelectedRow] = useState<{requestorUserId:string;formTypeId:string;title:string}|null>(null);

  const { start, end } = useMemo(() => {
    const today = new Date();
    if (dateMode === 'thisMonth') return { start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), end: today.toISOString() };
    if (dateMode === 'lastMonth') return { start: new Date(today.getFullYear(), today.getMonth()-1, 1).toISOString(), end: new Date(today.getFullYear(), today.getMonth(), 0, 23,59,59).toISOString() };
    if (dateMode === 'custom') return { start: customStart ? new Date(customStart).toISOString() : undefined, end: customEnd ? new Date(customEnd).toISOString() : undefined };
    return { start: undefined, end: undefined };
  }, [dateMode, customStart, customEnd]);

  // --- Cascade: Location list (always full) ---
  const { data: locationsList = [] } = useQuery({ queryKey: ['hr-locations'], queryFn: () => reportService.getLocations() });

  // --- Cascade: Departments filtered by selected location ---
  const { data: departmentsList = [] } = useQuery({
    queryKey: ['hr-departments', selLocation],
    queryFn: () => reportService.getDepartments(selLocation || undefined)
  });

  // --- Cascade: Personnel filtered by location + department ---
  const { data: personnelList = [] } = useQuery({
    queryKey: ['hr-personnel', selLocation, selDepartment],
    queryFn: () => reportService.getPersonnel(selLocation || undefined, selDepartment || undefined)
  });

  const requestorId = selUserId || undefined;
  const deptFilter  = selDepartment || undefined;
  const locFilter   = selLocation || undefined;

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['hr-summary', start, end, requestorId, deptFilter, locFilter],
    queryFn: () => reportService.getHrSummaryReport(start, end, requestorId, deptFilter, locFilter)
  });

  const { data: advancedData, isLoading: isAdvancedLoading } = useQuery({
    queryKey: ['hr-advanced', start, end, requestorId, deptFilter, locFilter],
    queryFn: () => reportService.getHrAdvancedAnalytics(start, end, requestorId, deptFilter, locFilter),
    enabled: activeTab === 'advanced'
  });

  const isLoading = isSummaryLoading || (activeTab === 'advanced' && isAdvancedLoading);

  // Cascade reset handlers
  const onLocationChange = (val: string) => { setSelLocation(val); setSelDepartment(''); setSelUserId(''); };
  const onDepartmentChange = (val: string) => { setSelDepartment(val); setSelUserId(''); };
  const clearAll = () => { setSelLocation(''); setSelDepartment(''); setSelUserId(''); setDateMode('all'); };

  const [exporting, setExporting] = useState(false);
  const handleExcelExport = async () => {
    if (!summaryData?.length) return;
    setExporting(true);
    try {
      const dateLabel = dateMode === 'all' ? undefined : dateMode === 'thisMonth' ? 'Bu Ay' : dateMode === 'lastMonth' ? 'Geçen Ay' : `${customStart} — ${customEnd}`;
      const personName = personnelList.find(p => p.userId === selUserId)?.fullName;
      await exportHrReportToExcel({
        summaryData,
        trendData: advancedData?.trendMetrics ?? [],
        filters: { location: selLocation || undefined, department: selDepartment || undefined, personName, dateLabel }
      });
    } finally {
      setExporting(false);
    }
  };

  const onRowClick = (e: any) => {
    if (e.rowType === 'data' && e.data) setSelectedRow({ requestorUserId: e.data.requestorUserId, formTypeId: e.data.formTypeId, title: `${e.data.fullName} - ${e.data.formTypeName} Detayları` });
  };

  // KPIs
  const totalForms    = summaryData?.reduce((s,c) => s + c.totalForms, 0) ?? 0;
  const totalApproved = summaryData?.reduce((s,c) => s + c.totalApproved, 0) ?? 0;
  const totalRejected = summaryData?.reduce((s,c) => s + c.totalRejected, 0) ?? 0;
  const approvalRate  = totalForms > 0 ? Math.round((totalApproved/totalForms)*100) : 0;
  const uniqueUsers   = new Set(summaryData?.map(d => d.requestorUserId)).size;

  const formCounts = summaryData?.reduce((acc: Record<string,number>, c) => { acc[c.formTypeName] = (acc[c.formTypeName]||0)+c.totalForms; return acc; }, {}) ?? {};
  const topForm = Object.entries(formCounts).sort((a,b)=>b[1]-a[1])[0] ?? null;
  const pieData = Object.entries(formCounts).map(([name,value]) => ({name,value}));

  const deptCounts = summaryData?.reduce((acc: Record<string,number>, c) => { const k = c.department&&c.department!=='-' ? c.department : 'Tanımlanmamış'; acc[k]=(acc[k]||0)+c.totalForms; return acc; }, {}) ?? {};
  const barData = Object.entries(deptCounts).map(([name,Formlar]) => ({name,Formlar})).sort((a,b)=>b.Formlar-a.Formlar).slice(0,10);

  const renderTooltip = ({active,payload}:any) => {
    if (!active||!payload?.length) return null;
    const item = payload[0];
    const label = item.payload?.name || item.payload?.dateLabel || item.payload?.formTypeName || item.payload?.statusName || '';
    return <div className="bg-surface-base border border-surface-muted shadow-xl rounded-xl px-4 py-3"><p className="text-xs font-semibold text-brand-dark mb-1">{label}</p><p className="text-sm font-bold text-brand-primary">{item.value} {item.dataKey==='averageCompletionDays'?'Gün':'Adet'}</p></div>;
  };

  const hasFilter = selLocation||selDepartment||selUserId||dateMode!=='all';

  const SelectBox = ({ icon, value, onChange, placeholder, children }: any) => (
    <div className="flex items-center gap-2 bg-surface-base border border-surface-muted rounded-xl px-3 py-2 min-w-[170px] shadow-sm">
      <span className="text-brand-gray shrink-0">{icon}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} className="text-xs font-medium text-brand-dark bg-transparent outline-none w-full cursor-pointer">
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-5 pb-12">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <PageHeader title="Yönetici Özeti (İK Paneli)" description="Şube → Departman → Personel hiyerarşik analiz platformu." />
        <FfButton variant="primary" size="sm" leftIcon={<Printer className="h-4 w-4"/>} onClick={() => handlePrint()}>PDF / Yazdır</FfButton>
      </div>

      {/* FILTER BAR */}
      <div className="bg-surface-base/90 backdrop-blur-md rounded-2xl border border-surface-muted shadow-sm p-4 flex flex-wrap gap-3 items-center">
        {/* Date */}
        <div className="flex items-center bg-surface-muted/40 p-1 rounded-xl border border-surface-muted/60 gap-0.5">
          {(['all','thisMonth','lastMonth','custom'] as const).map(m => (
            <button key={m} onClick={()=>setDateMode(m)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${dateMode===m?'bg-surface-base shadow text-brand-primary':'text-brand-gray hover:text-brand-dark'}`}>
              {m==='all'?'Tümü':m==='thisMonth'?'Bu Ay':m==='lastMonth'?'Geçen Ay':<span className="flex items-center gap-1"><Filter className="h-3 w-3"/>Özel</span>}
            </button>
          ))}
        </div>
        {dateMode==='custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="text-xs border border-surface-muted rounded-lg px-2 py-1.5 bg-surface-base"/>
            <span className="text-brand-gray text-xs">—</span>
            <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="text-xs border border-surface-muted rounded-lg px-2 py-1.5 bg-surface-base"/>
          </div>
        )}

        <div className="h-6 w-px bg-surface-muted"/>

        {/* Şube (Level 1) */}
        <SelectBox icon={<MapPin className="h-3.5 w-3.5"/>} value={selLocation} onChange={onLocationChange} placeholder="Tüm Şubeler">
          {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
        </SelectBox>

        {/* Departman (Level 2 — filtered by Şube) */}
        <SelectBox icon={<Building2 className="h-3.5 w-3.5"/>} value={selDepartment} onChange={onDepartmentChange} placeholder={selLocation ? 'Tüm Departmanlar' : 'Önce Şube Seçin'}>
          {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
        </SelectBox>

        {/* Personel (Level 3 — filtered by Şube+Departman) */}
        <SelectBox icon={<Users className="h-3.5 w-3.5"/>} value={selUserId} onChange={setSelUserId} placeholder={selDepartment ? 'Tüm Personeller' : 'Önce Departman Seçin'}>
          {personnelList.map(p => <option key={p.userId} value={p.userId}>{p.fullName}</option>)}
        </SelectBox>

        {hasFilter && (
          <button onClick={clearAll} className="text-xs text-red-500 font-medium hover:underline flex items-center gap-1 ml-auto">
            <XCircle className="h-3.5 w-3.5"/> Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Aktif filtre özeti */}
      {hasFilter && (
        <div className="flex flex-wrap gap-2 text-xs">
          {selLocation && <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium flex items-center gap-1"><MapPin className="h-3 w-3"/>{selLocation}</span>}
          {selDepartment && <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-3 py-1 font-medium flex items-center gap-1"><Building2 className="h-3 w-3"/>{selDepartment}</span>}
          {selUserId && personnelList.find(p=>p.userId===selUserId) && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 font-medium flex items-center gap-1"><Users className="h-3 w-3"/>{personnelList.find(p=>p.userId===selUserId)?.fullName}</span>}
          {dateMode!=='all' && <span className="bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1 font-medium">{dateMode==='thisMonth'?'Bu Ay':dateMode==='lastMonth'?'Geçen Ay':'Özel Tarih'}</span>}
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-1 bg-surface-muted/30 p-1 rounded-xl border border-surface-muted/50 w-fit">
        {[{id:'summary',label:'📊 Genel Özet & Tablo'},{id:'advanced',label:'🔬 İleri Seviye Analitikler'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab===t.id?'bg-surface-base shadow text-brand-primary':'text-brand-gray hover:text-brand-dark'}`}>{t.label}</button>
        ))}
      </div>

      {isLoading ? <FfSkeletonLoader type="grid" count={3}/> : (
        <div ref={printRef} className="flex flex-col gap-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {icon:<FileText className="h-5 w-5"/>, label:'Toplam Form', value:totalForms, color:'from-blue-500 to-blue-700'},
              {icon:<Users className="h-5 w-5"/>, label:'Aktif Personel', value:selUserId?1:uniqueUsers, color:'from-emerald-400 to-emerald-600'},
              {icon:<CheckCircle className="h-5 w-5"/>, label:'Onaylanan', value:totalApproved, color:'from-green-500 to-teal-600'},
              {icon:<XCircle className="h-5 w-5"/>, label:'Reddedilen', value:totalRejected, color:'from-red-500 to-rose-600'},
              {icon:<span className="text-base font-bold">%</span>, label:'Onay Oranı', value:`%${approvalRate}`, color:'from-violet-500 to-purple-700'},
            ].map((k,i)=>(
              <GlassCard key={i} className="flex items-center gap-4 py-4 relative overflow-hidden group">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${k.color} flex items-center justify-center text-white shadow-lg shrink-0`}>{k.icon}</div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-brand-gray truncate">{k.label}</span>
                  <span className="text-2xl font-bold text-brand-dark tracking-tight">{k.value}</span>
                </div>
              </GlassCard>
            ))}
          </div>

          {topForm && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-brand-primary/10 to-violet-500/10 border border-brand-primary/20 rounded-xl px-4 py-3">
              <span className="text-lg">🏆</span>
              <span className="text-sm font-medium text-brand-dark">En çok doldurulan form:</span>
              <span className="text-sm font-bold text-brand-primary">{topForm[0]}</span>
              <span className="ml-auto text-xs bg-brand-primary text-white rounded-full px-3 py-1 font-bold">{topForm[1]} adet</span>
            </div>
          )}

          {/* SUMMARY TAB */}
          {activeTab==='summary' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <GlassCard className="lg:col-span-2 flex flex-col">
                  <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-brand-primary"/> Form Tipi Dağılımı</h3>
                  <div style={{width:'100%',height:260}}>
                    {pieData.length>0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                            {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                          </Pie>
                          <RechartsTooltip content={renderTooltip}/>
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'10px'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                  </div>
                </GlassCard>

                <GlassCard className="lg:col-span-3 flex flex-col overflow-auto">
                  <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><BarChartIcon className="h-4 w-4 text-brand-primary"/> Departmanlara Göre Kullanım</h3>
                  <div style={{width:'100%', height: Math.max(240, barData.length*42)}}>
                    {barData.length>0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{top:5,right:30,left:10,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--app-surface-muted, #E2E8F0)"/>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-gray, #64748B)'}}/>
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-dark, #374151)'}} width={165}/>
                          <RechartsTooltip content={renderTooltip} cursor={{fill:'var(--app-surface-muted, #F1F5F9)'}}/>
                          <Bar dataKey="Formlar" radius={[0,6,6,0]} maxBarSize={26}>
                            {barData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                  </div>
                </GlassCard>
              </div>

              <GlassCard noPadding={false}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><FileText className="h-4 w-4 text-brand-primary"/> Detaylı Personel Karnesi</h3>
                  <FfButton variant="outline" size="sm" leftIcon={<Download className="h-4 w-4"/>} onClick={handleExcelExport} disabled={exporting || !summaryData?.length}>
                    {exporting ? 'Hazırlanıyor...' : 'Excel\'e Aktar'}
                  </FfButton>
                </div>
                <DataGrid dataSource={summaryData||[]} showBorders={false} columnAutoWidth={true} allowColumnResizing={true} rowAlternationEnabled={true} onExporting={(e:any)=>{e.cancel=true;}} onRowClick={onRowClick} hoverStateEnabled={true} className="w-full h-[420px] font-sans border border-surface-muted rounded-xl overflow-hidden">
                  <GroupPanel visible={true} emptyPanelText="Gruplamak istediğiniz sütunu sürükleyin"/>
                  <Grouping autoExpandAll={false}/>
                  <SearchPanel visible={true} width={240} placeholder="Ara..."/>
                  <FilterRow visible={true}/>
                  <HeaderFilter visible={true}/>
                  <Paging defaultPageSize={15}/>
                  <Pager showPageSizeSelector={true} allowedPageSizes={[10,15,30,50]} showInfo={true}/>
                  <Column dataField="fullName" caption="Personel" minWidth={150}/>
                  <Column dataField="department" caption="Departman" minWidth={130}/>
                  <Column dataField="location" caption="Şube"/>
                  <Column dataField="formTypeName" caption="Form Tipi" groupIndex={0}/>
                  <Column dataField="totalForms" caption="Toplam" alignment="center" dataType="number" cssClass="font-bold"/>
                  <Column dataField="totalApproved" caption="✅ Onaylanan" alignment="center" dataType="number" cssClass="text-emerald-600 font-medium"/>
                  <Column dataField="totalRejected" caption="❌ Reddedilen" alignment="center" dataType="number" cssClass="text-red-500 font-medium"/>
                  <Column dataField="totalDraft" caption="📝 Taslak" alignment="center" dataType="number" cssClass="text-slate-500 font-medium"/>
                  <Summary>
                    <TotalItem column="totalForms" summaryType="sum" displayFormat="Toplam: {0}"/>
                    <TotalItem column="totalApproved" summaryType="sum" displayFormat="✅ {0}"/>
                    <TotalItem column="totalRejected" summaryType="sum" displayFormat="❌ {0}"/>
                  </Summary>
                </DataGrid>
              </GlassCard>
            </div>
          )}

          {/* ADVANCED TAB */}
          {activeTab==='advanced' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="flex flex-col">
                <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-brand-primary"/> Süreç Hızı — Ortalama Onay Günleri</h3>
                <div style={{width:'100%',height:260}}>
                  {advancedData?.slaMetrics?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={advancedData.slaMetrics} layout="vertical" margin={{top:5,right:30,left:10,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--app-surface-muted, #E2E8F0)"/>
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-gray, #64748B)'}}/>
                        <YAxis dataKey="formTypeName" type="category" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'var(--app-brand-dark, #374151)'}} width={130}/>
                        <RechartsTooltip content={renderTooltip} cursor={{fill:'var(--app-surface-muted, #F1F5F9)'}}/>
                        <Bar dataKey="averageCompletionDays" radius={[0,6,6,0]} maxBarSize={26}>
                          {advancedData.slaMetrics.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col">
                <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-brand-primary"/> Form Durum Dağılımı</h3>
                <div style={{width:'100%',height:260}}>
                  {advancedData?.statusDistributions?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={advancedData.statusDistributions} cx="50%" cy="45%" outerRadius={90} dataKey="count" nameKey="statusName">
                          {advancedData.statusDistributions.map((e,i)=><Cell key={i} fill={STATUS_COLORS[e.statusName]||COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <RechartsTooltip content={renderTooltip}/>
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'10px'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-2 flex flex-col">
                <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-primary"/> Zaman Çizelgesi — Günlük Aktivite Trendi</h3>
                <div style={{width:'100%',height:260}}>
                  {advancedData?.trendMetrics?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={advancedData.trendMetrics} margin={{top:5,right:30,left:10,bottom:30}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-surface-muted, #E2E8F0)"/>
                        <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'var(--app-brand-gray, #64748B)'}} angle={-45} textAnchor="end" interval="preserveStartEnd"/>
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-gray, #64748B)'}}/>
                        <RechartsTooltip content={renderTooltip}/>
                        <Line type="monotone" dataKey="requestCount" name="Talep" stroke="#10B981" strokeWidth={3} dot={{r:4,fill:'#10B981',strokeWidth:2,stroke:'#FFF'}} activeDot={{r:6}}/>
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* ─── HIDDEN PRINT TEMPLATE ─── */}
      <div style={{ display: 'none' }}>
        <HrPrintDocument
          ref={printRef}
          summaryData={summaryData || []}
          filters={{
            location:   selLocation || undefined,
            department: selDepartment || undefined,
            personName: personnelList.find(p => p.userId === selUserId)?.fullName,
            dateLabel:  dateMode === 'all' ? undefined : dateMode === 'thisMonth' ? 'Bu Ay' : dateMode === 'lastMonth' ? 'Geçen Ay' : `${customStart} — ${customEnd}`
          }}
          generatedAt={new Date().toLocaleString('tr-TR')}
        />
      </div>

      {selectedRow && (
        <HrReportDetailModal isOpen={true} onClose={()=>setSelectedRow(null)}
          requestorUserId={selectedRow.requestorUserId} formTypeId={selectedRow.formTypeId}
          title={selectedRow.title} startDate={start} endDate={end}/>
      )}
    </div>
  );
};

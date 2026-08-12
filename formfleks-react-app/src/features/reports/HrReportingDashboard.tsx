import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';
import { FfButton, cn } from '@/components/ui/index';
import { GlassCard } from '@/components/ui/GlassCard';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import DataGrid, { Column, SearchPanel, Paging, Pager, FilterRow, HeaderFilter, Summary, TotalItem, GroupPanel, Grouping, ColumnChooser } from 'devextreme-react/data-grid';
import { Download, FileText, Filter, PieChart as PieChartIcon, BarChart as BarChartIcon, Printer, TrendingUp, Clock, CheckCircle, XCircle, Building2, MapPin, Users } from 'lucide-react';
import { HrReportDetailModal } from './HrReportDetailModal';
import { HrPrintDocument } from './HrPrintDocument';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList } from 'recharts';
import { useReactToPrint } from 'react-to-print';
import { HrDynamicFormReport } from './HrDynamicFormReport';
import { HrExportModal } from './HrExportModal';

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
  
  const [scorecardFormType, setScorecardFormType] = useState('');

  const [activeTab, setActiveTab] = useState<'summary'|'scorecard'|'form_details'>('summary');
  const [selectedRow, setSelectedRow] = useState<{requestorUserId:string;formTypeId:string;title:string}|null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
    enabled: activeTab === 'summary' // Advanced data is now merged into summary tab
  });

  const isLoading = isSummaryLoading || (activeTab === 'summary' && isAdvancedLoading);

  // Cascade reset handlers
  const onLocationChange = (val: string) => { setSelLocation(val); setSelDepartment(''); setSelUserId(''); };
  const onDepartmentChange = (val: string) => { setSelDepartment(val); setSelUserId(''); };
  const clearAll = () => { setSelLocation(''); setSelDepartment(''); setSelUserId(''); setDateMode('all'); };


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
  const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);
  const topPieItems = [...pieData].sort((a,b) => b.value - a.value).slice(0, 5);

  const deptCounts = summaryData?.reduce((acc: Record<string,number>, c) => { const k = c.department&&c.department!=='-' ? c.department : 'Tanımlanmamış'; acc[k]=(acc[k]||0)+c.totalForms; return acc; }, {}) ?? {};
  const barData = Object.entries(deptCounts).map(([name,Formlar]) => ({name,Formlar})).sort((a,b)=>b.Formlar-a.Formlar).slice(0,10);
  const leadingDepartment = barData[0];
  const statusData = advancedData?.statusDistributions ?? [];
  const statusTotal = statusData.reduce((sum, item) => sum + item.count, 0);
  const slaData = advancedData?.slaMetrics ?? [];
  const slowestSla = [...slaData].sort((a,b) => b.averageCompletionDays - a.averageCompletionDays)[0];

  const renderTooltip = ({active,payload}:any) => {
    if (!active||!payload?.length) return null;
    const item = payload[0];
    const label = item.payload?.name || item.payload?.dateLabel || item.payload?.formTypeName || item.payload?.statusName || '';
    return <div className="bg-surface-base border border-surface-muted shadow-xl rounded-xl px-4 py-3"><p className="text-xs font-semibold text-brand-dark mb-1">{label}</p><p className="text-sm font-bold text-brand-primary">{item.value} {item.dataKey==='averageCompletionDays'?'Gün':'Adet'}</p></div>;
  };

  const hasFilter = selLocation||selDepartment||selUserId||dateMode!=='all';

  const SelectBox = ({ icon, value, onChange, placeholder, children }: any) => (
    <div className="flex min-w-[210px] flex-1 items-center gap-2 rounded-xl border border-surface-muted bg-white px-3 py-2.5 shadow-soft transition-colors focus-within:border-brand-primary/45">
      <span className="text-brand-gray shrink-0">{icon}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} className="text-xs font-medium text-brand-dark bg-transparent outline-none w-full cursor-pointer">
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );

  const scorecardFormTypes = useMemo(() => {
    if (!summaryData) return [];
    return Array.from(new Set(summaryData.map(d => d.formTypeName))).sort();
  }, [summaryData]);

  const filteredScorecardData = useMemo(() => {
    if (!summaryData || !scorecardFormType) return [];
    return summaryData.filter(d => d.formTypeName === scorecardFormType);
  }, [summaryData, scorecardFormType]);

  return (
    <div className="flex h-full flex-col gap-5 pb-12">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100/80 bg-[radial-gradient(circle_at_top_right,rgba(255,122,61,0.14),transparent_32%),linear-gradient(135deg,#ffffff_0%,#fffaf6_50%,#f7f8fa_100%)] p-6 shadow-[0_22px_70px_rgba(24,24,27,0.08)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/78 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-primary shadow-soft">
              <BarChartIcon className="h-3.5 w-3.5" />
              Form analiz merkezi
            </div>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-brand-dark">Form Analizleri</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-gray">
              Şube, departman ve personel kırılımlarında form kullanımını, onay performansını ve süreç sağlığını tek ekrandan takip edin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FfButton variant="outline" size="sm" leftIcon={<Printer className="h-4 w-4"/>} onClick={handlePrint}>Yazdır</FfButton>
            <FfButton variant="outline" size="sm" leftIcon={<Download className="h-4 w-4"/>} onClick={() => setIsExportModalOpen(true)}>
              Excel'e Aktar
            </FfButton>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-surface-muted/80 bg-white p-4 shadow-[0_18px_55px_rgba(24,24,27,0.055)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-primary">Analiz kapsamı</div>
            <div className="mt-1 text-xs text-brand-gray">Tarih, şube, departman ve personel kırılımını seçin.</div>
          </div>
          {hasFilter && (
            <button onClick={clearAll} className="flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-status-danger transition-colors hover:bg-red-100">
              <XCircle className="h-3.5 w-3.5"/> Filtreleri Temizle
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center rounded-xl border border-surface-muted bg-surface-ground/45 p-1 shadow-inner">
          {(['all','thisMonth','lastMonth','custom'] as const).map(m => (
            <button key={m} onClick={()=>setDateMode(m)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-all', dateMode===m?'bg-white text-brand-primary shadow-soft':'text-brand-gray hover:text-brand-dark')}>
              {m==='all'?'Tümü':m==='thisMonth'?'Bu Ay':m==='lastMonth'?'Geçen Ay':<span className="flex items-center gap-1"><Filter className="h-3 w-3"/>Özel</span>}
            </button>
          ))}
        </div>
        {dateMode==='custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="rounded-lg border border-surface-muted bg-white px-2 py-1.5 text-xs"/>
            <span className="text-brand-gray text-xs">—</span>
            <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="rounded-lg border border-surface-muted bg-white px-2 py-1.5 text-xs"/>
          </div>
        )}

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
        </div>
      </section>

      {/* Aktif filtre özeti */}
      {hasFilter && (
        <div className="flex flex-wrap gap-2 text-xs">
          {selLocation && <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 font-medium flex items-center gap-1"><MapPin className="h-3 w-3"/>{selLocation}</span>}
          {selDepartment && <span className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-3 py-1 font-medium flex items-center gap-1"><Building2 className="h-3 w-3"/>{selDepartment}</span>}
          {selUserId && personnelList.find(p=>p.userId===selUserId) && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 font-medium flex items-center gap-1"><Users className="h-3 w-3"/>{personnelList.find(p=>p.userId===selUserId)?.fullName}</span>}
          {dateMode!=='all' && <span className="bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1 font-medium">{dateMode==='thisMonth'?'Bu Ay':dateMode==='lastMonth'?'Geçen Ay':'Özel Tarih'}</span>}
        </div>
      )}

      <div className="flex w-fit items-center gap-1 rounded-2xl border border-surface-muted/80 bg-white p-1 shadow-soft">
        {[
          { id: 'summary', label: 'Grafiksel Analizler', icon: <PieChartIcon className="h-4 w-4" /> },
          { id: 'scorecard', label: 'Personel Karnesi', icon: <Users className="h-4 w-4" /> },
          { id: 'form_details', label: 'Form Detay Raporları', icon: <FileText className="h-4 w-4" /> }
        ].map(t=>(
          <button 
            key={t.id} 
            onClick={()=>setActiveTab(t.id as any)} 
            className={cn('flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all', activeTab===t.id?'bg-brand-dark text-white shadow-soft':'text-brand-gray hover:bg-surface-ground hover:text-brand-dark')}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {isLoading ? <FfSkeletonLoader type="grid" count={3}/> : (
        <div ref={printRef} className="flex flex-col gap-6">
          {/* SUMMARY TAB: Charts only */}
          {activeTab==='summary' && (
            <div className="flex flex-col gap-6">
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  {icon:<FileText className="h-5 w-5"/>, label:'Toplam Form', value:totalForms, hint:'Seçili kapsamda üretilen kayıt', color:'bg-blue-50 text-blue-600 border-blue-100'},
                  {icon:<Users className="h-5 w-5"/>, label:'Aktif Personel', value:selUserId?1:uniqueUsers, hint:'Form hareketi olan kişi', color:'bg-emerald-50 text-emerald-600 border-emerald-100'},
                  {icon:<CheckCircle className="h-5 w-5"/>, label:'Onaylanan', value:totalApproved, hint:'Tamamlanan süreçler', color:'bg-green-50 text-green-600 border-green-100'},
                  {icon:<XCircle className="h-5 w-5"/>, label:'Reddedilen', value:totalRejected, hint:'Olumsuz sonuçlananlar', color:'bg-red-50 text-red-600 border-red-100'},
                  {icon:<span className="text-base font-bold">%</span>, label:'Onay Oranı', value:`%${approvalRate}`, hint:'Onaylanan / toplam', color:'bg-violet-50 text-violet-600 border-violet-100'},
                ].map((k,i)=>(
                  <div key={i} className="group relative overflow-hidden rounded-2xl border border-surface-muted/80 bg-white p-4 shadow-[0_14px_40px_rgba(24,24,27,0.055)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(24,24,27,0.075)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-gray">{k.label}</div>
                        <div className="mt-2 text-3xl font-extrabold leading-none text-brand-dark">{k.value}</div>
                        <div className="mt-2 text-xs font-medium leading-4 text-brand-gray">{k.hint}</div>
                      </div>
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border', k.color)}>{k.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {topForm && (
                <div className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#fffaf6_0%,#ffffff_68%,#f8fafc_100%)] px-5 py-4 shadow-soft sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-brand-primary">🏆</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gray">Öne çıkan form</div>
                    <div className="mt-1 truncate text-sm font-extrabold text-brand-dark">{topForm[0]}</div>
                  </div>
                  <span className="w-fit rounded-full bg-brand-primary px-3 py-1 text-xs font-bold text-white">{topForm[1]} adet</span>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <GlassCard className="flex flex-col overflow-hidden lg:col-span-2">
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-surface-muted pb-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-brand-dark"><PieChartIcon className="h-4 w-4 text-brand-primary"/> Form Tipi Dağılımı</h3>
                      <p className="mt-1 text-xs text-brand-gray">Hangi form tiplerinin yoğun kullanıldığını gösterir.</p>
                    </div>
                    <span className="rounded-full border border-surface-muted bg-surface-ground px-2.5 py-1 text-[11px] font-bold text-brand-gray">{pieData.length} tip</span>
                  </div>
                  <div className="grid min-h-[280px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_190px]">
                    <div className="relative h-[260px]">
                    {pieData.length>0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={4} dataKey="value" stroke="#fff" strokeWidth={3}>
                            {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                          </Pie>
                          <RechartsTooltip content={renderTooltip}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                      {pieData.length > 0 && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-extrabold leading-none text-brand-dark">{pieTotal}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-gray">form</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 self-center">
                      {topPieItems.map((item, i) => (
                        <div key={item.name} className="rounded-xl border border-surface-muted bg-surface-ground/35 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="truncate text-xs font-bold text-brand-dark">{item.name}</span>
                            </div>
                            <span className="text-xs font-extrabold text-brand-primary">{pieTotal ? Math.round((item.value / pieTotal) * 100) : 0}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                            <div className="h-full rounded-full" style={{ width: `${pieTotal ? Math.max(4, Math.round((item.value / pieTotal) * 100)) : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="flex flex-col overflow-auto lg:col-span-3">
                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-surface-muted pb-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-brand-dark"><BarChartIcon className="h-4 w-4 text-brand-primary"/> Departmanlara Göre Kullanım</h3>
                      <p className="mt-1 text-xs text-brand-gray">En çok form üreten departmanları sıralar.</p>
                    </div>
                    <span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-brand-primary">
                      {leadingDepartment ? `${leadingDepartment.name}: ${leadingDepartment.Formlar}` : 'İlk 10'}
                    </span>
                  </div>
                  <div style={{width:'100%', height: Math.max(280, barData.length*46)}}>
                    {barData.length>0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{top:8,right:44,left:12,bottom:8}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(226,232,240,0.75)"/>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-gray, #64748B)'}}/>
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-dark, #374151)'}} width={165}/>
                          <RechartsTooltip content={renderTooltip} cursor={{fill:'rgba(255,122,61,0.05)'}}/>
                          <Bar dataKey="Formlar" radius={[0,10,10,0]} maxBarSize={28} background={{ fill: '#f1f5f9', radius: 10 }}>
                            {barData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                            <LabelList dataKey="Formlar" position="right" className="fill-brand-dark" fontSize={11} fontWeight={800} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                  </div>
                </GlassCard>
              </div>

              {/* Advanced charts moved here */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="flex flex-col">
                  <div className="mb-4 border-b border-surface-muted pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-extrabold text-brand-dark"><Clock className="h-4 w-4 text-brand-primary"/> Süreç Hızı</h3>
                        <p className="mt-1 text-xs text-brand-gray">Form tipine göre ortalama onay günleri.</p>
                      </div>
                      {slowestSla && (
                        <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-status-warning">
                          En yavaş: {slowestSla.averageCompletionDays} gün
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{width:'100%',height:280}}>
                    {slaData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={slaData} layout="vertical" margin={{top:8,right:48,left:10,bottom:8}}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(226,232,240,0.75)"/>
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--app-brand-gray, #64748B)'}}/>
                          <YAxis dataKey="formTypeName" type="category" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'var(--app-brand-dark, #374151)'}} width={130}/>
                          <RechartsTooltip content={renderTooltip} cursor={{fill:'rgba(245,158,11,0.06)'}}/>
                          <Bar dataKey="averageCompletionDays" radius={[0,10,10,0]} maxBarSize={28} background={{ fill: '#f1f5f9', radius: 10 }}>
                            {slaData.map((item,i)=><Cell key={i} fill={item.averageCompletionDays > 3 ? '#F97316' : COLORS[(i+2)%COLORS.length]}/>)}
                            <LabelList dataKey="averageCompletionDays" position="right" formatter={(value: any) => `${value}g`} fontSize={11} fontWeight={800} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                  </div>
                </GlassCard>

                <GlassCard className="flex flex-col">
                  <div className="mb-4 border-b border-surface-muted pb-4">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-brand-dark"><PieChartIcon className="h-4 w-4 text-brand-primary"/> Form Durum Dağılımı</h3>
                    <p className="mt-1 text-xs text-brand-gray">Talep durumlarının genel dağılımı.</p>
                  </div>
                  <div className="grid min-h-[280px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_190px]">
                    <div className="relative h-[260px]">
                    {statusData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="count" nameKey="statusName" stroke="#fff" strokeWidth={3}>
                            {statusData.map((e,i)=><Cell key={i} fill={STATUS_COLORS[e.statusName]||COLORS[i%COLORS.length]}/>)}
                          </Pie>
                          <RechartsTooltip content={renderTooltip}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                      {statusData.length > 0 && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-3xl font-extrabold leading-none text-brand-dark">{statusTotal}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-gray">talep</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 self-center">
                      {statusData.map((item, i) => {
                        const color = STATUS_COLORS[item.statusName] || COLORS[i % COLORS.length];
                        const percent = statusTotal ? Math.round((item.count / statusTotal) * 100) : 0;
                        return (
                          <div key={item.statusName} className="rounded-xl border border-surface-muted bg-surface-ground/35 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                <span className="truncate text-xs font-bold text-brand-dark">{item.statusName}</span>
                              </div>
                              <span className="text-xs font-extrabold text-brand-primary">{percent}%</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(4, percent)}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-[11px] font-bold text-brand-gray">{item.count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="flex flex-col lg:col-span-2">
                  <div className="mb-4 border-b border-surface-muted pb-4">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-brand-dark"><TrendingUp className="h-4 w-4 text-brand-primary"/> Günlük Aktivite Trendi</h3>
                    <p className="mt-1 text-xs text-brand-gray">Seçili kapsamda günlük talep hareketliliği.</p>
                  </div>
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
            </div>
          )}

          {/* SCORECARD TAB: DataGrid Full Page */}
          {activeTab==='scorecard' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 rounded-2xl border border-surface-muted/80 bg-white p-5 shadow-[0_18px_55px_rgba(24,24,27,0.055)] lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 text-brand-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-brand-dark">Personel Karnesi</h3>
                    <p className="text-xs text-brand-gray">Form tipini seçerek kişi bazlı performans ve sonuçları inceleyin.</p>
                  </div>
                </div>
                <select
                  value={scorecardFormType}
                  onChange={(e) => setScorecardFormType(e.target.value)}
                  className="min-w-[260px] rounded-xl border border-surface-muted bg-surface-ground/45 px-4 py-2.5 text-sm font-semibold text-brand-dark outline-none transition-colors focus:border-brand-primary/45"
                >
                  <option value="">-- Form Tipi Seçiniz --</option>
                  {scorecardFormTypes.map(ft => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>
              </div>

              {scorecardFormType ? (
                <GlassCard noPadding={false} className="flex-1 min-h-[500px]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><Users className="h-4 w-4 text-brand-primary"/> Detaylı Personel Karnesi</h3>
                  </div>
                  <DataGrid 
                    dataSource={filteredScorecardData} 
                    showBorders={true} 
                    columnAutoWidth={true} 
                    allowColumnResizing={true} 
                    allowColumnReordering={true}
                    wordWrapEnabled={true}
                    rowAlternationEnabled={true} 
                    onExporting={(e:any)=>{e.cancel=true;}} 
                    onRowClick={onRowClick} 
                    hoverStateEnabled={true} 
                    className="formfleks-premium-grid ff-grid-restored h-[calc(100vh-280px)] w-full font-sans"
                  >
                    <ColumnChooser enabled={true} mode="select" />
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
                    <Column dataField="formTypeName" caption="Form Tipi" visible={false} />
                    <Column dataField="totalForms" caption="Toplam" alignment="center" dataType="number" cssClass="font-bold"/>
                    <Column dataField="totalApproved" caption="✅ Onaylanan" alignment="center" dataType="number" cssClass="text-emerald-600 font-medium"/>
                    <Column dataField="totalRejected" caption="❌ Reddedilen" alignment="center" dataType="number" cssClass="text-red-500 font-medium"/>
                    <Summary>
                      <TotalItem column="totalForms" summaryType="sum" displayFormat="Toplam: {0}"/>
                      <TotalItem column="totalApproved" summaryType="sum" displayFormat="✅ {0}"/>
                      <TotalItem column="totalRejected" summaryType="sum" displayFormat="❌ {0}"/>
                    </Summary>
                  </DataGrid>
                </GlassCard>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-muted bg-white/70 py-20">
                  <Users className="mb-4 h-12 w-12 text-brand-gray/30" />
                  <h4 className="text-base font-bold text-brand-dark">Form tipi seçerek başlayın</h4>
                  <p className="mt-1 text-sm text-brand-gray">Personel karnesini oluşturmak için yukarıdan bir form tipi seçmelisiniz.</p>
                </div>
              )}
            </div>
          )}

          {/* FORM DETAILS TAB */}
          {activeTab==='form_details' && (
            <HrDynamicFormReport startDate={start} endDate={end} />
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
        <HrReportDetailModal 
          isOpen={!!selectedRow} 
          onClose={()=>setSelectedRow(null)} 
          requestorUserId={selectedRow.requestorUserId} 
          formTypeId={selectedRow.formTypeId} 
          title={selectedRow.title} 
          startDate={start} 
          endDate={end}
        />
      )}

      {isExportModalOpen && (
        <HrExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          defaultStartDate={start}
          defaultEndDate={end}
          availableFormTypes={scorecardFormTypes}
        />
      )}
    </div>
  );
};

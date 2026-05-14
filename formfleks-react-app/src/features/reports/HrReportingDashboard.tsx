import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/report.service';
import { adminService } from '@/services/admin.service';
import { PageHeader, FfButton } from '@/components/ui/index';
import { GlassCard } from '@/components/ui/GlassCard';
import { FfSkeletonLoader } from '@/components/shared/FfSkeletonLoader';
import DataGrid, { 
  Column, 
  SearchPanel, 
  Paging, 
  Pager,
  FilterRow,
  HeaderFilter,
  Summary,
  TotalItem,
  GroupPanel,
  Grouping
} from 'devextreme-react/data-grid';
import { Download, Activity, Users, FileText, Calendar, Filter, PieChart as PieChartIcon, BarChart as BarChartIcon, Printer, TrendingUp, Clock } from 'lucide-react';
import { HrReportDetailModal } from './HrReportDetailModal';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { useReactToPrint } from 'react-to-print';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E', '#EAB308'];
const STATUS_COLORS = {
  'Taslak': '#94A3B8',
  'Onay Bekliyor': '#F59E0B',
  'Onaylandı': '#10B981',
  'Reddedildi': '#EF4444',
  'İptal': '#64748B'
};

export const HrReportingDashboard = () => {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'IK_Form_Analiz_Raporu',
    bodyClass: 'print-body',
  });

  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'thisMonth' | 'lastMonth' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'summary' | 'advanced'>('summary');
  
  const [selectedRow, setSelectedRow] = useState<{ requestorUserId: string; formTypeId: string; title: string } | null>(null);
  
  const { start, end } = useMemo(() => {
    const today = new Date();
    if (dateRangeMode === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: start.toISOString(), end: today.toISOString() };
    }
    if (dateRangeMode === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (dateRangeMode === 'custom') {
      return { 
        start: customStart ? new Date(customStart).toISOString() : undefined, 
        end: customEnd ? new Date(customEnd).toISOString() : undefined 
      };
    }
    return { start: undefined, end: undefined };
  }, [dateRangeMode, customStart, customEnd]);
  const requestorId = selectedUserId === '' ? undefined : selectedUserId;

  // Data Fetching
  const { data: usersList } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.getUsers()
  });

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['hr-summary-report', start, end, requestorId],
    queryFn: () => reportService.getHrSummaryReport(start, end, requestorId)
  });

  const { data: advancedData, isLoading: isAdvancedLoading } = useQuery({
    queryKey: ['hr-advanced-analytics', start, end, requestorId],
    queryFn: () => reportService.getHrAdvancedAnalytics(start, end, requestorId),
    enabled: activeTab === 'advanced'
  });

  const isLoading = isSummaryLoading || (activeTab === 'advanced' && isAdvancedLoading);

  const onExporting = (e: any) => { e.cancel = true; };
  const onRowClick = (e: any) => {
    if (e.rowType === 'data' && e.data) {
      setSelectedRow({
        requestorUserId: e.data.requestorUserId,
        formTypeId: e.data.formTypeId,
        title: `${e.data.fullName} - ${e.data.formTypeName} Detayları`
      });
    }
  };

  // KPI Calculations (Summary)
  const totalForms = summaryData?.reduce((acc, curr) => acc + curr.totalForms, 0) || 0;
  const uniqueUsers = new Set(summaryData?.map(d => d.requestorUserId)).size;
  
  const formCounts = summaryData?.reduce((acc: Record<string, number>, curr) => {
    acc[curr.formTypeName] = (acc[curr.formTypeName] || 0) + curr.totalForms;
    return acc;
  }, {});
  
  const topFormEntry = formCounts && Object.keys(formCounts).length > 0 
    ? Object.entries(formCounts).sort((a, b) => b[1] - a[1])[0] 
    : null;

  // Chart Data (Summary)
  const pieData = Object.entries(formCounts || {}).map(([name, value]) => ({ name, value }));
  
  const deptCounts = summaryData?.reduce((acc: Record<string, number>, curr) => {
    acc[curr.department] = (acc[curr.department] || 0) + curr.totalForms;
    return acc;
  }, {});
  
  const barData = Object.entries(deptCounts || {})
    .map(([name, Formlar]) => ({ name, Formlar }))
    .sort((a, b) => b.Formlar - a.Formlar)
    .slice(0, 10); // Top 10

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-base p-3 border border-surface-muted shadow-lg rounded-lg">
          <p className="text-sm font-semibold text-brand-dark mb-1">{payload[0].name || payload[0].payload.dateLabel || payload[0].payload.statusName || payload[0].payload.formTypeName}</p>
          <p className="text-sm text-brand-primary font-medium">{payload[0].value} {payload[0].dataKey === 'averageCompletionDays' ? 'Gün (Ortalama)' : 'Adet'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-12">
      {/* Header and Master Filters */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <PageHeader 
          title="Yönetici Özeti (İK Paneli)" 
          description="Personel aktivite analizleri, trendler ve form kullanım dağılımları."
        />

        <div className="flex flex-col sm:flex-row gap-3">
          {/* User Selector */}
          <div className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-surface-muted shadow-sm flex items-center min-w-[200px]">
            <Users className="h-4 w-4 text-brand-gray mr-2" />
            <select 
              className="w-full text-xs font-medium text-brand-dark bg-transparent outline-none cursor-pointer"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Tüm Personeller</option>
              {usersList?.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-2 rounded-xl border border-surface-muted shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center bg-surface-muted/30 p-1 rounded-lg border border-surface-muted/50">
              <button onClick={() => setDateRangeMode('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateRangeMode === 'all' ? 'bg-white shadow-sm text-brand-primary scale-105' : 'text-brand-gray hover:text-brand-dark'}`}>Tümü</button>
              <button onClick={() => setDateRangeMode('thisMonth')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateRangeMode === 'thisMonth' ? 'bg-white shadow-sm text-brand-primary scale-105' : 'text-brand-gray hover:text-brand-dark'}`}>Bu Ay</button>
              <button onClick={() => setDateRangeMode('lastMonth')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${dateRangeMode === 'lastMonth' ? 'bg-white shadow-sm text-brand-primary scale-105' : 'text-brand-gray hover:text-brand-dark'}`}>Geçen Ay</button>
              <button onClick={() => setDateRangeMode('custom')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${dateRangeMode === 'custom' ? 'bg-white shadow-sm text-brand-primary scale-105' : 'text-brand-gray hover:text-brand-dark'}`}><Filter className="h-3 w-3" /> Özel</button>
            </div>
            
            {dateRangeMode === 'custom' && (
              <div className="flex items-center gap-2 animate-fade-in-up">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-xs border border-surface-muted rounded-md px-2 py-1.5" />
                <span className="text-brand-gray">-</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-xs border border-surface-muted rounded-md px-2 py-1.5" />
              </div>
            )}
            
            <FfButton variant="primary" size="sm" leftIcon={<Printer className="h-4 w-4" />} onClick={() => handlePrint()}>
              PDF İndir
            </FfButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-surface-muted px-2">
        <button 
          onClick={() => setActiveTab('summary')}
          className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === 'summary' ? 'text-brand-primary' : 'text-brand-gray hover:text-brand-dark'}`}
        >
          Genel Özet & Tablo
          {activeTab === 'summary' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--brand-primary),0.5)]"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('advanced')}
          className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === 'advanced' ? 'text-brand-primary' : 'text-brand-gray hover:text-brand-dark'}`}
        >
          İleri Seviye Analitikler
          {activeTab === 'advanced' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary rounded-t-full shadow-[0_-2px_8px_rgba(var(--brand-primary),0.5)]"></div>}
        </button>
      </div>

      {isLoading ? (
        <FfSkeletonLoader type="grid" count={3} />
      ) : (
        <div ref={printRef} className="print:p-8 flex flex-col gap-6 bg-[#f8fafc] print:bg-white rounded-xl">
          
          {/* COMMON KPI CARDS (Always visible in print or screen) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="flex items-center gap-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-brand-primary/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-brand-primary/30 shrink-0"><FileText className="h-6 w-6" /></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-brand-gray">Toplam İşlem</span>
                <span className="text-3xl font-bold text-brand-dark tracking-tight">{totalForms}</span>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0"><Users className="h-6 w-6" /></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-brand-gray">Aktif Personel {selectedUserId && '(Seçili)'}</span>
                <span className="text-3xl font-bold text-brand-dark tracking-tight">{selectedUserId ? 1 : uniqueUsers}</span>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-5 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-orange-500/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0"><Activity className="h-6 w-6" /></div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-brand-gray">Popüler Form</span>
                <span className="text-xl font-bold text-brand-dark leading-tight line-clamp-1" title={topFormEntry?.[0] || '-'}>{topFormEntry?.[0] || '-'}</span>
                <span className="text-xs text-brand-primary font-medium mt-0.5">{topFormEntry?.[1] || 0} Adet</span>
              </div>
            </GlassCard>
          </div>

          {/* TAB 1: SUMMARY */}
          <div className={activeTab === 'summary' ? 'flex flex-col gap-6' : 'hidden print:flex print:flex-col print:gap-6'}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="lg:col-span-1 flex flex-col h-[350px]">
                <h3 className="text-sm font-semibold text-brand-dark mb-6 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-brand-primary" /> Form Tipi Dağılımı</h3>
                <div style={{ width: '100%', height: 250 }}>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value">
                          {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip content={renderCustomTooltip} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-2 flex flex-col h-[350px]">
                <h3 className="text-sm font-semibold text-brand-dark mb-6 flex items-center gap-2"><BarChartIcon className="h-4 w-4 text-brand-primary" /> Departmanlara Göre Kullanım (İlk 10)</h3>
                <div style={{ width: '100%', height: 250 }}>
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} interval={0} angle={-45} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="Formlar" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {barData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>
            </div>

            <GlassCard className="mt-2 print:hidden" noPadding={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-primary" /> Detaylı Ham Veri (Personel Bazlı)</h3>
                <FfButton variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => alert("Dışa aktarım özelliği çok yakında!")}>Excel'e Aktar</FfButton>
              </div>
              <DataGrid
                dataSource={summaryData || []}
                showBorders={false} columnAutoWidth={true} allowColumnResizing={true} rowAlternationEnabled={true}
                onExporting={onExporting} onRowClick={onRowClick} hoverStateEnabled={true}
                className="w-full h-[400px] font-sans border border-surface-muted rounded-xl overflow-hidden"
              >
                <GroupPanel visible={true} emptyPanelText="Gruplamak istediğiniz sütunu buraya sürükleyin" />
                <Grouping autoExpandAll={false} />
                <SearchPanel visible={true} width={240} placeholder="Ara..." />
                <FilterRow visible={true} />
                <HeaderFilter visible={true} />
                <Paging defaultPageSize={10} />
                <Pager showPageSizeSelector={true} allowedPageSizes={[10, 20, 50]} showInfo={true} />
                <Column dataField="fullName" caption="Personel" minWidth={150} />
                <Column dataField="department" caption="Departman" />
                <Column dataField="location" caption="Lokasyon / Şube" />
                <Column dataField="formTypeName" caption="Form Tipi" groupIndex={0} />
                <Column dataField="totalForms" caption="Toplam Form" alignment="center" dataType="number" cssClass="font-bold text-brand-dark" />
                <Column dataField="totalApproved" caption="Onaylanan" alignment="center" dataType="number" cssClass="font-medium text-emerald-600" />
                <Column dataField="totalRejected" caption="Reddedilen" alignment="center" dataType="number" cssClass="font-medium text-red-500" />
                <Column dataField="totalDraft" caption="Taslak" alignment="center" dataType="number" cssClass="font-medium text-brand-gray" />
                <Summary>
                  <TotalItem column="totalForms" summaryType="sum" displayFormat="Toplam: {0}" />
                  <TotalItem column="totalApproved" summaryType="sum" displayFormat="Onaylanan: {0}" />
                </Summary>
              </DataGrid>
            </GlassCard>
          </div>

          {/* TAB 2: ADVANCED ANALYTICS */}
          <div className={activeTab === 'advanced' ? 'flex flex-col gap-6' : 'hidden print:flex print:flex-col print:gap-6 print:mt-10'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <GlassCard className="flex flex-col h-[350px]">
                <h3 className="text-sm font-semibold text-brand-dark mb-6 flex items-center gap-2"><Clock className="h-4 w-4 text-brand-primary" /> Süreç Hızı (Ortalama Onay Günleri)</h3>
                <div style={{ width: '100%', height: 250 }}>
                  {advancedData?.slaMetrics && advancedData.slaMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={advancedData.slaMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 25 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis dataKey="formTypeName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} width={120} />
                        <RechartsTooltip content={renderCustomTooltip} cursor={{ fill: '#F1F5F9' }} />
                        <Bar dataKey="averageCompletionDays" fill="#8B5CF6" radius={[0, 4, 4, 0]} maxBarSize={30}>
                          {advancedData.slaMetrics.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col h-[350px]">
                <h3 className="text-sm font-semibold text-brand-dark mb-6 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-brand-primary" /> Form Durum Dağılımı</h3>
                <div style={{ width: '100%', height: 250 }}>
                  {advancedData?.statusDistributions && advancedData.statusDistributions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={advancedData.statusDistributions} cx="50%" cy="50%" innerRadius={0} outerRadius={95} dataKey="count" nameKey="statusName">
                          {advancedData.statusDistributions.map((entry, index) => <Cell key={`cell-${index}`} fill={(STATUS_COLORS as any)[entry.statusName] || COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip content={renderCustomTooltip} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-2 flex flex-col h-[350px]">
                <h3 className="text-sm font-semibold text-brand-dark mb-6 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-primary" /> Zaman Çizelgesi (Aktivite Trendi)</h3>
                <div style={{ width: '100%', height: 250 }}>
                  {advancedData?.trendMetrics && advancedData.trendMetrics.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={advancedData.trendMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} interval="preserveStartEnd" angle={-45} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                        <RechartsTooltip content={renderCustomTooltip} />
                        <Line type="monotone" dataKey="requestCount" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#FFF' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-brand-gray italic">Veri bulunamadı.</div>}
                </div>
              </GlassCard>

            </div>
          </div>

        </div>
      )}

      {selectedRow && (
        <HrReportDetailModal
          isOpen={true}
          onClose={() => setSelectedRow(null)}
          requestorUserId={selectedRow.requestorUserId}
          formTypeId={selectedRow.formTypeId}
          title={selectedRow.title}
          startDate={start}
          endDate={end}
        />
      )}
    </div>
  );
};

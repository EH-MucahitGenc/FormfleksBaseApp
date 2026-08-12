import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FfButton, PageContainer, GlassCard, cn } from '@/components/ui/index';
import { FfDataGrid } from '@/components/dev-extreme/FfDataGrid';
import { formService, type MyFormRequestListItemDto } from '@/services/form.service';
import { queryKeys } from '@/lib/query-keys';
import { CheckCircle, Clock, Edit2, FileText, ListFilter, Plus, RotateCcw } from 'lucide-react';

const statusConfig = {
  1: {
    label: 'Taslak',
    tone: 'border-surface-muted bg-surface-muted/70 text-brand-gray',
    dot: 'bg-brand-gray',
  },
  2: {
    label: 'Değerlendirmede',
    tone: 'border-blue-100 bg-blue-50 text-status-info',
    dot: 'bg-status-info',
  },
  3: {
    label: 'Onay Bekliyor',
    tone: 'border-orange-100 bg-orange-50 text-brand-primary',
    dot: 'bg-brand-primary',
  },
  4: {
    label: 'Onaylandı',
    tone: 'border-emerald-100 bg-emerald-50 text-status-success',
    dot: 'bg-status-success',
  },
  5: {
    label: 'Reddedildi',
    tone: 'border-red-100 bg-red-50 text-status-danger',
    dot: 'bg-status-danger',
  },
  6: {
    label: 'İptal Edildi',
    tone: 'border-surface-muted bg-surface-muted/70 text-brand-gray',
    dot: 'bg-brand-gray',
  },
  7: {
    label: 'Revizyon Bekliyor',
    tone: 'border-amber-100 bg-amber-50 text-status-warning',
    dot: 'bg-status-warning',
  },
} as const;

const statusQueryMap: Record<string, number> = {
  draft: 1,
  pending: 3,
  approved: 4,
  rejected: 5,
  returned: 7,
};

const filterChips = [
  { label: 'Tümü', value: null },
  { label: 'Onay Bekliyor', value: 'pending' },
  { label: 'Onaylandı', value: 'approved' },
  { label: 'Reddedildi', value: 'rejected' },
  { label: 'Revizyon', value: 'returned' },
  { label: 'Taslak', value: 'draft' },
];

const getStatusMeta = (status: MyFormRequestListItemDto['status']) => statusConfig[status] || statusConfig[1];

export const MyForms: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusQuery = searchParams.get('status');
  const defaultStatusFilter = statusQuery ? statusQueryMap[statusQuery] ?? null : null;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.forms.myRequests,
    queryFn: formService.getMyRequests,
  });

  const filteredRequests = defaultStatusFilter
    ? requests.filter((request) => request.status === defaultStatusFilter)
    : requests;
  const approvedCount = requests.filter((request) => request.status === 4).length;
  const pendingCount = requests.filter((request) => request.status === 3).length;
  const revisionCount = requests.filter((request) => request.status === 7).length;
  const activeFilterLabel = filterChips.find((chip) => chip.value === statusQuery)?.label || 'Tümü';

  const handleFilterChange = (value: string | null) => {
    navigate(value ? `/forms?status=${value}` : '/forms');
  };

  const statusRenderer = (data: { data: MyFormRequestListItemDto }) => {
    const meta = getStatusMeta(data.data.status);

    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', meta.tone)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>
    );
  };

  const requestNoRenderer = (cell: { data: MyFormRequestListItemDto }) => {
    const data = cell.data;
    const isDraft = data.status === 1;
    return (
      <Link
        to={`/forms/${data.requestId}`}
        className={cn(
          'group inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 font-semibold transition-colors hover:bg-orange-50',
          isDraft ? 'text-brand-accent' : 'text-brand-primary'
        )}
        title={isDraft ? 'Taslağı Düzenlemeye Devam Et' : 'Form Detayını Görüntüle'}
      >
        <span>{data.requestNo}</span>
        {isDraft && <Edit2 className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
      </Link>
    );
  };

  const stepRenderer = (cell: { data: MyFormRequestListItemDto }) => {
    const data = cell.data;
    if (data.currentStepNo) {
      return (
        <span className="inline-flex items-center rounded-full border border-brand-accent/20 bg-brand-accent/10 px-2.5 py-1 text-xs font-semibold text-brand-accent">
          Adım {data.currentStepNo}
        </span>
      );
    }
    return <span className="text-brand-gray/50">-</span>;
  };

  const dateRenderer = (cell: { data: MyFormRequestListItemDto }) => {
    const date = new Date(cell.data.createdAt);
    return (
      <span className="text-brand-gray">
        {date.toLocaleDateString('tr-TR')} {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    );
  };

  const columns = [
    { dataField: 'requestNo', caption: 'Talep No', minWidth: 150, cellRender: requestNoRenderer },
    { dataField: 'formTypeName', caption: 'Form Tipi', minWidth: 240 },
    { dataField: 'subjectPersonName', caption: 'İlgili Kişi / Konu', minWidth: 170 },
    { dataField: 'status', caption: 'Durum', minWidth: 150, cellRender: statusRenderer, filterValue: defaultStatusFilter ?? undefined, dataType: 'number' as const },
    { dataField: 'currentStepNo', caption: 'Adım', minWidth: 100, cellRender: stepRenderer, allowFiltering: false },
    { dataField: 'createdAt', caption: 'Tarih', minWidth: 170, cellRender: dateRenderer, dataType: 'date' as const },
  ];

  return (
    <PageContainer maxWidth="full" className="pb-10">
      <section className="relative overflow-hidden rounded-2xl border border-surface-muted/80 bg-[linear-gradient(135deg,#ffffff_0%,#fff9f5_52%,#f7f8fa_100%)] p-6 shadow-soft">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav className="mb-4 flex items-center gap-2 text-xs font-medium text-brand-gray">
              <span>Anasayfa</span>
              <span className="text-brand-gray/40">/</span>
              <span className="text-brand-dark">Form Talepleri</span>
            </nav>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-gray shadow-soft">
              <FileText className="h-3.5 w-3.5 text-brand-primary" />
              Talep Merkezi
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-dark lg:text-4xl">Form Talepleri</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-gray">
              Gönderdiğiniz formları, onay durumlarını ve revizyon bekleyen süreçleri tek bir düzenli listeden takip edin.
            </p>
          </div>

          <FfButton
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/forms/create')}
          >
            Yeni Form
          </FfButton>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-surface-muted/80 bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Toplam</span>
              <FileText className="h-4 w-4 text-brand-gray" />
            </div>
            <div className="mt-3 text-3xl font-semibold leading-none text-brand-dark">{requests.length}</div>
            <div className="mt-2 text-xs text-brand-gray">Tüm talep kayıtları</div>
          </div>
          <div className="rounded-xl border border-orange-100 bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Bekleyen</span>
              <Clock className="h-4 w-4 text-brand-primary" />
            </div>
            <div className="mt-3 text-3xl font-semibold leading-none text-brand-dark">{pendingCount}</div>
            <div className="mt-2 text-xs text-brand-gray">Onay akışındaki işler</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Onaylanan</span>
              <CheckCircle className="h-4 w-4 text-status-success" />
            </div>
            <div className="mt-3 text-3xl font-semibold leading-none text-brand-dark">{approvedCount}</div>
            <div className="mt-2 text-xs text-brand-gray">Tamamlanan formlar</div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-white/80 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-gray">Revizyon</span>
              <RotateCcw className="h-4 w-4 text-status-warning" />
            </div>
            <div className="mt-3 text-3xl font-semibold leading-none text-brand-dark">{revisionCount}</div>
            <div className="mt-2 text-xs text-brand-gray">Düzeltme bekleyenler</div>
          </div>
        </div>
      </section>

      <GlassCard noPadding className="overflow-hidden border-surface-muted/80 bg-white shadow-[0_18px_55px_rgba(24,24,27,0.08)]">
        <div className="flex flex-col gap-4 border-b border-surface-muted/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfc_100%)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-brand-primary" />
              <h2 className="text-sm font-semibold text-brand-dark">Talep Listesi</h2>
            </div>
            <p className="mt-1 text-xs text-brand-gray">
              {activeFilterLabel} görünümünde {filteredRequests.length} kayıt listeleniyor.
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-wrap xl:overflow-visible xl:pb-0">
            {filterChips.map((chip) => {
              const isActive = chip.value === statusQuery || (!chip.value && !statusQuery);
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleFilterChange(chip.value)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-brand-primary bg-orange-50 text-brand-primary'
                      : 'border-surface-muted bg-surface-base text-brand-gray hover:border-orange-100 hover:bg-orange-50/55 hover:text-brand-dark'
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <FfDataGrid
            key={`my-forms-grid-${statusQuery || 'all'}`}
            dataSource={filteredRequests}
            loading={isLoading}
            columns={columns}
            className="ff-grid-restored min-w-[920px] border-0"
          />
        </div>
      </GlassCard>
    </PageContainer>
  );
};

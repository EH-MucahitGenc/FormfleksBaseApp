import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignService } from '../../services/campaign.service';
import type { AudienceFilter } from '../../services/campaign.service';
import { Search, Users, Check, X, Building2, MapPin, Briefcase, GraduationCap, Grid, ChevronDown, ChevronRight, Save, FolderOpen, Trash2 } from 'lucide-react';

interface SurveyAudienceSelectorProps {
  filter: AudienceFilter;
  onChange: (filter: AudienceFilter) => void;
  onTotalCountChange?: (count: number) => void;
}

// --- Accordion Filter Section ---
interface AccordionFilterProps {
  title: string;
  icon: React.ElementType;
  options?: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

const AccordionFilter: React.FC<AccordionFilterProps> = ({ title, icon: Icon, options, selected, onToggle }) => {
  const [isOpen, setIsOpen] = useState(selected.length > 0);
  const [filterText, setFilterText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const VISIBLE_LIMIT = 6;

  if (!options || options.length === 0) return null;

  const filteredOptions = filterText
    ? options.filter(o => o.toLowerCase().includes(filterText.toLowerCase()))
    : options;

  const visibleOptions = showAll ? filteredOptions : filteredOptions.slice(0, VISIBLE_LIMIT);
  const hiddenCount = filteredOptions.length - VISIBLE_LIMIT;

  return (
    <div className="border-b border-surface-muted last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-brand-gray" />
          <span className="text-xs font-semibold text-brand-dark">{title}</span>
          {selected.length > 0 && (
            <span className="bg-brand-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none min-w-[18px] text-center">
              {selected.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-brand-gray" /> : <ChevronRight className="w-3.5 h-3.5 text-brand-gray" />}
      </button>

      {isOpen && (
        <div className="px-3 pb-3">
          {/* Mini search for categories with many options */}
          {options.length > VISIBLE_LIMIT && (
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-brand-gray" />
              <input
                type="text"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder={`${title} ara...`}
                className="w-full bg-surface-ground border border-surface-muted rounded pl-7 pr-2 py-1 text-[11px] focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
              />
            </div>
          )}

          <div className="space-y-0.5 max-h-[200px] overflow-y-auto scrollbar-thin">
            {visibleOptions.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[12px] transition-colors ${
                    isSelected ? 'bg-brand-primary/5 text-brand-dark font-medium' : 'text-brand-gray hover:bg-surface-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(opt)}
                    className="w-3.5 h-3.5 rounded border-surface-muted text-brand-primary focus:ring-brand-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="truncate leading-tight">{opt}</span>
                </label>
              );
            })}
          </div>

          {!showAll && hiddenCount > 0 && !filterText && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-1.5 text-[11px] text-brand-primary hover:underline font-medium"
            >
              +{hiddenCount} daha göster
            </button>
          )}
          {showAll && hiddenCount > 0 && !filterText && (
            <button
              onClick={() => setShowAll(false)}
              className="mt-1.5 text-[11px] text-brand-primary hover:underline font-medium"
            >
              Daralt
            </button>
          )}
        </div>
      )}
    </div>
  );
};


export const SurveyAudienceSelector: React.FC<SurveyAudienceSelectorProps> = ({ filter, onChange, onTotalCountChange }) => {
  const manual = filter.selectedUsersOnly === true;
  const [localSearch, setLocalSearch] = useState('');
  const [search, setSearch] = useState('');
  const [browseFilters, setBrowseFilters] = useState<AudienceFilter>({});
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const [panel, setPanel] = useState<'selected' | 'excluded'>('selected');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(localSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const { data: facets } = useQuery({ queryKey: ['audienceFacets'], queryFn: campaignService.getFacets });
  const { data: savedAudiences, refetch: refetchSavedAudiences } = useQuery({
    queryKey: ['savedAudiences'], queryFn: campaignService.getSavedAudiences
  });
  const groupFilters = manual ? browseFilters : filter;
  // Directory search never changes the saved audience or its selected-user count.
  const directoryFilter: AudienceFilter = {
    ...(showAllUsers ? {} : groupFilters),
    selectedUsersOnly: false, includedUserIds: undefined, excludedUserIds: undefined,
    searchTerm: search || (showAllUsers ? undefined : groupFilters.searchTerm)
  };
  const candidates = useQuery({
    queryKey: ['audienceCandidates', directoryFilter, filter, page, pageSize],
    queryFn: () => campaignService.browseAudience(directoryFilter, filter, page, pageSize)
  });
  const selected = useQuery({
    queryKey: ['audienceSelection', filter, selectedPage],
    queryFn: () => campaignService.searchAudience(filter, selectedPage, 10)
  });
  const excluded = useQuery({
    queryKey: ['audienceExcluded', filter.excludedUserIds, selectedPage],
    queryFn: () => campaignService.searchAudience({
      selectedUsersOnly: true, includedUserIds: filter.excludedUserIds || []
    }, selectedPage, 10),
    enabled: panel === 'excluded'
  });

  useEffect(() => {
    onTotalCountChange?.(selected.isFetching || selected.isError ? 0 : selected.data?.totalCount ?? 0);
  }, [selected.data, selected.isFetching, selected.isError, onTotalCountChange]);

  const changeAudience = (next: AudienceFilter) => {
    onTotalCountChange?.(0);
    setSelectedPage(1);
    onChange(next);
  };
  const setMembership = (userIds: string[], include: boolean) => {
    const included = new Set(filter.includedUserIds || []);
    const excludedIds = new Set(filter.excludedUserIds || []);
    for (const id of userIds) {
      if (include) {
        included.add(id);
        excludedIds.delete(id);
      } else {
        included.delete(id);
        if (!manual) excludedIds.add(id);
      }
    }
    changeAudience({ ...filter, includedUserIds: [...included], excludedUserIds: [...excludedIds] });
  };
  const changeGroup = (key: keyof AudienceFilter, value: string[] | boolean | undefined) => {
    const next = { ...groupFilters, [key]: value };
    if (manual) setBrowseFilters(next);
    else changeAudience(next);
    setPage(1);
  };
  const toggleGroup = (key: keyof AudienceFilter, value: string) => {
    const values = (groupFilters[key] as string[] | undefined) || [];
    changeGroup(key, values.includes(value) ? values.filter(x => x !== value) : [...values, value]);
  };
  const switchMode = (nextManual: boolean) => {
    if (nextManual === manual) return;
    setPage(1);
    setShowAllUsers(false);
    setPanel('selected');
    if (nextManual) {
      // Starting a manual list never silently includes an entire organization.
      setBrowseFilters({});
      changeAudience({ selectedUsersOnly: true, includedUserIds: filter.includedUserIds || [] });
    } else {
      changeAudience({ ...browseFilters, selectedUsersOnly: false,
        includedUserIds: filter.includedUserIds, excludedUserIds: filter.excludedUserIds });
    }
  };
  const saveAudience = async () => {
    const name = window.prompt('Bu hedef kitle listesine bir ad verin:');
    if (!name?.trim()) return;
    try {
      await campaignService.createSavedAudience(name.trim(), undefined, filter);
      await refetchSavedAudiences();
      setShowSavedMenu(false);
    } catch { window.alert('Liste kaydedilemedi. Lütfen tekrar deneyin.'); }
  };
  const deleteAudience = async (id: string) => {
    if (!window.confirm('Kayıtlı liste silinsin mi?')) return;
    try { await campaignService.deleteSavedAudience(id); await refetchSavedAudiences(); }
    catch { window.alert('Liste silinemedi.'); }
  };
  const panelQuery = panel === 'selected' ? selected : excluded;
  const candidateItems = candidates.data?.items || [];
  const totalPages = Math.max(1, Math.ceil((candidates.data?.totalCount || 0) / pageSize));
  const panelPages = Math.max(1, Math.ceil((panelQuery.data?.totalCount || 0) / 10));
  const groups: { key: keyof AudienceFilter; title: string; icon: React.ElementType; options?: string[] }[] = [
    { key: 'companies', title: 'Şirket', icon: Building2, options: facets?.companies },
    { key: 'locations', title: 'Lokasyon', icon: MapPin, options: facets?.locations },
    { key: 'departments', title: 'Departman', icon: Briefcase, options: facets?.departments },
    { key: 'personnelGroups', title: 'Personel Grubu', icon: Grid, options: facets?.personnelGroups },
    { key: 'titles', title: 'Unvan', icon: GraduationCap, options: facets?.titles },
    { key: 'roles', title: 'Sistem Rolü', icon: Users, options: facets?.roles }
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-muted bg-white">
      <div className="border-b border-surface-muted bg-gradient-to-r from-orange-50/80 to-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ value: true, title: 'Kişi seç', description: 'Listeye eklediğim kişilere gönder.' },
            { value: false, title: 'Grupla seç', description: 'Filtreye uyanları dahil et, kişi ekle veya çıkar.' }].map(mode =>
            <button key={String(mode.value)} type="button" aria-pressed={manual === mode.value}
              onClick={() => switchMode(mode.value)}
              className={`rounded-xl border p-3 text-left transition-colors ${manual === mode.value ? 'border-brand-primary bg-white shadow-sm' : 'border-surface-muted bg-white/60 hover:border-brand-primary/40'}`}>
              <span className="flex items-center gap-2 text-sm font-bold text-brand-dark"><Users className="h-4 w-4 text-brand-primary" />{mode.title}</span>
              <span className="mt-1 block text-xs text-brand-gray">{mode.description}</span>
            </button>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-brand-gray">
          {manual ? 'Arama ve filtreler yalnızca rehberi daraltır. Eklediğiniz kişiler arama değiştiğinde listede kalır.'
            : 'Grup filtreleri alıcıları belirler. Filtre seçmezseniz tüm aktif kullanıcılar dahildir. Arama alıcıları değiştirmez.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-surface-muted p-3">
        <label className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-brand-gray" />
          <input aria-label="Kullanıcı rehberinde ara" value={localSearch}
            onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
            placeholder="İsim veya e-posta ile kişi bul..."
            className="w-full rounded-lg border border-surface-muted py-2 pl-9 pr-3 text-sm focus:outline-brand-primary" />
        </label>
        <div className="relative">
          <button type="button" onClick={() => setShowSavedMenu(!showSavedMenu)} className="flex items-center gap-2 rounded-lg border border-surface-muted px-3 py-2 text-xs"><FolderOpen className="h-4 w-4" />Kayıtlı listeler</button>
          {showSavedMenu && <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-surface-muted bg-white p-3 shadow-xl">
            <button type="button" onClick={saveAudience} className="mb-2 flex items-center gap-2 text-xs font-semibold text-brand-primary"><Save className="h-4 w-4" />Bu hedef kitleyi kaydet</button>
            <div className="max-h-56 overflow-y-auto">
              {!savedAudiences?.length && <p className="py-3 text-xs text-brand-gray">Henüz kayıtlı liste yok.</p>}
              {savedAudiences?.map(saved => <div key={saved.id} className="flex items-center gap-2 border-t border-surface-muted py-2">
                <button type="button" className="flex-1 truncate text-left text-sm" onClick={() => {
                  changeAudience(saved.audienceDefinition); setLocalSearch(''); setSearch(''); setPage(1);
                  setBrowseFilters({}); setShowAllUsers(false); setShowSavedMenu(false);
                }}>{saved.name}</button>
                <button type="button" aria-label={`${saved.name} listesini sil`} onClick={() => deleteAudience(saved.id)}><Trash2 className="h-4 w-4 text-brand-gray" /></button>
              </div>)}
            </div>
          </div>}
        </div>
      </div>
      <div className="grid lg:grid-cols-[180px_minmax(0,1fr)_240px]">
        <aside className="border-b border-surface-muted bg-surface-ground/40 lg:border-b-0 lg:border-r">
          <div className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-brand-gray">{manual ? 'Rehber filtreleri' : 'Hedef kitle grupları'}</div>
          {groups.map(g => <AccordionFilter key={g.key} title={g.title} icon={g.icon} options={g.options}
            selected={(groupFilters[g.key] as string[]) || []} onToggle={value => toggleGroup(g.key, value)} />)}
          <label className="flex items-start gap-2 p-3 text-xs text-brand-gray">
            <input type="checkbox" checked={groupFilters.hasOrganizationData === true}
              onChange={e => changeGroup('hasOrganizationData', e.target.checked ? true : undefined)} />
            Organizasyon bilgisi olanlar
          </label>
          <button type="button" className="px-3 pb-3 text-xs text-brand-primary" onClick={() => {
            if (manual) setBrowseFilters({});
            else changeAudience({ selectedUsersOnly: false, includedUserIds: filter.includedUserIds, excludedUserIds: filter.excludedUserIds });
            setPage(1);
          }}>Grup filtrelerini temizle</button>
          {!manual && filter.searchTerm && <p className="px-3 pb-3 text-xs text-brand-gray">Kayıtlı arama kuralı: {filter.searchTerm}</p>}
        </aside>
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-muted p-3">
            <label className="flex items-center gap-2 text-xs text-brand-gray">
              <input type="checkbox" checked={showAllUsers} onChange={e => { setShowAllUsers(e.target.checked); setPage(1); }} />
              Tüm aktif kullanıcıları göster
            </label>
            <button type="button" disabled={candidates.isFetching || !candidateItems.length}
              onClick={() => setMembership(candidateItems.map(x => x.user.userId), true)}
              className="text-xs font-semibold text-brand-primary disabled:opacity-40">Bu sayfadakileri ekle</button>
          </div>
          <div className="max-h-[480px] min-h-64 overflow-auto">
            {candidates.isError ? <div role="alert" className="p-5 text-sm text-red-600">Rehber yüklenemedi. <button onClick={() => candidates.refetch()} className="underline">Tekrar dene</button></div>
              : candidates.isPending ? <p className="p-5 text-sm text-brand-gray">Kullanıcılar yükleniyor...</p>
              : !candidateItems.length ? <p className="p-5 text-sm text-brand-gray">Bu aramaya uygun aktif kullanıcı yok. Aramayı veya filtreleri değiştirin.</p>
              : <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-surface-ground text-[11px] uppercase text-brand-gray"><tr><th className="p-3">Kullanıcı</th><th className="p-3 text-right">Seçim</th></tr></thead>
                <tbody>{candidateItems.map(({ user, isSelected }) => <tr key={user.userId} className={`border-b border-surface-muted/60 ${isSelected ? 'bg-orange-50/40' : ''}`}>
                  <td className="p-3"><p className="font-semibold text-brand-dark">{user.displayName || user.email}</p><p className="break-all text-xs text-brand-gray">{user.email}</p><p className="mt-1 text-[11px] text-brand-gray">{[user.company, user.department, user.location].filter(Boolean).join(' · ') || 'Organizasyon bilgisi yok'}</p></td>
                  <td className="p-3 text-right"><button type="button" disabled={candidates.isFetching} aria-pressed={isSelected}
                    aria-label={`${user.displayName || user.email}: ${isSelected ? 'listeden çıkar' : 'listeye ekle'}`}
                    onClick={() => setMembership([user.userId], !isSelected)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${isSelected ? 'border-orange-200 bg-orange-50 text-brand-primary' : 'border-surface-muted text-brand-dark hover:border-brand-primary'}`}>
                    {isSelected ? <Check className="h-3 w-3" /> : <Users className="h-3 w-3" />}{isSelected ? 'Çıkar' : 'Ekle'}
                  </button>{filter.excludedUserIds?.includes(user.userId) && <p className="mt-1 text-[10px] text-red-600">Hariç tutuldu</p>}</td>
                </tr>)}</tbody></table>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-brand-gray">
            <label>Sayfa boyutu <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border border-surface-muted p-1">{[10,25,50,100].map(n => <option key={n}>{n}</option>)}</select></label>
            <span>{candidates.data?.totalCount ?? 0} kullanıcı</span>
            <div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-30" aria-label="Önceki rehber sayfası">‹</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="disabled:opacity-30" aria-label="Sonraki rehber sayfası">›</button></div>
          </div>
        </section>
        <aside className="border-t border-surface-muted bg-orange-50/30 lg:border-l lg:border-t-0">
          <div className="border-b border-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Gönderim listesi</p>
            <p aria-live="polite" className="mt-1 text-2xl font-bold text-brand-dark">{selected.isFetching ? '...' : selected.data?.totalCount ?? 0} <span className="text-sm font-medium">kişi</span></p>
            <p className="mt-1 text-xs leading-5 text-brand-gray">{manual ? 'Yalnızca bu listedeki aktif kişilere gönderilir.' : 'Grup seçimleri ve kişisel ekleme/çıkarmaların sonucu.'}</p>
          </div>
          <div className="flex gap-3 px-4 pt-3 text-xs">
            <button className={panel === 'selected' ? 'font-bold text-brand-primary' : 'text-brand-gray'} onClick={() => { setPanel('selected'); setSelectedPage(1); }}>Dahil edilenler</button>
            <button className={panel === 'excluded' ? 'font-bold text-brand-primary' : 'text-brand-gray'} onClick={() => { setPanel('excluded'); setSelectedPage(1); }}>Hariç tutulanlar</button>
          </div>
          <div className="max-h-80 overflow-auto p-3">
            {panelQuery.isError ? <p role="alert" className="text-xs text-red-600">Liste doğrulanamadı. <button className="underline" onClick={() => panelQuery.refetch()}>Tekrar dene</button></p>
              : panelQuery.isFetching ? <p className="p-2 text-xs text-brand-gray">Liste güncelleniyor...</p>
              : !panelQuery.data?.items.length ? <p className="p-2 text-xs leading-5 text-brand-gray">{panel === 'selected' ? 'Listeniz boş. Soldaki rehberden kişi ekleyin.' : 'Hariç tutulan aktif kullanıcı yok.'}</p>
              : panelQuery.data.items.map(user => <div key={user.userId} className="mb-2 flex items-start gap-2 rounded-lg border border-surface-muted bg-white p-2">
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.displayName || user.email}</p><p className="truncate text-[11px] text-brand-gray">{user.email}</p></div>
                <button type="button" aria-label={`${user.displayName}: ${panel === 'selected' ? 'çıkar' : 'geri ekle'}`}
                  onClick={() => setMembership([user.userId], panel === 'excluded')}
                  className="text-xs text-brand-primary">{panel === 'selected' ? <X className="h-4 w-4" /> : 'Ekle'}</button>
              </div>)}
          </div>
          <div className="flex items-center justify-between px-4 pb-3 text-xs"><button disabled={selectedPage <= 1} onClick={() => setSelectedPage(selectedPage - 1)} className="disabled:opacity-30">Önceki</button><span>{selectedPage} / {panelPages}</span><button disabled={selectedPage >= panelPages} onClick={() => setSelectedPage(selectedPage + 1)} className="disabled:opacity-30">Sonraki</button></div>
          <button type="button" className="m-3 mt-0 text-xs font-medium text-red-600" onClick={() => {
            setBrowseFilters({}); setPanel('selected'); changeAudience({ selectedUsersOnly: true, includedUserIds: [] });
          }}>Listeyi boşalt</button>
        </aside>
      </div>
    </div>
  );
};

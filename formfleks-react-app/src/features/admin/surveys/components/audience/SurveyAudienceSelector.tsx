import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignService } from '../../services/campaign.service';
import type { AudienceFilter, SurveyAudienceUser } from '../../services/campaign.service';
import { Search, Users, Check, X, Building2, MapPin, Briefcase, GraduationCap, Grid, ChevronDown, ChevronRight, Save, FolderOpen, Trash2, Filter, XCircle } from 'lucide-react';

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
  const [localSearch, setLocalSearch] = useState(filter.searchTerm || '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showSavedMenu, setShowSavedMenu] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filter, searchTerm: localSearch || undefined });
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const { data: facets, isLoading: isLoadingFacets } = useQuery({
    queryKey: ['audienceFacets'],
    queryFn: () => campaignService.getFacets()
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['audienceSearch', filter, page, pageSize],
    queryFn: () => campaignService.searchAudience(filter, page, pageSize)
  });

  useEffect(() => {
    if (searchResults && onTotalCountChange) {
      onTotalCountChange(searchResults.totalCount);
    }
  }, [searchResults, onTotalCountChange]);

  const handleFilterChange = useCallback((key: keyof AudienceFilter, value: any) => {
    onChange({ ...filter, [key]: value });
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, onChange]);

  const handleToggleArrayFilter = useCallback((key: keyof AudienceFilter, value: string) => {
    const current = (filter[key] as string[]) || [];
    const next = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
    handleFilterChange(key, next.length > 0 ? next : undefined);
  }, [filter, handleFilterChange]);

  const handleToggleExclude = useCallback((userId: string) => {
    const excluded = filter.excludedUserIds || [];
    const included = filter.includedUserIds || [];

    if (excluded.includes(userId)) {
      handleFilterChange('excludedUserIds', excluded.filter(x => x !== userId));
    } else {
      handleFilterChange('excludedUserIds', [...excluded, userId]);
      if (included.includes(userId)) {
        handleFilterChange('includedUserIds', included.filter(x => x !== userId));
      }
    }
  }, [filter, handleFilterChange]);

  const isExcluded = useCallback((userId: string) => filter.excludedUserIds?.includes(userId) ?? false, [filter.excludedUserIds]);

  // --- Active filter chips ---
  const activeFilterChips = useMemo(() => {
    const chips: { label: string; key: keyof AudienceFilter; value: string }[] = [];
    const addChips = (key: keyof AudienceFilter, label: string) => {
      const arr = filter[key] as string[] | undefined;
      if (arr) arr.forEach(v => chips.push({ label: `${label}: ${v}`, key, value: v }));
    };
    addChips('companies', 'Şirket');
    addChips('locations', 'Lokasyon');
    addChips('departments', 'Departman');
    addChips('personnelGroups', 'Personel Grubu');
    addChips('titles', 'Unvan');
    addChips('roles', 'Rol');
    if (filter.hasOrganizationData) chips.push({ label: 'Sadece QDMS Kaydı Olanlar', key: 'hasOrganizationData', value: 'true' });
    return chips;
  }, [filter]);

  const clearAllFilters = () => {
    onChange({});
    setLocalSearch('');
    setPage(1);
  };

  const removeChip = (chip: { key: keyof AudienceFilter; value: string }) => {
    if (chip.key === 'hasOrganizationData') {
      handleFilterChange('hasOrganizationData', undefined);
      return;
    }
    const current = (filter[chip.key] as string[]) || [];
    const next = current.filter(x => x !== chip.value);
    handleFilterChange(chip.key, next.length > 0 ? next : undefined);
  };

  // --- Saved audiences ---
  const { data: savedAudiences, refetch: refetchSavedAudiences } = useQuery({
    queryKey: ['savedAudiences'],
    queryFn: () => campaignService.getSavedAudiences()
  });

  const handleSaveAudience = async () => {
    const name = window.prompt("Kaydedilecek hedef kitlenin adını girin:");
    if (!name) return;
    try {
      await campaignService.createSavedAudience(name, undefined, filter);
      await refetchSavedAudiences();
      setShowSavedMenu(false);
    } catch {
      alert("Kaydedilirken bir hata oluştu.");
    }
  };

  const handleDeleteSavedAudience = async (id: string) => {
    if (!window.confirm("Bu kayıtlı şablonu silmek istediğinize emin misiniz?")) return;
    try {
      await campaignService.deleteSavedAudience(id);
      await refetchSavedAudiences();
    } catch {
      alert("Silinirken bir hata oluştu.");
    }
  };

  const handleLoadSavedAudience = (audienceId: string) => {
    const saved = savedAudiences?.find(x => x.id === audienceId);
    if (saved) {
      onChange(saved.audienceDefinition);
      setLocalSearch(saved.audienceDefinition.searchTerm || '');
      setShowSavedMenu(false);
      setPage(1);
    }
  };

  // --- Pagination helpers ---
  const totalPages = searchResults ? Math.ceil(searchResults.totalCount / pageSize) : 0;
  const excludedCount = filter.excludedUserIds?.length || 0;

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-surface-muted overflow-hidden">
      {/* ─── Top Bar ─── */}
      <div className="p-3 border-b border-surface-muted bg-surface-base">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="İsim veya e-posta ara..."
              className="w-full bg-white border border-surface-muted rounded-lg pl-9 pr-4 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none"
            />
          </div>

          <div className="flex-1" />

          {/* Saved Audiences Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSavedMenu(!showSavedMenu)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-gray hover:text-brand-dark border border-surface-muted rounded-lg px-3 py-2 bg-white hover:bg-surface-muted/50 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Şablonlar
            </button>

            {showSavedMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSavedMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-surface-muted z-40 overflow-hidden">
                  <div className="p-3 border-b border-surface-muted bg-surface-base flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-dark">Kayıtlı Hedef Kitle Şablonları</span>
                    <button
                      onClick={handleSaveAudience}
                      className="flex items-center gap-1 text-[11px] text-brand-primary hover:text-brand-dark font-semibold"
                    >
                      <Save className="w-3 h-3" /> Geçerli Filtreyi Kaydet
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto scrollbar-thin">
                    {!savedAudiences || savedAudiences.length === 0 ? (
                      <div className="p-4 text-center text-xs text-brand-gray">Henüz kayıtlı şablon yok.</div>
                    ) : (
                      savedAudiences.map(sa => (
                        <div key={sa.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-muted/50 border-b border-surface-muted/50 last:border-b-0 group">
                          <button onClick={() => handleLoadSavedAudience(sa.id)} className="flex-1 text-left text-xs font-medium text-brand-dark hover:text-brand-primary truncate">
                            {sa.name}
                          </button>
                          <button onClick={() => handleDeleteSavedAudience(sa.id)} className="p-1 text-brand-gray hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Sil">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Total count badge */}
          <div className="bg-brand-primary/10 text-brand-primary pl-3 pr-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-brand-primary/20 tabular-nums">
            <Users className="w-4 h-4" />
            {isSearching ? '...' : (searchResults?.totalCount ?? 0) - excludedCount} Kişi
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <Filter className="w-3.5 h-3.5 text-brand-gray mr-0.5" />
            {activeFilterChips.map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                {chip.label}
                <button onClick={() => removeChip(chip)} className="p-0.5 hover:bg-brand-primary/20 rounded-full">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-[11px] text-red-500 hover:text-red-700 font-medium ml-1 flex items-center gap-0.5">
              <XCircle className="w-3.5 h-3.5" /> Tümünü Temizle
            </button>
          </div>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Accordion Filters */}
        <div className="w-56 border-r border-surface-muted bg-surface-base/50 overflow-y-auto scrollbar-thin flex-shrink-0">
          {isLoadingFacets ? (
            <div className="p-4 text-xs text-brand-gray">Filtreler yükleniyor...</div>
          ) : (
            <>
              <AccordionFilter title="Şirket" icon={Building2} options={facets?.companies} selected={(filter.companies as string[]) || []} onToggle={v => handleToggleArrayFilter('companies', v)} />
              <AccordionFilter title="Lokasyon" icon={MapPin} options={facets?.locations} selected={(filter.locations as string[]) || []} onToggle={v => handleToggleArrayFilter('locations', v)} />
              <AccordionFilter title="Departman" icon={Briefcase} options={facets?.departments} selected={(filter.departments as string[]) || []} onToggle={v => handleToggleArrayFilter('departments', v)} />
              <AccordionFilter title="Personel Grubu" icon={Grid} options={facets?.personnelGroups} selected={(filter.personnelGroups as string[]) || []} onToggle={v => handleToggleArrayFilter('personnelGroups', v)} />
              <AccordionFilter title="Unvan" icon={GraduationCap} options={facets?.titles} selected={(filter.titles as string[]) || []} onToggle={v => handleToggleArrayFilter('titles', v)} />
              <AccordionFilter title="Sistem Rolü" icon={Users} options={facets?.roles} selected={(filter.roles as string[]) || []} onToggle={v => handleToggleArrayFilter('roles', v)} />

              {/* QDMS toggle */}
              <div className="px-3 py-3">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-3.5 h-3.5 text-brand-primary rounded border-surface-muted focus:ring-brand-primary cursor-pointer"
                    checked={filter.hasOrganizationData === true}
                    onChange={(e) => handleFilterChange('hasOrganizationData', e.target.checked ? true : undefined)}
                  />
                  <div>
                    <span className="text-[11px] font-semibold text-brand-dark group-hover:text-brand-primary transition-colors leading-tight">Sadece QDMS Kaydı Olanlar</span>
                    <p className="text-[10px] text-brand-gray mt-0.5 leading-tight">Organizasyon bilgisi olan aktif çalışanlar.</p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Right Content: Table + Pagination */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-base border-b border-surface-muted sticky top-0 z-10">
                <tr className="text-brand-gray text-[11px] uppercase font-semibold tracking-wider">
                  <th className="px-4 py-2.5">Personel</th>
                  <th className="px-4 py-2.5">Organizasyon</th>
                  <th className="px-4 py-2.5 w-24 text-center">Durum</th>
                  <th className="px-4 py-2.5 w-24 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-muted/50">
                {isSearching && !searchResults ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-brand-gray">
                      <div className="animate-pulse">Sonuçlar yükleniyor...</div>
                    </td>
                  </tr>
                ) : searchResults?.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-brand-gray">
                      Filtrelerle eşleşen kimse bulunamadı.
                    </td>
                  </tr>
                ) : (
                  searchResults?.items.map((u: SurveyAudienceUser) => {
                    const excluded = isExcluded(u.userId);
                    return (
                      <tr key={u.userId} className={`transition-colors ${excluded ? 'bg-red-50/40' : 'hover:bg-surface-muted/30'}`}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-brand-dark text-[13px]">{u.displayName}</div>
                          <div className="text-[11px] text-brand-gray">{u.email}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          {u.hasOrganizationData ? (
                            <>
                              <div className="text-[13px] text-brand-dark">{u.department}</div>
                              <div className="text-[11px] text-brand-gray">{u.company} • {u.title}</div>
                            </>
                          ) : (
                            <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Org. Bilgisi Yok</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {excluded ? (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                              <X className="w-3 h-3" /> Hariç
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                              <Check className="w-3 h-3" /> Dahil
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => handleToggleExclude(u.userId)}
                            className={`text-[11px] px-2.5 py-1 rounded font-medium transition-colors ${
                              excluded
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-50 text-red-500 hover:bg-red-100'
                            }`}
                          >
                            {excluded ? 'Geri Al' : 'Çıkar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination Footer ─── */}
          {searchResults && searchResults.totalCount > 0 && (
            <div className="border-t border-surface-muted px-4 py-2 bg-surface-base flex items-center justify-between flex-shrink-0">
              {/* Left: page size selector + info */}
              <div className="flex items-center gap-3 text-[11px] text-brand-gray">
                <div className="flex items-center gap-1.5">
                  <span>Sayfa başına:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="bg-white border border-surface-muted rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-brand-primary"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span className="text-brand-gray/70">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, searchResults.totalCount)} / {searchResults.totalCount}
                </span>
                {excludedCount > 0 && (
                  <span className="text-red-500 font-medium">({excludedCount} hariç tutuldu)</span>
                )}
              </div>

              {/* Right: page numbers */}
              {totalPages > 1 && (
                <div className="flex items-center gap-0.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className="px-2 py-1 text-[11px] border border-surface-muted bg-white rounded hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    title="İlk Sayfa"
                  >
                    «
                  </button>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-2 py-1 text-[11px] border border-surface-muted bg-white rounded hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`dot-${i}`} className="px-1 text-[11px] text-brand-gray">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                          page === p
                            ? 'bg-brand-primary text-white border-brand-primary font-bold'
                            : 'border-surface-muted bg-white hover:bg-surface-muted text-brand-gray'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-2 py-1 text-[11px] border border-surface-muted bg-white rounded hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="px-2 py-1 text-[11px] border border-surface-muted bg-white rounded hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Son Sayfa"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PageContainer, GlassCard } from '@/components/ui/index';
import { Search, FileText, ChevronRight } from 'lucide-react';
import { useNavigationStore } from '@/store/useNavigationStore';

export const NewFormRequest: React.FC = () => {
  const navigate = useNavigate();
  const { authorizedForms, isLoading: isFormsLoading } = useNavigationStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredForms = authorizedForms.filter(f => f.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')));

  return (
    <PageContainer>
      <PageHeader
        title="Yeni Talep Oluştur"
        description="Doldurmak istediğiniz form türünü aşağıdan seçin."
        breadcrumbs={[
          { label: 'Anasayfa', href: '/' },
          { label: 'Taleplerim', href: '/forms' },
          { label: 'Yeni Talep' }
        ]}
      />
      
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-brand-gray" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-surface-muted rounded-xl bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-all"
          placeholder="Aramak istediğiniz formu yazın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isFormsLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredForms.length > 0 ? (
            filteredForms.map((form) => (
              <GlassCard 
                key={form.code} 
                noPadding 
                className="p-5 flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer group border border-surface-muted hover:border-brand-primary/50"
                onClick={() => navigate(`/forms/d/${form.code}`)}
              >
                <div>
                  <div className="h-10 w-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-brand-dark mb-1 line-clamp-2">{form.name}</h3>
                  <p className="text-xs text-brand-gray line-clamp-2">Bu formu doldurarak yeni bir talep başlatın.</p>
                </div>
                <div className="mt-4 flex items-center justify-end text-brand-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Oluştur</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-full py-12 text-center bg-surface-muted/20 rounded-xl border border-dashed border-surface-muted">
              <FileText className="h-10 w-10 text-brand-gray/40 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-brand-dark">Sonuç Bulunamadı</h3>
              <p className="text-sm text-brand-gray mt-1">Arama kriterlerinize uygun bir form şablonu bulunamadı.</p>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

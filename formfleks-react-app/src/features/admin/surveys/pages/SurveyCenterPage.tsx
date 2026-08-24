
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';
import { FileText, Send, BarChart2, PlusCircle } from 'lucide-react';

export const SurveyCenterPage = () => {
    const navigate = useNavigate();

    const modules = [
        {
            title: 'Anket Şablonları',
            description: 'Kurumsal anket sorularınızı, tasarımlarınızı ve şablonlarınızı yönetin.',
            icon: <FileText className="h-8 w-8 text-brand-primary" />,
            onClick: () => navigate('/admin/surveys/templates'),
            actionText: 'Şablonlara Git',
            color: 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
        },
        {
            title: 'Kampanya Yönetimi',
            description: 'Anketleri çalışanlara veya dış kullanıcılara atayın, kampanya süreçlerini yönetin.',
            icon: <Send className="h-8 w-8 text-green-500" />,
            onClick: () => navigate('/admin/surveys/campaigns'),
            actionText: 'Kampanyalara Git',
            color: 'border-green-200 bg-green-50/30 hover:border-green-300'
        },
        {
            title: 'Yeni Kampanya Başlat',
            description: 'Hızlıca yeni bir anket kampanyası oluşturup hedef kitleye gönderin.',
            icon: <PlusCircle className="h-8 w-8 text-orange-500" />,
            onClick: () => navigate('/admin/surveys/campaigns/new'),
            actionText: 'Sihirbazı Başlat',
            color: 'border-orange-200 bg-orange-50/30 hover:border-orange-300'
        }
    ];

    return (
        <PageContainer>
            <PageHeader 
                title="Anket Merkezi" 
                description="Kurumsal anketlerinizi oluşturun, hedef kitlenize gönderin ve sonuçları analiz edin."
            />
            
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((mod, idx) => (
                        <div 
                            key={idx} 
                            onClick={mod.onClick}
                            className={`p-6 rounded-xl border ${mod.color} cursor-pointer transition-all hover:shadow-md flex flex-col h-full`}
                        >
                            <div className="mb-4 bg-white w-16 h-16 rounded-lg flex items-center justify-center shadow-sm border border-surface-muted">
                                {mod.icon}
                            </div>
                            <h3 className="text-lg font-bold text-brand-dark mb-2">{mod.title}</h3>
                            <p className="text-sm text-brand-gray mb-6 flex-1">{mod.description}</p>
                            <div className="flex items-center text-sm font-semibold text-brand-primary">
                                {mod.actionText} &rarr;
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 bg-white rounded-xl border border-surface-muted p-8 text-center max-w-4xl mx-auto shadow-sm">
                    <BarChart2 className="h-12 w-12 text-brand-gray mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-brand-dark mb-2">Kurumsal Analitik ve Raporlama</h3>
                    <p className="text-brand-gray text-sm max-w-2xl mx-auto leading-relaxed">
                        Anket kampanyalarınızın detaylı katılım metriklerini ve soru bazlı istatistiklerini (Pasta Grafikleri vb.), her bir kampanyanın içerisindeki <strong>"Sonuçlar (Dashboard)"</strong> sekmesinden anlık olarak takip edebilirsiniz.
                    </p>
                </div>
            </div>
        </PageContainer>
    );
};

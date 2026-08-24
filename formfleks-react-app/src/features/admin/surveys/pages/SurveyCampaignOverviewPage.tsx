import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { useNavigate } from "react-router-dom";
import { Plus, BarChart2, Users, Calendar } from "lucide-react";
import { campaignService, type CampaignListDto } from "../services/campaign.service";

export const SurveyCampaignOverviewPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<CampaignListDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = () => {
        setLoading(true);
        campaignService.getCampaigns()
            .then(data => {
                setCampaigns(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const handleStatusChange = async (id: string, newStatus: number, confirmMessage: string) => {
        if (!window.confirm(confirmMessage)) return;
        
        try {
            await campaignService.updateCampaignStatus(id, newStatus);
            loadCampaigns();
        } catch (error) {
            console.error(error);
            alert("Durum güncellenirken hata oluştu.");
        }
    };

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <PageHeader 
                    title="Kampanya Yönetimi" 
                    description="Anket kampanyalarınızı oluşturun, takip edin ve sonuçları analiz edin."
                />
                <button 
                    onClick={() => navigate("/admin/surveys/campaigns/new")}
                    className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Yeni Kampanya
                </button>
            </div>

            <div className="bg-white rounded-xl border border-surface-muted overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-surface-ground text-brand-gray uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Kampanya Adı</th>
                            <th className="px-6 py-4 font-semibold">Durum</th>
                            <th className="px-6 py-4 font-semibold">Bitiş Tarihi</th>
                            <th className="px-6 py-4 font-semibold text-center">Katılımcı / Yanıt</th>
                            <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-muted">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-brand-gray">Yükleniyor...</td></tr>
                        ) : campaigns.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-brand-gray">Henüz kampanya bulunmuyor.</td></tr>
                        ) : campaigns.map(camp => (
                            <tr key={camp.id} className="hover:bg-surface-base transition-colors">
                                <td className="px-6 py-4 font-medium text-brand-dark">{camp.title}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${camp.status === "Published" || camp.status === "Publishing" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                        {camp.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-brand-gray">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> {camp.endDate ? new Date(camp.endDate).toLocaleDateString() : "-"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2 text-brand-gray">
                                        <Users className="h-4 w-4" /> {camp.totalResponses} / {camp.totalParticipants}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {camp.statusValue === 1 && (
                                            <button 
                                                onClick={() => handleStatusChange(camp.id, 2, "Bu taslak kampanyayı yayına almak istediğinize emin misiniz? Katılımcılara e-posta gönderilecektir.")}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-md transition-colors"
                                            >
                                                Yayına Al
                                            </button>
                                        )}
                                        
                                        {(camp.statusValue === 2 || camp.statusValue === 3 || camp.statusValue === 4) && (
                                            <button 
                                                onClick={() => handleStatusChange(camp.id, 6, "Bu kampanyayı iptal etmek istediğinize emin misiniz?")}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                                            >
                                                İptal Et
                                            </button>
                                        )}
                                        
                                        {camp.statusValue === 5 && (
                                            <button 
                                                onClick={() => handleStatusChange(camp.id, 7, "Bu kampanyayı arşivlemek istediğinize emin misiniz?")}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors"
                                            >
                                                Arşivle
                                            </button>
                                        )}

                                        <button 
                                            onClick={() => navigate(`/admin/surveys/campaigns/${camp.id}/participants`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
                                        >
                                            <Users className="h-4 w-4" /> Katılımcılar
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/admin/surveys/campaigns/${camp.id}/results`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                        >
                                            <BarChart2 className="h-4 w-4" /> Sonuçlar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PageContainer>
    );
};

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { campaignService } from "../services/campaign.service";
import type { CampaignListDto } from "../services/campaign.service";
import { toast } from "react-hot-toast";

export function SurveyViewableResultsPage() {
    const [campaigns, setCampaigns] = useState<CampaignListDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            setIsLoading(true);
            const data = await campaignService.getMyViewableCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error("Failed to load viewable campaigns", error);
            toast.error("Kampanyalar yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-brand-dark">İzlenebilir Sonuçlarım</h1>
                <p className="text-surface-dark mt-1">Sonuçlarını görüntülemeye yetkili olduğunuz anket kampanyaları.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-lg border border-surface-muted">
                    <p className="text-surface-dark font-medium">Görüntüleyebileceğiniz bir anket sonucu bulunmuyor.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(camp => (
                        <div key={camp.id} className="bg-white border border-surface-muted rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                            <h3 className="text-lg font-semibold text-brand-dark mb-2 line-clamp-2">{camp.title}</h3>
                            <div className="flex items-center text-sm text-surface-dark mb-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-brand-light text-brand-primary`}>
                                    {camp.status}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm text-surface-dark mb-6">
                                <div>
                                    <p className="text-xs text-surface-dark/70">Yanıt</p>
                                    <p className="font-medium">{camp.totalResponses} / {camp.totalParticipants}</p>
                                </div>
                            </div>
                            <Link 
                                to={`/admin/surveys/campaigns/${camp.id}/results`}
                                className="block w-full py-2 text-center bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors font-medium text-sm"
                            >
                                Sonuçları Görüntüle
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

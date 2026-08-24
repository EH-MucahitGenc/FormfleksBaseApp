import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChevronLeft, Mail, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { campaignService, type CampaignParticipantDto } from "../services/campaign.service";

export const SurveyCampaignParticipantsPage = () => {
    const { id } = useParams<{ id: string }>();
    const [participants, setParticipants] = useState<CampaignParticipantDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [resendingId, setResendingId] = useState<string | null>(null);

    const loadParticipants = () => {
        if (!id) return;
        setLoading(true);
        campaignService.getCampaignParticipants(id)
            .then((data: any) => {
                setParticipants(data.items || data); // fallback to data just in case
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error("Katılımcılar yüklenirken bir hata oluştu.");
                setLoading(false);
            });
    };

    useEffect(() => {
        loadParticipants();
    }, [id]);

    const handleResend = async (assignmentId: string) => {
        setResendingId(assignmentId);
        try {
            await campaignService.resendEmail(assignmentId);
            toast.success("Yeniden gönderim kuyruğuna eklendi.");
            loadParticipants();
        } catch (error) {
            console.error(error);
            toast.error("İşlem başarısız oldu.");
        } finally {
            setResendingId(null);
        }
    };

    return (
        <PageContainer>
            <div className="flex items-center gap-4 mb-6">
                <Link to="/admin/surveys/campaigns" className="text-brand-gray hover:text-brand-dark transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <PageHeader 
                    title="Kampanya Katılımcıları & Teslimat" 
                    description="E-posta teslimat durumlarını ve anket doldurma ilerlemelerini takip edin."
                />
                <div className="ml-auto">
                    <button onClick={loadParticipants} className="p-2 bg-white border border-surface-muted rounded-md shadow-sm hover:bg-surface-base">
                        <RefreshCw className={`h-4 w-4 text-brand-dark ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-surface-muted overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-surface-ground text-brand-gray uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Katılımcı</th>
                            <th className="px-6 py-4 font-semibold">Anket Durumu</th>
                            <th className="px-6 py-4 font-semibold">E-posta Teslimatı</th>
                            <th className="px-6 py-4 font-semibold">Son Deneme</th>
                            <th className="px-6 py-4 font-semibold text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-muted">
                        {loading && participants.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-brand-gray">Yükleniyor...</td></tr>
                        ) : participants.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-brand-gray">Bu kampanyada henüz katılımcı bulunmuyor.</td></tr>
                        ) : participants.map(p => (
                            <tr key={p.id} className="hover:bg-surface-base transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-brand-dark">{p.fullName}</div>
                                    <div className="text-xs text-brand-gray mt-1 flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> {p.email}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        p.status === "Completed" ? "bg-green-100 text-green-700" :
                                        p.status === "Started" ? "bg-blue-100 text-blue-700" :
                                        "bg-gray-100 text-gray-700"
                                    }`}>
                                        {p.status === "Completed" ? "Tamamlandı" : p.status === "Started" ? "Başladı" : "Bekliyor"}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            {p.emailDeliveryStatus === "Delivered" ? (
                                                <><CheckCircle2 className="h-4 w-4 text-green-600" /> <span className="font-medium text-green-700">İletildi</span></>
                                            ) : p.emailDeliveryStatus === "Failed" ? (
                                                <><XCircle className="h-4 w-4 text-red-600" /> <span className="font-medium text-red-700">Başarısız</span></>
                                            ) : (
                                                <><AlertCircle className="h-4 w-4 text-orange-500" /> <span className="font-medium text-orange-600">Kuyrukta</span></>
                                            )}
                                        </div>
                                        {p.emailErrorMessage && (
                                            <div className="text-xs text-red-600 max-w-xs truncate" title={p.emailErrorMessage}>
                                                {p.emailErrorMessage}
                                            </div>
                                        )}
                                        {p.emailRetryCount > 0 && p.emailDeliveryStatus !== "Delivered" && (
                                            <div className="text-xs text-brand-gray">
                                                Deneme: {p.emailRetryCount}/3
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-brand-gray text-xs">
                                    {p.lastEmailAttemptAt ? new Date(p.lastEmailAttemptAt).toLocaleString() : "-"}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleResend(p.id)}
                                        disabled={p.status === "Completed" || resendingId === p.id || p.emailDeliveryStatus === "Queued"}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-surface-muted bg-white text-brand-dark hover:bg-surface-muted rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${resendingId === p.id ? "animate-spin" : ""}`} /> Yeniden Gönder
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </PageContainer>
    );
};

import { useState, useEffect } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { useNavigate } from "react-router-dom";
import { Plus, Edit3, Copy, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/axios";
import toast from "react-hot-toast";
import { surveyDesignerService, type SurveyTemplateListDto } from "../services/surveyDesigner.service";

export const SurveyTemplateLibraryPage = () => {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [templates, setTemplates] = useState<SurveyTemplateListDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        surveyDesignerService.getTemplates()
            .then(data => {
                setTemplates(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast.error("Şablonlar yüklenemedi.");
                setLoading(false);
            });
    }, []);

    const handleCreateTemplate = async () => {
        setIsCreating(true);
        try {
            const response = await apiClient.post("/admin/surveys/templates", {
                title: "Yeni Şablon",
                description: "",
                defaultIsAnonymous: false
            });
            const newId = response.data.id || response.data; // Depending on how API returns it
            navigate(`/admin/surveys/templates/${newId}/edit`);
        } catch (err) {
            toast.error("Şablon oluşturulamadı.");
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <PageHeader 
                    title="Anket Şablon Kütüphanesi" 
                    description="Kurumsal anket soru setlerinizi tasarlayın ve yönetin."
                />
                <button 
                    onClick={handleCreateTemplate}
                    disabled={isCreating}
                    className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-md hover:bg-brand-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" /> {isCreating ? "Oluşturuluyor..." : "Yeni Şablon"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center p-12 text-brand-gray">Yükleniyor...</div>
                ) : templates.length === 0 ? (
                    <div className="col-span-full text-center p-12 text-brand-gray">Henüz şablon bulunmuyor.</div>
                ) : templates.map(template => (
                    <div key={template.id} className="bg-white rounded-xl border border-surface-muted overflow-hidden flex flex-col hover:border-brand-primary/50 transition-colors shadow-sm">
                        <div className="p-6 flex-1">
                            <h3 className="text-lg font-bold text-brand-dark mb-2">{template.title}</h3>
                            <div className="flex flex-col gap-1 text-sm text-brand-gray mt-4">
                                <span>{template.versionCount} Sürüm</span>
                                <span>Oluşturulma: {new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="border-t border-surface-muted bg-surface-base p-2 flex flex-col gap-2">
                            <button 
                                onClick={() => navigate(`/admin/surveys/campaigns/new?templateId=${template.id}`)}
                                className="w-full flex justify-center items-center gap-1.5 py-1.5 text-sm font-medium bg-brand-primary text-white rounded hover:bg-brand-primary/90 transition-colors"
                            >
                                Kampanya Başlat
                            </button>
                            <div className="flex items-center gap-3 px-4 pb-1">
                                <button 
                                    onClick={() => navigate(`/admin/surveys/templates/${template.id}/edit`)}
                                    className="flex-1 flex justify-center items-center gap-1.5 text-sm font-medium text-brand-dark hover:text-brand-primary transition-colors"
                                >
                                    <Edit3 className="h-4 w-4" /> Düzenle
                                </button>
                                <div className="w-px h-4 bg-surface-muted"></div>
                                <button className="text-brand-gray hover:text-brand-dark transition-colors" title="Kopyala">
                                    <Copy className="h-4 w-4" />
                                </button>
                                <button className="text-brand-gray hover:text-red-600 transition-colors" title="Sil">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    );
};

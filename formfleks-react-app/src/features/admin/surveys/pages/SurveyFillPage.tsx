import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { surveyFillService, type SurveyFillDto, type SurveyAnswerDto } from "../services/surveyFill.service";
import toast from "react-hot-toast";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Clock3,
    Cloud,
    FileCheck2,
    Loader2,
    LockKeyhole,
    ShieldCheck,
    Sparkles,
    Star,
    UserRoundCheck,
} from "lucide-react";
import "./SurveyFillPage.css";

const BrandLockup = () => (
    <div className="flex items-center gap-3">
        <img src="/erkurtlogo.svg" alt="Erkurt Holding" className="h-7 w-auto object-contain sm:h-8" />
        <span className="h-6 w-px bg-stone-200" aria-hidden="true" />
        <img src="/logo.svg" alt="Formfleks" className="h-7 w-auto object-contain sm:h-8" />
    </div>
);

export const SurveyFillPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [survey, setSurvey] = useState<SurveyFillDto | null>(null);
    
    // Auto-save & Form State
    const [answers, setAnswers] = useState<Record<string, SurveyAnswerDto>>(() => {
        if (token) {
            const saved = localStorage.getItem(`survey_draft_${token}`);
            if (saved) return JSON.parse(saved);
        }
        return {};
    });

    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [receiptCode, setReceiptCode] = useState<string | null>(null);

    // Auto-save effect
    useEffect(() => {
        if (token && Object.keys(answers).length > 0) {
            const timer = setTimeout(() => {
                localStorage.setItem(`survey_draft_${token}`, JSON.stringify(answers));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [answers, token]);

    useEffect(() => {
        if (!token) return;
        surveyFillService.getSurveyByToken(token)
            .then(data => {
                setSurvey(data);
                setLoading(false);
                // Mark as started
                surveyFillService.startSurvey(token).catch(() => {});
            })
            .catch(err => {
                setError(err.response?.data?.message || "Anket yüklenirken bir hata oluştu veya linkin süresi dolmuş.");
                setLoading(false);
            });
    }, [token]);

    const parsedConfig = useMemo(() => {
        if (!survey?.configurationJson) return null;
        try {
            return JSON.parse(survey.configurationJson);
        } catch {
            return null;
        }
    }, [survey?.configurationJson]);

    // Evaluate Rule Engine
    const shouldRenderQuestion = (question: any) => {
        if (!question.VisibilityRuleJson) return true;
        try {
            const rule = JSON.parse(question.VisibilityRuleJson);
            if (!rule.dependsOnQuestionId) return true;
            
            const depAnswer = answers[rule.dependsOnQuestionId];
            if (!depAnswer) return false; // Not answered yet

            const checkValue = (rule.value || "").toString().toLowerCase();

            // Find the dependent question definition to know its type
            const depQuestion = parsedConfig
                ?.flatMap((s: any) => s.Questions)
                ?.find((q: any) => q.Id === rule.dependsOnQuestionId);

            if (!depQuestion) return true;

            // Extract the user"s answer string for comparison
            let answerText = "";
            
            if (depQuestion.Type === 1 || depQuestion.Type === 2 || depQuestion.Type === 5) {
                answerText = (depAnswer.textValue || "").toLowerCase();
            } else if (depQuestion.Type === 3 || depQuestion.Type === 4) {
                if (depAnswer.selectedOptionIds && depAnswer.selectedOptionIds.length > 0) {
                    const optionsToUse = depQuestion.Options || [];
                    const selectedOpts = optionsToUse.filter((o: any) => depAnswer.selectedOptionIds?.includes(o.Id)) || [];
                    answerText = selectedOpts.map((o: any) => o.Text.toLowerCase()).join(" ");
                }
            } else if (depQuestion.Type === 8 || depQuestion.Type === 6 || depQuestion.Type === 7) {
                answerText = (depAnswer.numericValue !== null && depAnswer.numericValue !== undefined) ? depAnswer.numericValue.toString().toLowerCase() : "";
            }

            if (rule.operator === "equals") {
                return answerText === checkValue;
            } else if (rule.operator === "notEquals") {
                return answerText !== checkValue;
            } else if (rule.operator === "contains") {
                return answerText.includes(checkValue);
            }
            
            return true;
        } catch {
            return true;
        }
    };

    const visibleSections = Array.isArray(parsedConfig)
        ? parsedConfig
            .map((section: any) => ({
                ...section,
                Questions: (section.Questions || []).filter(shouldRenderQuestion),
            }))
            .filter((section: any) => section.Questions.length > 0)
        : [];

    const isQuestionAnswered = (q: any) => {
        if (q.Type === 12) return true;
        const answer = answers[q.Id];
        
        if (q.Type === 10) {
            try {
                const s = JSON.parse(q.SettingsJson || '{}');
                const expectedRows = s.rows?.length || 0;
                const parsedVal = answer?.textValue ? JSON.parse(answer.textValue) : {};
                return Object.keys(parsedVal).length >= expectedRows && expectedRows > 0;
            } catch {
                return false;
            }
        }

        return !!answer && (
            (typeof answer.textValue === 'string' && answer.textValue.trim() !== "") ||
            (Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0) ||
            (answer.numericValue !== undefined && answer.numericValue !== null)
        );
    };

    const completionStats = useMemo(() => {
        let totalQuestions = 0;
        let totalAnswered = 0;
        
        const sectionsData = visibleSections.map((section: any) => {
            const expectAnswerQuestions = section.Questions.filter((q: any) => q.Type !== 12);
            const sectionTotal = expectAnswerQuestions.length;
            const sectionAnswered = expectAnswerQuestions.filter((q: any) => isQuestionAnswered(q)).length;
            
            totalQuestions += sectionTotal;
            totalAnswered += sectionAnswered;
            
            return {
                sectionId: section.Id,
                title: section.Title,
                total: sectionTotal,
                answered: sectionAnswered,
                percentage: sectionTotal > 0 ? Math.round((sectionAnswered / sectionTotal) * 100) : 100
            };
        });

        return {
            sections: sectionsData,
            totalPercentage: totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0,
            totalQuestions,
            totalAnswered
        };
    }, [visibleSections, answers]);

    const safeRenderIndex = Math.min(currentSectionIndex, Math.max(visibleSections.length - 1, 0));
    const currentSection = visibleSections[safeRenderIndex];
    const isLastSection = safeRenderIndex >= visibleSections.length - 1;

    const goToSection = (index: number) => {
        setCurrentSectionIndex(Math.max(0, Math.min(index, visibleSections.length - 1)));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
    // Handle inputs
    const handleTextChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: { questionId, textValue: value } }));
    };

    const handleNumberChange = (questionId: string, value: number | null) => {
        setAnswers(prev => ({ ...prev, [questionId]: { questionId, numericValue: value } }));
    };

    const handleSingleChoice = (questionId: string, optionId: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: { questionId, selectedOptionIds: [optionId] } }));
    };

    const handleMultipleChoice = (questionId: string, optionId: string, isChecked: boolean) => {
        setAnswers(prev => {
            const current = prev[questionId]?.selectedOptionIds || [];
            const newSelection = isChecked 
                ? [...current, optionId]
                : current.filter((id: string) => id !== optionId);
                
            return { ...prev, [questionId]: { questionId, selectedOptionIds: newSelection } };
        });
    };
    
    const handleSubmit = async () => {
        if (!survey) return;
        
        setIsSubmitting(true);
        try {
            // Only submit answers for questions that are visible!
            const visibleQuestionIds = new Set<string>();
            parsedConfig.forEach((section: any) => {
                section.Questions.forEach((q: any) => {
                    if (shouldRenderQuestion(q)) {
                        visibleQuestionIds.add(q.Id);
                    }
                });
            });

            // Required validation
            let firstErrorSectionIndex = -1;
            
            for (let sIdx = 0; sIdx < parsedConfig.length; sIdx++) {
                const section = parsedConfig[sIdx];
                for (const q of section.Questions) {
                    if (visibleQuestionIds.has(q.Id) && q.IsRequired && q.Type !== 12) {
                        const answer = answers[q.Id];
                        
                        // Special check for matrix
                        if (q.Type === 10) {
                            let isMatrixComplete = false;
                            try {
                                const s = JSON.parse(q.SettingsJson || '{}');
                                const expectedRows = s.rows?.length || 0;
                                const parsedVal = answer?.textValue ? JSON.parse(answer.textValue) : {};
                                if (Object.keys(parsedVal).length >= expectedRows && expectedRows > 0) {
                                    isMatrixComplete = true;
                                }
                            } catch {}
                            
                            if (!isMatrixComplete) {
                                toast.error(`Lütfen matris tablosundaki tüm satırları doldurun: ${q.Title}`);
                                if (firstErrorSectionIndex === -1) firstErrorSectionIndex = sIdx;
                            }
                        } else {
                            const isAnswered = answer && (
                                (answer.textValue && answer.textValue.trim() !== "") ||
                                (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) ||
                                (answer.numericValue !== undefined && answer.numericValue !== null)
                            );
                            if (!isAnswered) {
                                toast.error(`Lütfen zorunlu alanları doldurun: ${q.Title}`);
                                if (firstErrorSectionIndex === -1) firstErrorSectionIndex = sIdx;
                            }
                        }
                    }
                }
            }
            
            if (firstErrorSectionIndex !== -1) {
                goToSection(firstErrorSectionIndex);
                setIsSubmitting(false);
                return;
            }

            const finalAnswers = Object.values(answers).filter(a => visibleQuestionIds.has(a.questionId));

            const result = await surveyFillService.submitResponse({
                token: token!,
                answers: finalAnswers
            });
            
            // Phase 7: Clean up localStorage on successful submit
            if (token) {
                localStorage.removeItem(`survey_draft_${token}`);
            }
            
            if (result.receiptCode) {
                setReceiptCode(result.receiptCode);
            }
            setIsSuccess(true);
        } catch (err: any) {
            const errorMsg = err.response?.data?.title || err.response?.data?.message || "Gönderilirken bir hata oluştu.";
            toast.error(errorMsg);
            setIsSubmitting(false);
        }
    };

    const renderErrorState = (errMsg: string) => {
        let icon = <AlertTriangle className="h-8 w-8" />;
        let title = "Bir Hata Oluştu";
        let iconClass = "bg-red-50 text-red-600 ring-red-100";

        if (errMsg.toLowerCase().includes("zaten doldurdunuz")) {
            icon = <CheckCircle2 className="h-8 w-8" />;
            title = "Anket Tamamlanmış";
            iconClass = "bg-emerald-50 text-emerald-600 ring-emerald-100";
        } else if (errMsg.toLowerCase().includes("süresi dolmuş") || errMsg.toLowerCase().includes("aktif değil") || errMsg.toLowerCase().includes("geçersiz") || errMsg.toLowerCase().includes("başlangıç tarihi")) {
            icon = <Clock3 className="h-8 w-8" />;
            title = "Erişim Yok";
            iconClass = "bg-amber-50 text-amber-600 ring-amber-100";
        }

        return (
            <div className="survey-fill-page flex min-h-screen flex-col items-center justify-center p-5">
                <div className="survey-fill-panel w-full max-w-lg overflow-hidden rounded-[28px] border border-white/80 bg-white">
                    <div className="border-b border-stone-100 px-7 py-5 sm:px-9">
                        <BrandLockup />
                    </div>
                    <div className="px-7 py-10 text-center sm:px-10 sm:py-12">
                        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ring-8 ${iconClass}`}>
                            {icon}
                        </div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">Anket erişimi</p>
                        <h2 className="mb-4 text-3xl font-semibold tracking-tight text-stone-900">{title}</h2>
                        <p className="font-medium leading-relaxed text-stone-600">{errMsg}</p>
                        <p className="mt-7 border-t border-stone-100 pt-6 text-sm leading-relaxed text-stone-500">
                        Bu sayfayı artık kapatabilirsiniz veya daha fazla bilgi için sistem yöneticinizle iletişime geçebilirsiniz.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="survey-fill-page flex min-h-screen flex-col items-center justify-center p-6">
            <div className="survey-fill-panel flex w-full max-w-sm flex-col items-center rounded-[28px] border border-white/80 bg-white px-8 py-10 text-center">
                <BrandLockup />
                <div className="relative mt-9 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-brand-primary ring-8 ring-orange-50/60">
                    <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <h1 className="mt-7 text-xl font-semibold text-stone-900">Anket hazırlanıyor</h1>
                <p className="mt-2 text-sm text-stone-500">Güvenli katılım bağlantınız kontrol ediliyor.</p>
            </div>
        </div>
    );

    if (error) return renderErrorState(error);
    if (!survey || !parsedConfig) return renderErrorState("Geçersiz anket verisi.");

    if (isSuccess) {
        return (
            <div className={`survey-fill-page flex min-h-screen items-center justify-center p-5 ${survey.isAnonymous ? "" : "survey-fill-page--identified"}`}>
                <div className="survey-fill-panel w-full max-w-xl overflow-hidden rounded-[30px] border border-white/80 bg-white text-center">
                    <div className="border-b border-stone-100 px-7 py-5 sm:px-10">
                        <BrandLockup />
                    </div>
                    <div className="px-7 py-10 sm:px-12 sm:py-12">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">Yanıtlar kaydedildi</p>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">Katılımınız için teşekkürler</h2>
                        <p className="mx-auto mt-4 max-w-md leading-relaxed text-stone-500">
                            {survey.isAnonymous
                                ? "Yanıtlarınız kimliğinizle ilişkilendirilmeden güvenle kaydedildi."
                                : "Yanıtlarınız katılım kaydınızla birlikte güvenle kaydedildi."}
                        </p>

                        {receiptCode && (
                            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                                <div className="flex items-center justify-center gap-2 text-emerald-800">
                                    <FileCheck2 className="h-4 w-4" />
                                    <p className="text-xs font-bold uppercase tracking-[0.16em]">Anonim katılım kanıtı</p>
                                </div>
                                <p className="mt-4 font-mono text-2xl font-bold tracking-[0.18em] text-stone-900">{receiptCode}</p>
                                <p className="mt-3 text-xs leading-relaxed text-stone-500">Bu kod yanıt içeriğinizi veya kimliğinizi göstermez; yalnızca katılımınızı doğrulamanız için size özeldir.</p>
                            </div>
                        )}

                        <button
                            onClick={() => navigate("/auth/login")}
                            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-stone-200"
                        >
                            Sayfayı kapat
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`survey-fill-page min-h-screen ${survey.isAnonymous ? "" : "survey-fill-page--identified"}`}>
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
                <header className="mb-5 flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
                    <BrandLockup />
                    <div className="hidden items-center gap-2 text-xs font-semibold text-stone-500 sm:flex">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Güvenli anket deneyimi
                    </div>
                </header>

                <div className="grid items-start gap-5 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-7">
                    <aside className="space-y-4 lg:sticky lg:top-7">
                        <div className="survey-fill-rail relative overflow-hidden rounded-[28px] bg-stone-950 px-6 py-7 text-white sm:px-7 sm:py-8">
                            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-brand-primary/30 blur-3xl" aria-hidden="true" />
                            <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
                            <div className="relative">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Formfleks Anket
                                </span>
                                <h1 className="mt-6 text-3xl font-semibold leading-[1.12] tracking-tight text-white">{survey.campaignTitle}</h1>
                                <p className="mt-4 text-sm leading-relaxed text-stone-400">Görüşlerinizi paylaşın; her yanıt daha iyi bir çalışma deneyimine katkı sağlar.</p>

                                <div className="mt-8 border-t border-white/10 pt-6">
                                    <div className="flex items-end justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">BÖLÜM İLERLEMESİ</p>
                                            <p className="mt-1 text-sm font-semibold text-stone-200">
                                                {completionStats.sections[safeRenderIndex]?.answered || 0} / {completionStats.sections[safeRenderIndex]?.total || 0} Soru
                                            </p>
                                        </div>
                                        <span className="text-xl font-semibold text-white">%{completionStats.sections[safeRenderIndex]?.percentage || 0}</span>
                                    </div>
                                    <div className="mt-4 mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all duration-500" style={{ width: `${completionStats.sections[safeRenderIndex]?.percentage || 0}%` }} />
                                    </div>

                                    <div className="flex items-end justify-between gap-3 border-t border-white/5 pt-4">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-primary">GENEL İLERLEME</p>
                                            <p className="mt-1 text-xs font-medium text-stone-400">Tüm bölümler</p>
                                        </div>
                                        <span className="text-2xl font-bold text-white">%{completionStats.totalPercentage}</span>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-orange-400 transition-all duration-500" style={{ width: `${completionStats.totalPercentage}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-[24px] border p-5 ${survey.isAnonymous ? "border-emerald-200 bg-emerald-50/90" : "border-orange-200 bg-orange-50/90"}`}>
                            <div className="flex items-start gap-3">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${survey.isAnonymous ? "bg-emerald-700 text-white" : "bg-brand-primary text-white"}`}>
                                    {survey.isAnonymous ? <LockKeyhole className="h-5 w-5" /> : <UserRoundCheck className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${survey.isAnonymous ? "text-emerald-700" : "text-orange-700"}`}>
                                        {survey.isAnonymous ? "Anonim katılım" : "Kimlikli katılım"}
                                    </p>
                                    <h2 className="mt-1 text-base font-semibold text-stone-950">
                                        {survey.isAnonymous ? "Kimliğiniz yanıtlarla eşleşmez" : "Yanıtlarınız davetinizle ilişkilidir"}
                                    </h2>
                                </div>
                            </div>
                            <p className="mt-4 text-sm leading-relaxed text-stone-600">
                                {survey.isAnonymous
                                    ? "Adınız ve e-posta adresiniz yanıt kaydına eklenmez; raporlarda yanıtlarınız kimliğinizle ilişkilendirilmez."
                                    : "Bu anket anonim değildir. Yanıtlarınız size gönderilen katılım kaydıyla ilişkilendirilerek saklanır."}
                            </p>
                            <div className="mt-4 space-y-2 border-t border-black/5 pt-4 text-xs font-medium text-stone-600">
                                {(survey.isAnonymous
                                    ? ["Yanıtlar kimlikten ayrı tutulur", "Katılım sonunda özel kanıt kodu sunulur"]
                                    : ["Katılım yalnızca size atanan davetle yapılır", "Göndermeden önce yanıtlarınızı kontrol edin"]
                                ).map(item => (
                                    <div key={item} className="flex items-center gap-2">
                                        <Check className={`h-3.5 w-3.5 ${survey.isAnonymous ? "text-emerald-700" : "text-orange-700"}`} />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 text-stone-500 backdrop-blur">
                            <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                            <p className="text-xs leading-relaxed"><span className="font-semibold text-stone-700">Otomatik taslak açık.</span> Yanıtlarınız gönderene kadar bu cihazda korunur.</p>
                        </div>
                    </aside>

                    <main className="survey-fill-panel overflow-hidden rounded-[28px] border border-white/90 bg-white">
                        <div className="border-b border-stone-100 px-5 py-6 sm:px-8 sm:py-7 lg:px-10">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-brand-primary">{String(safeRenderIndex + 1).padStart(2, "0")}</span>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Anket bölümü</p>
                                    <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">{currentSection?.Title || `Bölüm ${safeRenderIndex + 1}`}</h2>
                                </div>
                            </div>
                            {currentSection?.Description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{currentSection.Description}</p>}
                        </div>

                        <div className="space-y-5 bg-stone-50/60 px-4 py-5 sm:px-7 sm:py-7 lg:px-8">
                            {visibleSections.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Gösterilecek soru bulunmuyor.</div>
                            ) : (
                            <div key={currentSection.Id} className="space-y-5">
                                {currentSection.Questions.map((q: any, questionIndex: number) => {
                                    let settings: any = {};
                                    try { if (q.SettingsJson) settings = JSON.parse(q.SettingsJson); } catch {}

                                    return (
                                    <section key={q.Id} className={`survey-question-card rounded-[22px] border p-5 transition duration-300 sm:p-6 ${q.Type === 12 ? "border-sky-100 bg-sky-50/70" : "border-stone-200/80 bg-white hover:border-orange-200 hover:shadow-[0_12px_30px_-24px_rgba(28,20,18,0.45)]"}`} style={{ animationDelay: `${Math.min(questionIndex * 70, 280)}ms` }}>
                                        <div className="mb-5 flex items-start gap-3">
                                            <span className={`mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[10px] font-bold ${q.Type === 12 ? "bg-sky-100 text-sky-700" : "bg-stone-100 text-stone-500"}`}>
                                                {q.Type === 12 ? "i" : String(questionIndex + 1).padStart(2, "0")}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                            <h3 className={`text-[15px] font-semibold leading-relaxed sm:text-base ${q.Type === 12 ? "text-sky-950" : "text-stone-900"}`}>
                                                {q.Title}
                                            </h3>
                                            {q.Description && <p className={`mt-1.5 text-sm leading-relaxed ${q.Type === 12 ? "text-sky-700" : "text-stone-500"}`}>{q.Description}</p>}
                                            </div>
                                            {q.IsRequired && q.Type !== 12 && (
                                                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-brand-primary sm:h-auto sm:w-auto sm:rounded-full sm:bg-orange-50 sm:px-2.5 sm:py-1 sm:text-[9px] sm:font-bold sm:uppercase sm:tracking-[0.12em] sm:text-orange-700" aria-label="Zorunlu alan">
                                                    <span className="hidden sm:inline">Zorunlu</span>
                                                </span>
                                            )}
                                        </div>

                                        {q.Type === 1 ? (
                                            <input 
                                                type="text" 
                                                className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-orange-100"
                                                value={answers[q.Id]?.textValue || ""}
                                                onChange={e => handleTextChange(q.Id, e.target.value)}
                                                placeholder="Yanıtınız..."
                                            />
                                        ) : q.Type === 2 ? (
                                            <textarea 
                                                className="min-h-[140px] w-full resize-y rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 text-sm leading-relaxed text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-orange-100"
                                                value={answers[q.Id]?.textValue || ""}
                                                onChange={e => handleTextChange(q.Id, e.target.value)}
                                                placeholder="Yanıtınız..."
                                            />
                                        ) : q.Type === 5 ? ( // YesNo
                                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                                <label className={`survey-choice flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${answers[q.Id]?.textValue === 'true' ? "border-orange-300 bg-orange-50 text-orange-950" : "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-orange-200 hover:bg-white"}`}>
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="radio" 
                                                                name={`question_${q.Id}`}
                                                                checked={answers[q.Id]?.textValue === 'true'}
                                                                onChange={() => handleTextChange(q.Id, 'true')}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-stone-300 transition peer-checked:border-brand-primary peer-checked:bg-brand-primary">
                                                                <div className={`h-2 w-2 rounded-full bg-white transition-opacity ${answers[q.Id]?.textValue === 'true' ? "opacity-100" : "opacity-0"}`}></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-semibold">Evet</span>
                                                </label>
                                                <label className={`survey-choice flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${answers[q.Id]?.textValue === 'false' ? "border-orange-300 bg-orange-50 text-orange-950" : "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-orange-200 hover:bg-white"}`}>
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="radio" 
                                                                name={`question_${q.Id}`}
                                                                checked={answers[q.Id]?.textValue === 'false'}
                                                                onChange={() => handleTextChange(q.Id, 'false')}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-stone-300 transition peer-checked:border-brand-primary peer-checked:bg-brand-primary">
                                                                <div className={`h-2 w-2 rounded-full bg-white transition-opacity ${answers[q.Id]?.textValue === 'false' ? "opacity-100" : "opacity-0"}`}></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-semibold">Hayır</span>
                                                </label>
                                            </div>
                                        ) : q.Type === 3 ? ( // Single Choice
                                            <div className="mt-2 space-y-2.5">
                                                {(q.Options || []).map((opt: any) => {
                                                    const isSelected = answers[q.Id]?.selectedOptionIds?.includes(opt.Id) || false;
                                                    return (
                                                    <label key={opt.Id} className={`survey-choice flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${isSelected ? "border-orange-300 bg-orange-50 text-orange-950" : "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-orange-200 hover:bg-white"}`}>
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="radio" 
                                                                name={`question_${q.Id}`}
                                                                checked={answers[q.Id]?.selectedOptionIds?.includes(opt.Id) || false}
                                                                onChange={() => handleSingleChoice(q.Id, opt.Id)}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-stone-300 transition peer-checked:border-brand-primary peer-checked:bg-brand-primary">
                                                                <div className={`h-2 w-2 rounded-full bg-white transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-medium">{opt.Text}</span>
                                                    </label>
                                                    );
                                                })}
                                            </div>
                                        ) : q.Type === 4 ? ( // Multiple Choice
                                            <div className="mt-2 space-y-2.5">
                                                {q.Options?.map((opt: any) => {
                                                    const isSelected = answers[q.Id]?.selectedOptionIds?.includes(opt.Id) || false;
                                                    return (
                                                    <label key={opt.Id} className={`survey-choice flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${isSelected ? "border-orange-300 bg-orange-50 text-orange-950" : "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-orange-200 hover:bg-white"}`}>
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={answers[q.Id]?.selectedOptionIds?.includes(opt.Id) || false}
                                                                onChange={e => handleMultipleChoice(q.Id, opt.Id, e.target.checked)}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-stone-300 transition peer-checked:border-brand-primary peer-checked:bg-brand-primary">
                                                                <Check className={`h-3 w-3 text-white transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-medium">{opt.Text}</span>
                                                    </label>
                                                    );
                                                })}
                                            </div>
                                        ) : q.Type === 6 ? ( // Rating
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                                {Array.from({ length: settings.maxStars || 5 }).map((_, i) => {
                                                    const starValue = i + 1;
                                                    const currentValue = answers[q.Id]?.numericValue || 0;
                                                    return (
                                                        <button
                                                            key={starValue}
                                                            type="button"
                                                            onClick={() => handleNumberChange(q.Id, starValue)}
                                                            aria-label={`${starValue} yıldız`}
                                                            className={`flex h-12 w-12 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-4 focus:ring-amber-100 ${starValue <= currentValue ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-stone-50 hover:border-amber-200 hover:bg-amber-50/60"}`}
                                                        >
                                                            <Star 
                                                                className={`h-7 w-7 transition ${starValue <= currentValue ? "fill-amber-400 text-amber-400" : "text-stone-300"}`}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : q.Type === 7 ? ( // NPS
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {Array.from({ length: 11 }).map((_, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => handleNumberChange(q.Id, i)}
                                                        aria-label={`Puan ${i}`}
                                                        className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-orange-100 ${
                                                            answers[q.Id]?.numericValue === i 
                                                            ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                                                            : "border-stone-200 bg-stone-50 text-stone-700 hover:border-orange-300 hover:bg-orange-50"
                                                        }`}
                                                    >
                                                        {i}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : q.Type === 8 ? ( // Number
                                            <input 
                                                type="number" 
                                                className="w-full max-w-sm rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-orange-100"
                                                value={answers[q.Id]?.numericValue ?? ""}
                                                onChange={e => handleNumberChange(q.Id, e.target.value === "" ? null : Number(e.target.value))}
                                                placeholder="Sayı girin..."
                                            />
                                        ) : q.Type === 9 ? ( // Date
                                            <input 
                                                type="date" 
                                                className="w-full max-w-sm rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-3.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-brand-primary focus:bg-white focus:ring-4 focus:ring-orange-100"
                                                value={answers[q.Id]?.textValue || ""}
                                                onChange={e => handleTextChange(q.Id, e.target.value)}
                                            />
                                        ) : q.Type === 10 ? ( // Matrix
                                            <div className="mt-2 overflow-x-auto rounded-xl border border-stone-200">
                                                {(() => {
                                                    let rows: string[] = [];
                                                    let cols: string[] = [];
                                                    try {
                                                        const s = JSON.parse(q.SettingsJson || '{}');
                                                        rows = s.rows || [];
                                                        cols = s.cols || [];
                                                    } catch {}

                                                    if (rows.length === 0 || cols.length === 0) return <div className="p-4 text-sm text-stone-500">Matris ayarları eksik.</div>;

                                                    const currentMatrixVal = answers[q.Id]?.textValue ? JSON.parse(answers[q.Id].textValue!) : {};

                                                    const handleMatrixChange = (rowIdx: number, colIdx: number) => {
                                                        const newMatrix = { ...currentMatrixVal, [rowIdx]: colIdx };
                                                        handleTextChange(q.Id, JSON.stringify(newMatrix));
                                                    };

                                                    return (
                                                        <table className="w-full min-w-[560px] text-left text-sm">
                                                            <thead>
                                                                <tr>
                                                                    <th className="border-b border-stone-200 bg-stone-100/80 p-3"></th>
                                                                    {cols.map((col, cIdx) => (
                                                                        <th key={cIdx} className="border-b border-stone-200 bg-stone-100/80 p-3 text-center text-xs font-semibold text-stone-600">{col}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rows.map((row, rIdx) => (
                                                                    <tr key={rIdx} className="border-b border-stone-100 transition-colors last:border-0 hover:bg-orange-50/30">
                                                                        <td className="p-3 font-medium text-stone-700">{row}</td>
                                                                        {cols.map((_, cIdx) => (
                                                                            <td key={cIdx} className="p-3 text-center">
                                                                                <input 
                                                                                    type="radio" 
                                                                                    name={`matrix_${q.Id}_${rIdx}`} 
                                                                                    checked={currentMatrixVal[rIdx] === cIdx}
                                                                                    onChange={() => handleMatrixChange(rIdx, cIdx)}
                                                                                    className="h-4 w-4 cursor-pointer accent-orange-500 focus:ring-brand-primary"
                                                                                />
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    );
                                                })()}
                                            </div>
                                        ) : q.Type === 11 ? ( // File
                                            <div className="mt-2 space-y-3">
                                                {uploadingFiles[q.Id] ? (
                                                    <div className="flex items-center rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm font-medium text-brand-primary">
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Dosya yükleniyor...
                                                    </div>
                                                ) : !answers[q.Id]?.textValue ? (
                                                    <input 
                                                        type="file"
                                                        disabled={isSubmitting}
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            
                                                            setUploadingFiles(prev => ({ ...prev, [q.Id]: true }));
                                                            try {
                                                                const uploadResult = await surveyFillService.uploadFile(file, token!, q.Id);
                                                                handleTextChange(q.Id, JSON.stringify({
                                                                    fileId: uploadResult.fileId,
                                                                    fileName: uploadResult.fileName,
                                                                    contentType: uploadResult.contentType,
                                                                    fileSize: uploadResult.size
                                                                }));
                                                                toast.success("Dosya yüklendi.");
                                                            } catch (err: any) {
                                                                console.error("Dosya yükleme hatası", err);
                                                                toast.error(err.response?.data?.Message || "Dosya yüklenemedi.");
                                                            } finally {
                                                                setUploadingFiles(prev => ({ ...prev, [q.Id]: false }));
                                                                // Reset file input
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="block w-full cursor-pointer rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3 text-sm text-stone-600 transition file:mr-4 file:rounded-lg file:border-0 file:bg-stone-950 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:border-orange-300 hover:bg-orange-50/30 disabled:opacity-50"
                                                    />
                                                ) : null}
                                                
                                                {answers[q.Id]?.textValue && (
                                                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                                        <span className="truncate text-sm font-medium text-emerald-900">
                                                            {(() => {
                                                                try {
                                                                    const data = JSON.parse(answers[q.Id].textValue!);
                                                                    return data.fileName || "Dosya Yüklendi";
                                                                } catch {
                                                                    return "Dosya Yüklendi";
                                                                }
                                                            })()}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => handleTextChange(q.Id, "")}
                                                            className="ml-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                                        >
                                                            Kaldır
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : q.Type === 12 ? ( // Info
                                            null // Rendered via description above
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm italic text-stone-500">
                                                Desteklenmeyen soru tipi: {q.Type}
                                            </div>
                                        )}
                                    </section>
                                    );
                                })}
                            </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-stone-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
                            <button
                                onClick={() => goToSection(safeRenderIndex - 1)}
                                disabled={safeRenderIndex <= 0 || isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Geri
                            </button>

                            <div className="hidden text-center sm:block">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">İlerleme</p>
                                <p className="mt-0.5 text-xs font-semibold text-stone-600">{safeRenderIndex + 1}. bölüm, toplam {visibleSections.length || 1}</p>
                            </div>

                            {isLastSection ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || visibleSections.length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(246,137,76,0.9)] transition hover:-translate-y-0.5 hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    {isSubmitting ? "Gönderiliyor..." : "Anketi tamamla"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => goToSection(safeRenderIndex + 1)}
                                    disabled={isSubmitting || visibleSections.length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(28,20,18,0.7)] transition hover:-translate-y-0.5 hover:bg-stone-800 focus:outline-none focus:ring-4 focus:ring-stone-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Sonraki bölüm
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </main>
                </div>

                <footer className="mt-6 flex flex-col items-center justify-between gap-2 px-2 text-center text-xs text-stone-500 sm:flex-row sm:text-left">
                    <p>Formfleks ile güvenli ve erişilebilir anket deneyimi</p>
                    <p>Yanıtlar gönderilene kadar taslak olarak bu cihazda saklanır.</p>
                </footer>
            </div>
        </div>
    );
};

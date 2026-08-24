import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { surveyFillService, type SurveyFillDto, type SurveyAnswerDto } from "../services/surveyFill.service";
import toast from "react-hot-toast";
import { CheckCircle2, Star, Loader2 } from "lucide-react";

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
                setCurrentSectionIndex(firstErrorSectionIndex);
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
        let icon = <Loader2 className="w-12 h-12 text-brand-gray animate-spin mx-auto mb-4" />;
        let title = "Bir Hata Oluştu";
        let colorClass = "text-red-500";
        let bgClass = "bg-red-50";
        let borderClass = "border-red-100";

        if (errMsg.toLowerCase().includes("zaten doldurdunuz")) {
            icon = <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />;
            title = "Anket Tamamlanmış";
            colorClass = "text-green-600";
            bgClass = "bg-green-50";
            borderClass = "border-green-100";
        } else if (errMsg.toLowerCase().includes("süresi dolmuş") || errMsg.toLowerCase().includes("aktif değil") || errMsg.toLowerCase().includes("geçersiz") || errMsg.toLowerCase().includes("başlangıç tarihi")) {
            // Using a simple clock/alert SVG since we might not have the exact lucide-react import ready for it
            icon = (
                <svg className="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
            title = "Erişim Yok";
            colorClass = "text-amber-600";
            bgClass = "bg-amber-50";
            borderClass = "border-amber-100";
        } else {
            icon = (
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
        }

        return (
            <div className="min-h-screen bg-surface-ground flex flex-col items-center justify-center p-6">
                <div className={`max-w-md w-full p-8 text-center rounded-2xl shadow-xl border ${bgClass} ${borderClass}`}>
                    {icon}
                    <h2 className={`text-2xl font-bold mb-4 ${colorClass}`}>{title}</h2>
                    <p className="text-brand-dark font-medium leading-relaxed">{errMsg}</p>
                    <p className="text-brand-gray text-sm mt-6">
                        Bu sayfayı artık kapatabilirsiniz veya daha fazla bilgi için sistem yöneticinizle iletişime geçebilirsiniz.
                    </p>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen bg-surface-ground flex flex-col items-center justify-center p-6">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
            <p className="mt-4 text-brand-gray font-medium">Anket yükleniyor, lütfen bekleyin...</p>
        </div>
    );

    if (error) return renderErrorState(error);
    if (!survey || !parsedConfig) return renderErrorState("Geçersiz anket verisi.");

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-surface-ground py-20 px-4 flex items-center justify-center">
                <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-sm border border-surface-muted text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-brand-dark mb-3">Teşekkürler!</h2>
                    <p className="text-brand-gray mb-8">Anket yanıtlarınız başarıyla kaydedilmiştir. Katılımınız için teşekkür ederiz.</p>
                    
                    {receiptCode && (
                        <div className="bg-surface-ground p-4 rounded-lg mb-8 border border-surface-muted text-center">
                            <p className="text-xs text-brand-gray uppercase font-semibold tracking-wider mb-2">Makbuz Kodunuz (Gizlilik Katılım Kanıtı)</p>
                            <p className="text-xl font-mono font-bold text-brand-dark tracking-widest bg-white p-2 rounded border border-surface-muted inline-block">{receiptCode}</p>
                            <p className="text-xs text-brand-gray mt-2">Bu kod tamamen size özeldir. Yöneticiler bu kod ile yanıtların size ait olduğunu bilemez, ancak siz katıldığınızı kanıtlayabilirsiniz.</p>
                        </div>
                    )}

                    <button 
                        onClick={() => navigate("/auth/login")}
                        className="bg-brand-primary text-white font-medium px-6 py-2.5 rounded-md hover:bg-brand-primary/90 transition-colors w-full"
                    >
                        Sayfayı Kapat
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-ground py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-surface-muted overflow-hidden">
                {/* Header */}
                <div className="bg-brand-primary p-8 text-white">
                    <h1 className="text-2xl font-bold">{survey.campaignTitle}</h1>
                    {survey.isAnonymous && (
                        <p className="mt-4 text-sm font-medium bg-white/20 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm">
                            🔒 Bu anket tamamen anonimdir. Kimlik bilgileriniz kaydedilmez.
                        </p>
                    )}
                </div>

                {/* Form Body */}
                <div className="p-8 space-y-12">
                    {(() => {
                        const visibleSections = parsedConfig.map((section: any) => ({
                            ...section,
                            Questions: section.Questions.filter(shouldRenderQuestion)
                        })).filter((s: any) => s.Questions.length > 0);

                        if (visibleSections.length === 0) return <div className="text-center text-brand-gray">Gösterilecek soru bulunmuyor.</div>;

                        const safeRenderIndex = Math.min(currentSectionIndex, visibleSections.length - 1);
                        const section = visibleSections[safeRenderIndex];
                        
                        return (
                        <div key={section.Id} className="space-y-6">
                            {(section.Title || section.Description) && (
                                <div className="border-b border-surface-muted pb-3 mb-6">
                                    <h2 className="text-xl font-bold text-brand-dark">{section.Title}</h2>
                                    {section.Description && <p className="text-sm text-brand-gray mt-2">{section.Description}</p>}
                                </div>
                            )}

                            <div className="space-y-8">
                                {section.Questions.map((q: any) => {
                                    let settings: any = {};
                                    try { if (q.SettingsJson) settings = JSON.parse(q.SettingsJson); } catch {}

                                    return (
                                    <div key={q.Id} className={`bg-surface-base p-6 rounded-lg border border-surface-muted transition-colors hover:border-brand-primary/30 ${q.Type === 12 ? "bg-blue-50/50 border-blue-100" : ""}`}>
                                        <div className="mb-4">
                                            <h3 className={`text-base font-semibold ${q.Type === 12 ? "text-blue-900" : "text-brand-dark"}`}>
                                                {q.Title} {q.IsRequired && q.Type !== 12 && <span className="text-red-500 ml-1">*</span>}
                                            </h3>
                                            {q.Description && <p className={`text-sm mt-1 ${q.Type === 12 ? "text-blue-700" : "text-brand-gray"}`}>{q.Description}</p>}
                                        </div>

                                        {q.Type === 1 ? (
                                            <input 
                                                type="text" 
                                                className="w-full border-surface-muted rounded-md shadow-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm p-3 border outline-none transition-all"
                                                value={answers[q.Id]?.textValue || ""}
                                                onChange={e => handleTextChange(q.Id, e.target.value)}
                                                placeholder="Yanıtınız..."
                                            />
                                        ) : q.Type === 2 ? (
                                            <textarea 
                                                className="w-full border-surface-muted rounded-md shadow-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm p-3 border outline-none transition-all min-h-[120px] resize-y"
                                                value={answers[q.Id]?.textValue || ""}
                                                onChange={e => handleTextChange(q.Id, e.target.value)}
                                                placeholder="Yanıtınız..."
                                            />
                                        ) : q.Type === 5 ? ( // YesNo
                                            <div className="space-y-3 mt-4">
                                                <label className="flex items-center space-x-3 cursor-pointer group">
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="radio" 
                                                                name={`question_${q.Id}`}
                                                                checked={answers[q.Id]?.textValue === 'true'}
                                                                onChange={() => handleTextChange(q.Id, 'true')}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="w-5 h-5 rounded-full border-2 border-surface-muted peer-checked:border-brand-primary peer-checked:bg-brand-primary transition-all flex items-center justify-center">
                                                                <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-brand-dark group-hover:text-brand-primary transition-colors">Evet</span>
                                                </label>
                                                <label className="flex items-center space-x-3 cursor-pointer group">
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="radio" 
                                                                name={`question_${q.Id}`}
                                                                checked={answers[q.Id]?.textValue === 'false'}
                                                                onChange={() => handleTextChange(q.Id, 'false')}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="w-5 h-5 rounded-full border-2 border-surface-muted peer-checked:border-brand-primary peer-checked:bg-brand-primary transition-all flex items-center justify-center">
                                                                <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-brand-dark group-hover:text-brand-primary transition-colors">Hayır</span>
                                                </label>
                                            </div>
                                        ) : q.Type === 3 ? ( // Single Choice
                                            <div className="space-y-3 mt-4">
                                                {(q.Options || []).map((opt: any) => (
                                                    <label key={opt.Id} className="flex items-center space-x-3 cursor-pointer group">
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="radio" 
                                                                name={`question_${q.Id}`}
                                                                checked={answers[q.Id]?.selectedOptionIds?.includes(opt.Id) || false}
                                                                onChange={() => handleSingleChoice(q.Id, opt.Id)}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="w-5 h-5 rounded-full border-2 border-surface-muted peer-checked:border-brand-primary peer-checked:bg-brand-primary transition-all flex items-center justify-center">
                                                                <div className="w-2 h-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-brand-dark group-hover:text-brand-primary transition-colors">{opt.Text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : q.Type === 4 ? ( // Multiple Choice
                                            <div className="space-y-3 mt-4">
                                                {q.Options?.map((opt: any) => (
                                                    <label key={opt.Id} className="flex items-center space-x-3 cursor-pointer group">
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={answers[q.Id]?.selectedOptionIds?.includes(opt.Id) || false}
                                                                onChange={e => handleMultipleChoice(q.Id, opt.Id, e.target.checked)}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="w-5 h-5 rounded border-2 border-surface-muted peer-checked:border-brand-primary peer-checked:bg-brand-primary transition-all flex items-center justify-center">
                                                                <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-brand-dark group-hover:text-brand-primary transition-colors">{opt.Text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : q.Type === 6 ? ( // Rating
                                            <div className="flex gap-2 items-center mt-2">
                                                {Array.from({ length: settings.maxStars || 5 }).map((_, i) => {
                                                    const starValue = i + 1;
                                                    const currentValue = answers[q.Id]?.numericValue || 0;
                                                    return (
                                                        <button
                                                            key={starValue}
                                                            type="button"
                                                            onClick={() => handleNumberChange(q.Id, starValue)}
                                                            className="focus:outline-none transition-transform hover:scale-110"
                                                        >
                                                            <Star 
                                                                className={`w-8 h-8 ${starValue <= currentValue ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : q.Type === 7 ? ( // NPS
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                {Array.from({ length: 11 }).map((_, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => handleNumberChange(q.Id, i)}
                                                        className={`w-10 h-10 rounded-md font-medium flex items-center justify-center transition-colors ${
                                                            answers[q.Id]?.numericValue === i 
                                                            ? "bg-brand-primary text-white border-brand-primary" 
                                                            : "bg-white border border-surface-muted text-brand-dark hover:border-brand-primary"
                                                        }`}
                                                    >
                                                        {i}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : q.Type === 8 ? ( // Number
                                            <input 
                                                type="number" 
                                                className="w-full max-w-sm border-surface-muted rounded-md shadow-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm p-3 border outline-none transition-all"
                                                value={answers[q.Id]?.numericValue ?? ""}
                                                onChange={e => handleNumberChange(q.Id, e.target.value === "" ? null : Number(e.target.value))}
                                                placeholder="Sayı girin..."
                                            />
                                        ) : q.Type === 9 ? ( // Date
                                            <input 
                                                type="date" 
                                                className="w-full max-w-sm border-surface-muted rounded-md shadow-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm p-3 border outline-none transition-all"
                                                value={answers[q.Id]?.textValue || ""}
                                                onChange={e => handleTextChange(q.Id, e.target.value)}
                                            />
                                        ) : q.Type === 10 ? ( // Matrix
                                            <div className="overflow-x-auto mt-4">
                                                {(() => {
                                                    let rows: string[] = [];
                                                    let cols: string[] = [];
                                                    try {
                                                        const s = JSON.parse(q.SettingsJson || '{}');
                                                        rows = s.rows || [];
                                                        cols = s.cols || [];
                                                    } catch {}

                                                    if (rows.length === 0 || cols.length === 0) return <div className="text-sm text-brand-gray">Matris ayarları eksik.</div>;

                                                    const currentMatrixVal = answers[q.Id]?.textValue ? JSON.parse(answers[q.Id].textValue!) : {};

                                                    const handleMatrixChange = (rowIdx: number, colIdx: number) => {
                                                        const newMatrix = { ...currentMatrixVal, [rowIdx]: colIdx };
                                                        handleTextChange(q.Id, JSON.stringify(newMatrix));
                                                    };

                                                    return (
                                                        <table className="w-full text-sm text-left">
                                                            <thead>
                                                                <tr>
                                                                    <th className="p-2 border-b border-surface-muted bg-surface-ground"></th>
                                                                    {cols.map((col, cIdx) => (
                                                                        <th key={cIdx} className="p-2 border-b border-surface-muted bg-surface-ground text-center font-medium">{col}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {rows.map((row, rIdx) => (
                                                                    <tr key={rIdx} className="border-b border-surface-muted last:border-0 hover:bg-surface-ground/50 transition-colors">
                                                                        <td className="p-2 font-medium">{row}</td>
                                                                        {cols.map((_, cIdx) => (
                                                                            <td key={cIdx} className="p-2 text-center">
                                                                                <input 
                                                                                    type="radio" 
                                                                                    name={`matrix_${q.Id}_${rIdx}`} 
                                                                                    checked={currentMatrixVal[rIdx] === cIdx}
                                                                                    onChange={() => handleMatrixChange(rIdx, cIdx)}
                                                                                    className="w-4 h-4 text-brand-primary border-surface-muted focus:ring-brand-primary cursor-pointer"
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
                                            <div className="mt-2 space-y-2">
                                                {uploadingFiles[q.Id] ? (
                                                    <div className="flex items-center text-sm text-brand-primary">
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                                                        className="block w-full text-sm text-brand-dark file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                                                    />
                                                ) : null}
                                                
                                                {answers[q.Id]?.textValue && (
                                                    <div className="flex items-center justify-between p-3 border border-surface-muted rounded-md bg-surface">
                                                        <span className="text-sm text-brand-dark truncate">
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
                                                            className="text-red-500 hover:text-red-700 disabled:opacity-50 text-sm ml-2"
                                                        >
                                                            Kaldır
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : q.Type === 12 ? ( // Info
                                            null // Rendered via description above
                                        ) : (
                                            <div className="text-sm text-brand-gray italic p-4 bg-surface-ground rounded-md border border-surface-muted border-dashed">
                                                Desteklenmeyen soru tipi: {q.Type}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                        );
                    })()}
                </div>

                <div className="p-8 bg-surface-ground border-t border-surface-muted flex justify-between items-center">
                    {(() => {
                        const visibleSections = parsedConfig.map((section: any) => ({
                            ...section,
                            Questions: section.Questions.filter(shouldRenderQuestion)
                        })).filter((s: any) => s.Questions.length > 0);
                        
                        const safeRenderIndex = Math.min(currentSectionIndex, visibleSections.length - 1);
                        const isLastSection = safeRenderIndex >= visibleSections.length - 1;
                        
                        return (
                            <>
                                <button
                                    onClick={() => setCurrentSectionIndex(Math.max(0, safeRenderIndex - 1))}
                                    disabled={safeRenderIndex <= 0 || isSubmitting}
                                    className="px-6 py-2.5 border border-surface-muted rounded-md text-sm font-medium text-brand-dark hover:bg-surface-muted transition-colors disabled:opacity-50"
                                >
                                    Geri
                                </button>
                                
                                <div className="text-xs text-brand-gray">
                                    Bölüm {safeRenderIndex + 1} / {visibleSections.length || 1}
                                </div>

                                {isLastSection ? (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="bg-brand-primary text-white font-medium px-8 py-2.5 rounded-md hover:bg-brand-primary/90 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {isSubmitting ? "Gönderiliyor..." : "Anketi Tamamla"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setCurrentSectionIndex(Math.min(visibleSections.length - 1, safeRenderIndex + 1))}
                                        disabled={isSubmitting}
                                        className="bg-brand-dark text-white font-medium px-8 py-2.5 rounded-md hover:bg-brand-dark/90 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        İleri
                                    </button>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

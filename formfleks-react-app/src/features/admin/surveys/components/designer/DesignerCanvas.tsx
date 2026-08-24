import { useSurveyDesignerStore } from '../../hooks/useSurveyDesignerStore';
import type { QuestionType, SurveyVersionQuestion } from '../../hooks/useSurveyDesignerStore';
import { Plus, GripVertical, FileText, CheckSquare, List, MessageSquare, AlignLeft, Hash, Calendar, CircleDot } from 'lucide-react';
import { cn } from '@/components/ui';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const QUESTION_ICONS: Record<QuestionType, React.ElementType> = {
    ShortText: AlignLeft,
    LongText: MessageSquare,
    SingleChoice: CircleDot,
    MultipleChoice: CheckSquare,
    YesNo: List,
    Rating: List,
    NPS: List,
    Number: Hash,
    Date: Calendar,
    Matrix: List,
    File: FileText,
    Info: FileText
};

const SortableQuestionCard = ({ q, isActive, onClick }: { q: SurveyVersionQuestion, isActive: boolean, onClick: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: q.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = QUESTION_ICONS[q.type] || FileText;

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className={cn(
                "group relative bg-white rounded-xl shadow-sm border transition-all duration-200 z-10",
                isActive 
                    ? "border-brand-primary ring-1 ring-brand-primary/20" 
                    : "border-surface-muted hover:border-brand-primary/50 cursor-pointer"
            )}
            onClick={onClick}
        >
            {/* Drag handle */}
            <div 
                {...attributes} 
                {...listeners}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 opacity-0 group-hover:opacity-100 p-1 bg-white border border-surface-muted rounded-md shadow-sm cursor-grab active:cursor-grabbing z-20 hover:text-brand-primary"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-surface-ground rounded-lg shrink-0 mt-1">
                        <Icon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div className="flex-1">
                        {isActive ? (
                            <input
                                type="text"
                                value={q.title}
                                readOnly
                                className="w-full text-base font-medium text-brand-dark border-none bg-transparent p-0 focus:ring-0 mb-2 cursor-pointer"
                            />
                        ) : (
                            <h3 className="text-base font-medium text-brand-dark mb-2">
                                {q.title || 'Soru başlığı yok'}
                                {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                            </h3>
                        )}
                        
                        {/* Mock preview based on type */}
                        <div className="mt-4 text-sm text-brand-gray">
                            {['ShortText', 'Number', 'Date'].includes(q.type) && (
                                <div className="w-full md:w-1/2 border-b border-surface-muted pb-1 text-brand-gray/50 italic">
                                    Kısa yanıt metni
                                </div>
                            )}
                            {q.type === 'LongText' && (
                                <div className="w-full border-b border-surface-muted pb-1 text-brand-gray/50 italic">
                                    Uzun yanıt metni
                                </div>
                            )}
                            {['SingleChoice', 'MultipleChoice'].includes(q.type) && (
                                <div className="space-y-2 mt-2">
                                    {q.options.map(opt => (
                                        <div key={opt.id} className="flex items-center gap-2">
                                            {q.type === 'SingleChoice' ? (
                                                <div className="w-4 h-4 rounded-full border border-surface-muted" />
                                            ) : (
                                                <div className="w-4 h-4 rounded border border-surface-muted" />
                                            )}
                                            <span>{opt.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DesignerCanvas = () => {
    const { 
        title, 
        description, 
        sections, 
        activeSectionId,
        activeQuestionId,
        setTitle,
        setDescription,
        setActiveQuestion,
        addQuestion,
        reorderQuestions
    } = useSurveyDesignerStore();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    if (sections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-brand-gray">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p>Henüz bölüm eklenmedi.</p>
            </div>
        );
    }

    const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = activeSection.questions.findIndex(q => q.id === active.id);
            const newIndex = activeSection.questions.findIndex(q => q.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                reorderQuestions(activeSection.id, oldIndex, newIndex);
            }
        }
    };

    return (
        <div className="space-y-8 pb-32">
            {/* Survey Header */}
            <div className="bg-white rounded-xl p-8 shadow-sm border-t-8 border-brand-primary">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Anket Başlığı"
                    className="w-full text-3xl font-bold text-brand-dark border-none bg-transparent p-0 focus:ring-0 placeholder:text-brand-gray/30 mb-4"
                />
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Anket açıklaması (isteğe bağlı)"
                    className="w-full text-sm text-brand-gray border-none bg-transparent p-0 focus:ring-0 resize-none min-h-[60px] placeholder:text-brand-gray/40"
                />
            </div>

            {/* Questions list for active section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-brand-dark">
                        {activeSection.title || 'İsimsiz Bölüm'}
                    </h2>
                    <span className="text-xs font-medium text-brand-gray bg-surface-muted px-2 py-1 rounded-md">
                        {activeSection.questions.length} Soru
                    </span>
                </div>

                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={activeSection.questions.map(q => q.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {activeSection.questions.map((q) => (
                            <SortableQuestionCard 
                                key={q.id}
                                q={q}
                                isActive={activeQuestionId === q.id}
                                onClick={() => setActiveQuestion(q.id)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {/* Add Question Button Area */}
                <div className="pt-4">
                    <div className="bg-white border border-dashed border-surface-muted rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-brand-primary/5 rounded-full flex items-center justify-center mb-3">
                            <Plus className="h-6 w-6 text-brand-primary" />
                        </div>
                        <h3 className="text-sm font-medium text-brand-dark mb-1">Yeni Soru Ekle</h3>
                        <p className="text-xs text-brand-gray mb-4">Bu bölüme yeni bir soru eklemek için aşağıdaki türlerden birini seçin.</p>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
                            <button onClick={() => addQuestion(activeSection.id, 'SingleChoice')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Çoktan Seçmeli</button>
                            <button onClick={() => addQuestion(activeSection.id, 'MultipleChoice')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Onay Kutuları</button>
                            <button onClick={() => addQuestion(activeSection.id, 'ShortText')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Kısa Metin</button>
                            <button onClick={() => addQuestion(activeSection.id, 'LongText')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Uzun Metin</button>
                            <button onClick={() => addQuestion(activeSection.id, 'YesNo')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Evet/Hayır</button>
                            <button onClick={() => addQuestion(activeSection.id, 'Rating')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Yıldız</button>
                            <button onClick={() => addQuestion(activeSection.id, 'NPS')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">NPS</button>
                            <button onClick={() => addQuestion(activeSection.id, 'Number')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Sayı</button>
                            <button onClick={() => addQuestion(activeSection.id, 'Date')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Tarih</button>
                            <button onClick={() => addQuestion(activeSection.id, 'Matrix')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Matris</button>
                            <button onClick={() => addQuestion(activeSection.id, 'File')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Dosya Yükleme</button>
                            <button onClick={() => addQuestion(activeSection.id, 'Info')} className="px-3 py-1.5 bg-surface-ground hover:bg-surface-muted border border-surface-muted rounded-md text-xs font-medium text-brand-dark transition-colors">Bilgi</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

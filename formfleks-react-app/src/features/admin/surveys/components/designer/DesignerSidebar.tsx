import { Plus, GripVertical, FileText, ChevronRight } from 'lucide-react';
import { useSurveyDesignerStore } from '../../hooks/useSurveyDesignerStore';
import type { SurveyVersionSection } from '../../hooks/useSurveyDesignerStore';
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

const SortableSectionItem = ({ 
    section, 
    sIdx, 
    isActive, 
    activeQuestionId, 
    onSelectSection, 
    onSelectQuestion 
}: { 
    section: SurveyVersionSection, 
    sIdx: number, 
    isActive: boolean, 
    activeQuestionId: string | null, 
    onSelectSection: () => void, 
    onSelectQuestion: (qId: string) => void 
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="space-y-0.5">
            {/* Section Item */}
            <div 
                className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer group transition-colors relative z-10",
                    isActive && !activeQuestionId 
                        ? "bg-brand-primary/10 text-brand-primary font-medium" 
                        : "text-brand-dark hover:bg-surface-muted/50"
                )}
                onClick={onSelectSection}
            >
                <div 
                    {...attributes} 
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand-primary"
                >
                    <GripVertical className="h-4 w-4 text-brand-gray/40 hover:text-brand-primary" />
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-brand-gray" />
                <span className="truncate flex-1">
                    {section.title || `Bölüm ${sIdx + 1}`}
                </span>
            </div>

            {/* Questions List under Section (No DND here to keep it simple in Sidebar) */}
            {section.questions.map((q, qIdx) => (
                <div 
                    key={q.id}
                    className={cn(
                        "flex items-center gap-2 px-2 py-1.5 ml-6 rounded-md text-xs cursor-pointer group transition-colors",
                        activeQuestionId === q.id
                            ? "bg-surface-muted text-brand-dark font-medium"
                            : "text-brand-gray hover:bg-surface-muted/50 hover:text-brand-dark"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectQuestion(q.id);
                    }}
                >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">
                        {q.title || `Soru ${qIdx + 1}`}
                    </span>
                </div>
            ))}
        </div>
    );
};

export const DesignerSidebar = () => {
    const { 
        sections, 
        activeSectionId, 
        activeQuestionId, 
        addSection, 
        setActiveSection, 
        setActiveQuestion,
        reorderSections
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex(s => s.id === active.id);
            const newIndex = sections.findIndex(s => s.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                reorderSections(oldIndex, newIndex);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={sections.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {sections.map((section, sIdx) => (
                            <SortableSectionItem
                                key={section.id}
                                section={section}
                                sIdx={sIdx}
                                isActive={activeSectionId === section.id}
                                activeQuestionId={activeQuestionId}
                                onSelectSection={() => setActiveSection(section.id)}
                                onSelectQuestion={setActiveQuestion}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <button 
                onClick={addSection}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-surface-muted rounded-md text-xs font-medium text-brand-gray hover:text-brand-primary hover:border-brand-primary/30 transition-colors"
            >
                <Plus className="h-4 w-4" />
                Yeni Bölüm Ekle
            </button>
        </div>
    );
};

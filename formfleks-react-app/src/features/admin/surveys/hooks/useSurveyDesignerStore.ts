import { create } from 'zustand';

export type QuestionType = 
  | 'ShortText' 
  | 'LongText' 
  | 'SingleChoice' 
  | 'MultipleChoice' 
  | 'YesNo' 
  | 'Rating' 
  | 'NPS' 
  | 'Number' 
  | 'Date' 
  | 'Matrix' 
  | 'File' 
  | 'Info';

export interface SurveyQuestionOption {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  isOtherOption: boolean;
}

export interface SurveyVersionQuestion {
  id: string;
  sectionId: string;
  type: QuestionType;
  title: string;
  description?: string;
  isRequired: boolean;
  sortOrder: number;
  options: SurveyQuestionOption[];
  settingsJson?: string;
  visibilityRuleJson?: string;
}

export interface SurveyVersionSection {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  questions: SurveyVersionQuestion[];
}

interface SurveyDesignerState {
  templateId: string | null;
  versionId: string | null;
  title: string;
  description: string;
  defaultIsAnonymous: boolean;
  sections: SurveyVersionSection[];
  activeSectionId: string | null;
  activeQuestionId: string | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;

  // Actions
  initialize: (templateId: string, versionId: string, title: string, description: string, defaultIsAnonymous: boolean, sections: SurveyVersionSection[]) => void;
  setTitle: (title: string) => void;
  setDefaultIsAnonymous: (value: boolean) => void;
  setDescription: (description: string) => void;
  
  addSection: () => void;
  updateSection: (id: string, updates: Partial<SurveyVersionSection>) => void;
  deleteSection: (id: string) => void;
  setActiveSection: (id: string | null) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;
  
  addQuestion: (sectionId: string, type: QuestionType) => void;
  updateQuestion: (id: string, updates: Partial<SurveyVersionQuestion>) => void;
  deleteQuestion: (id: string) => void;
  setActiveQuestion: (id: string | null) => void;
  reorderQuestions: (sectionId: string, startIndex: number, endIndex: number) => void;
  
  addOption: (questionId: string) => void;
  updateOption: (questionId: string, optionId: string, updates: Partial<SurveyQuestionOption>) => void;
  deleteOption: (questionId: string, optionId: string) => void;
  reorderOptions: (questionId: string, startIndex: number, endIndex: number) => void;

  setSaveStatus: (isSaving: boolean, success?: boolean) => void;
}

const generateId = () => crypto.randomUUID();

export const useSurveyDesignerStore = create<SurveyDesignerState>((set, get) => ({
  templateId: null,
  versionId: null,
  title: '',
  description: '',
  defaultIsAnonymous: false,
  sections: [],
  activeSectionId: null,
  activeQuestionId: null,
  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false,

  initialize: (templateId, versionId, title, description, defaultIsAnonymous, sections) => set({
    templateId,
    versionId,
    title,
    description,
    defaultIsAnonymous,
    sections,
    activeSectionId: sections.length > 0 ? sections[0].id : null,
    activeQuestionId: null,
    hasUnsavedChanges: false,
    lastSavedAt: new Date()
  }),

  setTitle: (title) => set({ title, hasUnsavedChanges: true }),
  setDescription: (description) => set({ description, hasUnsavedChanges: true }),
  setDefaultIsAnonymous: (value) => set({ defaultIsAnonymous: value, hasUnsavedChanges: true }),

  addSection: () => {
    const newSection: SurveyVersionSection = {
      id: generateId(),
      title: 'Yeni Bölüm',
      sortOrder: get().sections.length,
      questions: []
    };
    set((state) => ({
      sections: [...state.sections, newSection],
      activeSectionId: newSection.id,
      activeQuestionId: null,
      hasUnsavedChanges: true
    }));
  },

  updateSection: (id, updates) => set((state) => ({
    sections: state.sections.map(s => s.id === id ? { ...s, ...updates } : s),
    hasUnsavedChanges: true
  })),

  deleteSection: (id) => set((state) => {
    const newSections = state.sections.filter(s => s.id !== id);
    const activeSectionId = state.activeSectionId === id 
      ? (newSections.length > 0 ? newSections[0].id : null) 
      : state.activeSectionId;
    
    return {
      sections: newSections,
      activeSectionId,
      activeQuestionId: state.activeSectionId === id ? null : state.activeQuestionId,
      hasUnsavedChanges: true
    };
  }),

  setActiveSection: (id) => set({ activeSectionId: id, activeQuestionId: null }),

  reorderSections: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.sections);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    // update sort orders
    const updated = result.map((s, idx) => ({ ...s, sortOrder: idx }));
    return { sections: updated, hasUnsavedChanges: true };
  }),

  addQuestion: (sectionId, type) => set((state) => {
    const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return state;

    const section = state.sections[sectionIndex];
    const newQuestion: SurveyVersionQuestion = {
      id: generateId(),
      sectionId,
      type,
      title: 'Yeni Soru',
      isRequired: false,
      sortOrder: section.questions.length,
      options: ['SingleChoice', 'MultipleChoice'].includes(type) ? [
        { id: generateId(), label: 'Seçenek 1', value: 'secenek-1', sortOrder: 0, isOtherOption: false }
      ] : []
    };

    const newSections = [...state.sections];
    newSections[sectionIndex] = {
      ...section,
      questions: [...section.questions, newQuestion]
    };

    return {
      sections: newSections,
      activeQuestionId: newQuestion.id,
      activeSectionId: sectionId, // Ensure section is active
      hasUnsavedChanges: true
    };
  }),

  updateQuestion: (id, updates) => set((state) => {
    const newSections = state.sections.map(s => ({
      ...s,
      questions: s.questions.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
    return { sections: newSections, hasUnsavedChanges: true };
  }),

  deleteQuestion: (id) => set((state) => {
    const newSections = state.sections.map(s => ({
      ...s,
      questions: s.questions.filter(q => q.id !== id)
    }));
    return { 
      sections: newSections, 
      activeQuestionId: state.activeQuestionId === id ? null : state.activeQuestionId,
      hasUnsavedChanges: true 
    };
  }),

  setActiveQuestion: (id) => {
    const state = get();
    if (id) {
      // Find section of this question
      const section = state.sections.find(s => s.questions.some(q => q.id === id));
      if (section) {
        set({ activeQuestionId: id, activeSectionId: section.id });
        return;
      }
    }
    set({ activeQuestionId: id });
  },

  reorderQuestions: (sectionId, startIndex, endIndex) => set((state) => {
    const sectionIndex = state.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return state;

    const section = state.sections[sectionIndex];
    const result = Array.from(section.questions);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updatedQuestions = result.map((q, idx) => ({ ...q, sortOrder: idx }));
    
    const newSections = [...state.sections];
    newSections[sectionIndex] = { ...section, questions: updatedQuestions };

    return { sections: newSections, hasUnsavedChanges: true };
  }),

  addOption: (questionId) => set((state) => {
    const newSections = state.sections.map(s => ({
      ...s,
      questions: s.questions.map(q => {
        if (q.id === questionId) {
          const newOption: SurveyQuestionOption = {
            id: generateId(),
            label: `Seçenek ${q.options.length + 1}`,
            value: `secenek-${q.options.length + 1}`,
            sortOrder: q.options.length,
            isOtherOption: false
          };
          return { ...q, options: [...q.options, newOption] };
        }
        return q;
      })
    }));
    return { sections: newSections, hasUnsavedChanges: true };
  }),

  updateOption: (questionId, optionId, updates) => set((state) => {
    const newSections = state.sections.map(s => ({
      ...s,
      questions: s.questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            options: q.options.map(o => o.id === optionId ? { ...o, ...updates } : o)
          };
        }
        return q;
      })
    }));
    return { sections: newSections, hasUnsavedChanges: true };
  }),

  deleteOption: (questionId, optionId) => set((state) => {
    const newSections = state.sections.map(s => ({
      ...s,
      questions: s.questions.map(q => {
        if (q.id === questionId) {
          return { ...q, options: q.options.filter(o => o.id !== optionId) };
        }
        return q;
      })
    }));
    return { sections: newSections, hasUnsavedChanges: true };
  }),

  reorderOptions: (questionId, startIndex, endIndex) => set((state) => {
    const newSections = state.sections.map(s => ({
      ...s,
      questions: s.questions.map(q => {
        if (q.id === questionId) {
          const result = Array.from(q.options);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          const updatedOptions = result.map((o, idx) => ({ ...o, sortOrder: idx }));
          return { ...q, options: updatedOptions };
        }
        return q;
      })
    }));
    return { sections: newSections, hasUnsavedChanges: true };
  }),

  setSaveStatus: (isSaving, success) => set((state) => ({
    isSaving,
    lastSavedAt: success ? new Date() : state.lastSavedAt,
    hasUnsavedChanges: success ? false : state.hasUnsavedChanges
  }))
}));

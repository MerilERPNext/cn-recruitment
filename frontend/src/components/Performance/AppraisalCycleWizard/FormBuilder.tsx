import { lazy, Suspense, useState } from "react";
import { mockWizardData } from "./AppraisalCycleWizard";
import WizardShell from "./WizardShell";

const TemplateSelector = lazy(() => import("./components/FormBuilder/TemplateSelector"));
const TemplatePreview = lazy(() => import("./components/FormBuilder/TemplatePreview"));
const MultiRolePreview = lazy(() => import("./components/FormBuilder/MultiRolePreview"));

const formBuilderData = {
  ...mockWizardData,
  activeStepId: "form-builder",
  header: {
    title: "Form Builder",
    description: "Pick a starting template or open the drag-drop builder for full editing.",
  },
  validationStatus: "Validation passed",
  nextStepLabel: "Goal Pull-in",
};

const sectionFallback = (
  <div className="min-h-[180px] rounded-lg border border-gray-200 bg-white p-4 shadow-sm" />
);

export type FormTemplate = {
  id: string;
  title: string;
  sectionsCount: number;
  questionsCount: number;
  isDraft?: boolean;
  mostUsed?: boolean;
  iconColor?: string;
};

export type FormSection = {
  id: string;
  title: string;
  fields: string;
  questionsCount: number;
  weight: number;
  active: boolean;
};

const mockTemplates: FormTemplate[] = [
  {
    id: "standard-annual",
    title: "Standard Annual Form",
    sectionsCount: 7,
    questionsCount: 32,
    mostUsed: true,
    iconColor: "text-blue-500 bg-blue-50",
  },
  {
    id: "probation-90",
    title: "Probation 90-day Form",
    sectionsCount: 4,
    questionsCount: 14,
    iconColor: "text-purple-500 bg-purple-50",
  },
  {
    id: "tech-ic",
    title: "Tech IC Track Form",
    sectionsCount: 6,
    questionsCount: 24,
    iconColor: "text-blue-400 bg-blue-50",
  },
  {
    id: "people-manager",
    title: "People Manager Form",
    sectionsCount: 8,
    questionsCount: 38,
    iconColor: "text-teal-500 bg-teal-50",
  },
  {
    id: "project-closure",
    title: "Project Closure Form",
    sectionsCount: 5,
    questionsCount: 18,
    iconColor: "text-orange-500 bg-orange-50",
  },
];

const mockSections: FormSection[] = [
  { id: "sec-1", title: "Goals & KPIs", fields: "rating, comment, numeric, voice", questionsCount: 5, weight: 60, active: true },
  { id: "sec-2", title: "Competencies", fields: "rating, comment", questionsCount: 8, weight: 30, active: true },
  { id: "sec-3", title: "Achievements", fields: "multi-line", questionsCount: 3, weight: 0, active: true },
  { id: "sec-4", title: "Development Plan", fields: "multi-line, file", questionsCount: 4, weight: 0, active: true },
  { id: "sec-5", title: "Career Aspirations", fields: "multi-line", questionsCount: 2, weight: 0, active: true },
  { id: "sec-6", title: "Manager Recommendation", fields: "dropdown, slider, comment", questionsCount: 5, weight: 5, active: true },
];

const FormBuilder = () => {
  const [activeTemplateId, setActiveTemplateId] = useState<string>("standard-annual");
  const [sections, setSections] = useState<FormSection[]>(mockSections);
  const [activePreviewRole, setActivePreviewRole] = useState<string>("Employee");

  const activeTemplate = mockTemplates.find(t => t.id === activeTemplateId) || mockTemplates[0];

  return (
    <WizardShell
      data={formBuilderData}
      contentClassName="flex flex-col gap-4 sm:gap-5"
    >
      <Suspense fallback={sectionFallback}>
        <TemplateSelector 
          templates={mockTemplates} 
          activeTemplateId={activeTemplateId}
          onSelectTemplate={setActiveTemplateId}
        />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Suspense fallback={sectionFallback}>
          <TemplatePreview 
            template={activeTemplate}
            sections={sections}
            setSections={setSections}
          />
        </Suspense>

        <aside className="min-w-0">
          <Suspense fallback={sectionFallback}>
            <MultiRolePreview 
              activeRole={activePreviewRole}
              onRoleChange={setActivePreviewRole}
            />
          </Suspense>
        </aside>
      </div>
    </WizardShell>
  );
};

export default FormBuilder;

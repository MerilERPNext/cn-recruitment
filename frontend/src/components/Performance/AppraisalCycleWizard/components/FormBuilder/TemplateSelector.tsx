import { Check, FileText, Plus } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";
import { FormTemplate } from "../../FormBuilder";

type TemplateSelectorProps = {
  templates: FormTemplate[];
  activeTemplateId: string;
  onSelectTemplate: (id: string) => void;
};

const TemplateSelector = ({
  templates,
  activeTemplateId,
  onSelectTemplate,
}: TemplateSelectorProps) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <Typography
            variant="h3"
            className="text-base font-bold text-gray-900"
          >
            Choose a form template
          </Typography>
          <Typography variant="bodySmall" className="text-gray-500 mt-0.5">
            6 published · 2 drafts
          </Typography>
        </div>
        <button className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-md bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 sm:w-auto">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const isActive = template.id === activeTemplateId;
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={`relative flex min-h-[140px] flex-col rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500 shadow-sm"
                  : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${template.iconColor || "bg-gray-100 text-gray-500"} ${isActive ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                {template.mostUsed && (
                  <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold text-yellow-800">
                    Most used
                  </span>
                )}
              </div>

              <Typography
                variant="bodyMedium"
                className="font-bold text-gray-900 leading-tight"
              >
                {template.title}
              </Typography>
              <Typography
                variant="caption"
                className="mt-1 block text-gray-500"
              >
                {template.sectionsCount} sections · {template.questionsCount}{" "}
                questions
              </Typography>

              {isActive && (
                <div className="mt-auto pt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  <Check className="h-4 w-4" />
                  Selected — used in this cycle
                </div>
              )}
            </button>
          );
        })}

        <button className="relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center transition hover:border-gray-400 hover:bg-gray-100">
          <Plus className="mb-2 h-6 w-6 text-gray-400" />
          <Typography variant="bodyMedium" className="font-bold text-gray-700">
            Start from blank
          </Typography>
        </button>
      </div>
    </section>
  );
};

export default TemplateSelector;

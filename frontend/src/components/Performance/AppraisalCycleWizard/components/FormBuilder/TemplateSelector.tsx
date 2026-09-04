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
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <Typography
            variant="h3"
            className="text-base font-bold text-text-title"
          >
            Choose a form template
          </Typography>
          <Typography variant="bodySmall" color="body2" className="mt-0.5">
            6 published · 2 drafts
          </Typography>
        </div>
        <button className="flex min-h-[36px] items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 sm:w-auto cursor-pointer">
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
              className={`relative flex min-h-[140px] flex-col rounded-xl border p-4 text-left transition-all cursor-pointer ${
                isActive
                  ? "border-primary bg-primary/10 ring-1 ring-primary shadow-sm"
                  : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${template.iconColor ? "bg-primary/20 text-primary" : "bg-slate-500/20 text-text-body2"} ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                >
                  <FileText className="h-5 w-5" />
                </div>
                {template.mostUsed && (
                  <span className="rounded-md bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-500">
                    Most used
                  </span>
                )}
              </div>

              <Typography
                variant="bodyMedium"
                className="font-bold text-text-title leading-tight"
              >
                {template.title}
              </Typography>
              <Typography
                variant="caption"
                color="body2"
                className="mt-1 block"
              >
                {template.sectionsCount} sections · {template.questionsCount}{" "}
                questions
              </Typography>

              {isActive && (
                <div className="mt-auto pt-3 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Check className="h-4 w-4" />
                  Selected — used in this cycle
                </div>
              )}
            </button>
          );
        })}

        <button className="relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-slate-500/10 p-4 text-center transition hover:border-primary/50 hover:bg-slate-500/20 cursor-pointer">
          <Plus className="mb-2 h-6 w-6 text-text-body2" />
          <Typography variant="bodyMedium" className="font-bold text-text-title">
            Start from blank
          </Typography>
        </button>
      </div>
    </section>
  );
};

export default TemplateSelector;

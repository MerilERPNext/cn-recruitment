import { Check, GripVertical } from "lucide-react";
import { Typography } from "../../../../shared/atoms/Typography";

type StagesLibraryAsideProps = {
  availableStages: string[];
  templates: string[];
  selectedTemplate: string;
  onTemplateSelect: (template: string) => void;
};

const StagesLibraryAside = ({
  availableStages,
  templates,
  selectedTemplate,
  onTemplateSelect,
}: StagesLibraryAsideProps) => {
  return (
    <aside className="min-w-0 space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <Typography
          variant="caption"
          className="mb-3 block font-bold uppercase tracking-wider text-gray-500"
        >
          Available Stages
        </Typography>
        <div className="space-y-2">
          {availableStages.map((stage) => (
            <button
              key={stage}
              className="flex min-h-[42px] w-full min-w-0 items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-3 text-left text-sm font-semibold text-gray-600 hover:border-blue-200 hover:bg-blue-50"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="min-w-0 truncate">{stage}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <Typography variant="h3" className="text-sm font-bold text-blue-700">
          Stage SLA tips
        </Typography>
        <Typography
          variant="bodyMedium"
          className="mt-2 text-sm font-normal leading-relaxed text-gray-600"
        >
          Industry median for an annual cycle is 56 days. Stages with SLA &lt;
          5d trigger more reminder noise.
        </Typography>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <Typography
          variant="caption"
          className="mb-3 block font-bold uppercase tracking-wider text-gray-500"
        >
          Stage Templates
        </Typography>
        <div className="space-y-1">
          {templates.map((template) => {
            const selected = template === selectedTemplate;

            return (
              <button
                key={template}
                onClick={() => onTemplateSelect(template)}
                className={`flex min-h-[38px] w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold ${
                  selected
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {selected ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <span className="w-4" />
                )}
                <span className="min-w-0 truncate">{template}</span>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
};

export default StagesLibraryAside;

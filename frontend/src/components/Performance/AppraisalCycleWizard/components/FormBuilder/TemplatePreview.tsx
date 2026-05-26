import { ChevronRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Typography } from "../../../../shared/atoms/Typography";
import { FormSection, FormTemplate } from "../../FormBuilder";

type TemplatePreviewProps = {
  template: FormTemplate;
  sections: FormSection[];
  setSections: Dispatch<SetStateAction<FormSection[]>>;
};

const TemplatePreview = ({ template, sections }: TemplatePreviewProps) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <Typography
            variant="h3"
            className="text-base font-bold text-gray-900"
          >
            {template.title} - v3
          </Typography>
          <Typography variant="bodySmall" className="text-gray-500 mt-0.5">
            Last edited by Anjali · 3 days ago
          </Typography>
        </div>
        <button className="flex min-h-[36px] items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 sm:w-auto">
          Open Drag-Drop Builder →
        </button>
      </div>

      <div className="flex flex-col space-y-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="flex w-6 flex-col items-center justify-center gap-[3px] text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
                <div className="flex gap-[3px]">
                  <div className="h-1 w-1 rounded-full bg-current"></div>
                  <div className="h-1 w-1 rounded-full bg-current"></div>
                </div>
                <div className="flex gap-[3px]">
                  <div className="h-1 w-1 rounded-full bg-current"></div>
                  <div className="h-1 w-1 rounded-full bg-current"></div>
                </div>
                <div className="flex gap-[3px]">
                  <div className="h-1 w-1 rounded-full bg-current"></div>
                  <div className="h-1 w-1 rounded-full bg-current"></div>
                </div>
              </div>

              <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                <Typography
                  variant="bodyMedium"
                  className="font-bold text-gray-900 leading-tight truncate"
                >
                  {section.title}
                </Typography>
                <Typography
                  variant="caption"
                  className="text-gray-500 truncate block mt-0.5"
                >
                  {section.fields}
                </Typography>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pl-9 sm:pl-0">
              <div className="flex items-center text-sm text-gray-600 sm:w-24">
                {section.questionsCount} questions
              </div>

              <div className="flex items-center font-bold text-gray-900 text-sm sm:w-24">
                {section.weight}% weight
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {section.active ? (
                  <div className="flex h-6 w-[72px] items-center rounded-full bg-green-50 pl-3 text-[11px] font-bold text-green-700">
                    Active
                  </div>
                ) : (
                  <div className="flex h-6 w-[72px] items-center rounded-full bg-gray-100 pl-3 text-[11px] font-bold text-gray-600">
                    Inactive
                  </div>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400 hidden sm:block" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TemplatePreview;

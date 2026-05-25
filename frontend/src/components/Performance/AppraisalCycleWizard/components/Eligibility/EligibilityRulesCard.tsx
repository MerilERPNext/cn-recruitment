import { Plus, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Select } from "../../../../shared/atoms/Select";
import { Typography } from "../../../../shared/atoms/Typography";

export type EligibilityRule = {
  id: number;
  joiner: string;
  field: string;
  operator: string;
  value: string;
};

type SelectOption = {
  label: string;
  value: string;
};

type EligibilityRulesCardProps = {
  activeMode: "rules" | "csv";
  fieldOptions: SelectOption[];
  inputClass: string;
  operatorOptions: SelectOption[];
  rules: EligibilityRule[];
  selectClass: string;
  setActiveMode: (mode: "rules" | "csv") => void;
  setRules: Dispatch<SetStateAction<EligibilityRule[]>>;
};

const EligibilityRulesCard = ({
  activeMode,
  fieldOptions,
  inputClass,
  operatorOptions,
  rules,
  selectClass,
  setActiveMode,
  setRules,
}: EligibilityRulesCardProps) => {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-50 p-1 sm:inline-flex">
        <button
          onClick={() => setActiveMode("rules")}
          className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-bold sm:px-4 ${activeMode === "rules" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
        >
          Dynamic rules
        </button>
        <button
          onClick={() => setActiveMode("csv")}
          className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-bold sm:px-4 ${activeMode === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
        >
          Static CSV upload
        </button>
      </div>

      <Typography
        variant="caption"
        className="mb-3 block font-bold uppercase tracking-wider text-gray-500"
      >
        Include employees where
      </Typography>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[70px_minmax(0,1fr)_110px_minmax(0,1.15fr)_32px] xl:border-0 xl:bg-transparent xl:p-0"
          >
            <div className="flex min-h-[38px] items-center sm:row-span-3 xl:row-span-1">
              <span
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${rule.joiner === "WHERE"
                    ? "bg-white text-gray-500 xl:bg-white"
                    : "bg-blue-50 text-blue-600"
                  }`}
              >
                {rule.joiner}
              </span>
            </div>
            <Select
              options={fieldOptions}
              value={fieldOptions.find((option) => option.value === rule.field) ?? fieldOptions[0]}
              onChange={(option) =>
                setRules((current) =>
                  current.map((item) =>
                    item.id === rule.id ? { ...item, field: option.value } : item,
                  ),
                )
              }
              className={selectClass}
            />
            <Select
              options={operatorOptions}
              value={
                operatorOptions.find((option) => option.value === rule.operator) ??
                operatorOptions[0]
              }
              onChange={(option) =>
                setRules((current) =>
                  current.map((item) =>
                    item.id === rule.id ? { ...item, operator: option.value } : item,
                  ),
                )
              }
              className={selectClass}
            />
            <input
              className={`${inputClass} bg-white`}
              value={rule.value}
              onChange={(event) =>
                setRules((current) =>
                  current.map((item) =>
                    item.id === rule.id ? { ...item, value: event.target.value } : item,
                  ),
                )
              }
            />
            <button className="flex h-[38px] w-full items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700 sm:col-start-2 xl:col-start-auto xl:w-8 xl:border-0 xl:bg-transparent">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button className="mt-4 inline-flex min-h-[38px] items-center gap-2 rounded-md border border-blue-100 bg-white px-3 text-sm font-bold text-blue-600 hover:bg-blue-50">
        <Plus className="h-4 w-4" />
        Add condition
      </button>
    </section>
  );
};

export default EligibilityRulesCard;

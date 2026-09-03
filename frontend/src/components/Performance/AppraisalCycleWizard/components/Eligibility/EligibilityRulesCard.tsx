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
    <section className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-5">
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-500/10 p-1 sm:inline-flex">
        <button
          onClick={() => setActiveMode("rules")}
          className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-bold sm:px-4 cursor-pointer ${
            activeMode === "rules"
              ? "bg-card text-text-title shadow-sm"
              : "text-text-body2"
          }`}
        >
          Dynamic rules
        </button>
        <button
          onClick={() => setActiveMode("csv")}
          className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-bold sm:px-4 cursor-pointer ${
            activeMode === "csv"
              ? "bg-card text-text-title shadow-sm"
              : "text-text-body2"
          }`}
        >
          Static CSV upload
        </button>
      </div>

      <Typography
        variant="caption"
        color="body2"
        className="mb-3 block font-bold uppercase tracking-wider"
      >
        Include employees where
      </Typography>

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-slate-500/10 p-3 sm:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[70px_minmax(0,1fr)_110px_minmax(0,1.15fr)_32px] xl:border-0 xl:bg-transparent xl:p-0"
          >
            <div className="flex min-h-[38px] items-center sm:row-span-3 xl:row-span-1">
              <span
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  rule.joiner === "WHERE"
                    ? "bg-card text-text-body2 xl:bg-card"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {rule.joiner}
              </span>
            </div>
            <Select
              options={fieldOptions}
              value={
                fieldOptions.find((option) => option.value === rule.field) ??
                fieldOptions[0]
              }
              onChange={(option) =>
                setRules((current) =>
                  current.map((item) =>
                    item.id === rule.id
                      ? { ...item, field: option.value }
                      : item,
                  ),
                )
              }
              className={selectClass}
            />
            <Select
              options={operatorOptions}
              value={
                operatorOptions.find(
                  (option) => option.value === rule.operator,
                ) ?? operatorOptions[0]
              }
              onChange={(option) =>
                setRules((current) =>
                  current.map((item) =>
                    item.id === rule.id
                      ? { ...item, operator: option.value }
                      : item,
                  ),
                )
              }
              className={selectClass}
            />
            <div className="flex min-h-[38px] items-center rounded-lg border border-border bg-card px-3 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <input
                value={rule.value}
                onChange={(event) =>
                  setRules((current) =>
                    current.map((item) =>
                      item.id === rule.id
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
                className={inputClass}
              />
            </div>
            <button
              onClick={() =>
                setRules((current) =>
                  current.filter((item) => item.id !== rule.id),
                )
              }
              className="flex min-h-[38px] items-center justify-center rounded-lg text-text-body2 hover:bg-slate-500/10 hover:text-text-title cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          setRules((current) => [
            ...current,
            {
              id: Date.now(),
              joiner: "AND",
              field: "Department",
              operator: "is",
              value: "Engineering",
            },
          ])
        }
        className="mt-4 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Add rule clause
      </button>
    </section>
  );
};

export default EligibilityRulesCard;

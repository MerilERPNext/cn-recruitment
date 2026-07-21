"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form } from "@tsed/react-formio";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useGetExpensePolicyQuestions } from "../../../hooks/useExpense";
import type { ExpensePolicyCategory } from "../../../types/expense";

type DrawerSize = "sm" | "md" | "lg" | "xl" | "xxl" | "full";

interface ExpensePolicyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  size?: DrawerSize;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: "w-screen sm:w-64",
  md: "w-screen sm:w-80",
  lg: "w-screen sm:w-96",
  xl: "w-screen sm:w-[32rem]",
  xxl: "w-screen sm:w-[42rem]",
  full: "w-screen",
};

const ALL_POLICIES_VALUE = "__all__";

const ExpensePolicyDrawer: React.FC<ExpensePolicyDrawerProps> = ({
  isOpen,
  onClose,
  size = "xxl",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const isAllPolicies = !selectedCategory;
  const isSingleCategory = !!selectedCategory;

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const { data, isLoading } = useGetExpensePolicyQuestions(selectedCategory);
  const policyData: ExpensePolicyCategory[] = data?.data ?? [];

  useEffect(() => {
    if (!data) return;
    if (!selectedCategory && data.options?.length) {
      setCategoryOptions(data.options);
    }
  }, [data, selectedCategory]);

  const expensePolicyFormSchema = useMemo(
    () => ({
      display: "form",
      components: [
        {
          type: "columns",
          columns: [
            {
              width: 6,
              components: [
                {
                  type: "select",
                  label: "Expense Category",
                  key: "expenseCategory",
                  defaultValue: ALL_POLICIES_VALUE,
                  dataSrc: "values",
                  data: {
                    values: [
                      {
                        label: "All Policies",
                        value: ALL_POLICIES_VALUE,
                      },
                      ...categoryOptions.map((opt) => ({
                        label: opt,
                        value: opt,
                      })),
                    ],
                  },
                  clearOnHide: false,
                },
              ],
            },
          ],
        },
      ],
    }),
    [categoryOptions],
  );

  const handleFormChange = (submission: any) => {
    const value = submission?.data?.expenseCategory;

    if (!value) return;

    if (value === ALL_POLICIES_VALUE) {
      setSelectedCategory(undefined);
      setExpandedCategories(new Set());
      return;
    }

    setSelectedCategory(value);
  };

  const toggleCategory = (categoryName: string) => {
    if (!isAllPolicies) return;

    setExpandedCategories((prev) => {
      const next = new Set(prev);

      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }

      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div
        className={`
          fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto
          bg-white z-50 flex flex-col shadow-xl
          ${sizeClasses[size]}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="base-title md:text-lg font-semibold">
            Expense Policy
          </h2>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Form form={expensePolicyFormSchema} onChange={handleFormChange} />

          <div className="border rounded-xl divide-y overflow-hidden">
            {isLoading && (
              <p className="p-4 text-sm text-gray-500">Loading policy…</p>
            )}

            {!isLoading && policyData.length === 0 && (
              <p className="p-6 text-sm text-gray-500 text-center">
                {data?.message || "No policy questions available."}
              </p>
            )}

            {!isLoading &&
              policyData.map((category) => {
                const isOpen =
                  isSingleCategory ||
                  expandedCategories.has(category.category_name);

                return (
                  <div key={category.category_name}>
                    <button
                      onClick={() => toggleCategory(category.category_name)}
                      className={`w-full flex items-center justify-between p-4 text-left ${
                        isAllPolicies ? "hover:bg-gray-50" : "cursor-default"
                      }`}
                    >
                      <span className="font-medium text-sm">
                        {category.category_display_name}
                      </span>

                      {isAllPolicies &&
                        (isOpen ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        ))}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 text-sm text-gray-700">
                        {category.questions.map((q, idx) => (
                          <div key={idx}>
                            <p className="font-medium">{q.question_name}</p>
                            <p>{q.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
};

export default ExpensePolicyDrawer;

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Filter, Plus, X } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import {
  FilterableField,
  TicketFilters as TicketFiltersType,
} from "../../hooks/useHelpDeskTickets";
import { useFloatingPosition } from "../../hooks/useFloatingPosition";
import { createPortal } from "react-dom";
import FrappeAPI from "../../utils/frappeAPI";

interface FilterItem {
  id: string;
  field: string;
  operator: string;
  value: string;
}

type SelectOption = {
  label: string;
  value: string;
};

interface TicketFiltersProps {
  fields: FilterableField[];
  filters: TicketFiltersType;
  onApply: (filters: TicketFiltersType) => void;
  isLoading?: boolean;
}

const getOperatorsForFieldType = (fieldType: string) => {
  switch (fieldType) {
    case "Data":
    case "Small Text":
    case "Text":
      return [
        { value: "like", label: "Contains" },
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not Equals" },
      ];
    case "Select":
      return [
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not Equals" },
        { value: "in", label: "In" },
        { value: "not in", label: "Not In" },
      ];
    case "Link":
      return [
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not Equals" },
        { value: "like", label: "Contains" },
      ];
    case "Date":
    case "Datetime":
      return [
        { value: "=", label: "Equals" },
        { value: ">", label: "After" },
        { value: "<", label: "Before" },
        { value: ">=", label: "On or After" },
        { value: "<=", label: "On or Before" },
      ];
    case "Int":
    case "Float":
    case "Currency":
      return [
        { value: "=", label: "Equals" },
        { value: "!=", label: "Not Equals" },
        { value: ">", label: "Greater Than" },
        { value: "<", label: "Less Than" },
      ];
    case "Check":
      return [{ value: "=", label: "Equals" }];
    default:
      return [
        { value: "=", label: "Equals" },
        { value: "like", label: "Contains" },
      ];
  }
};

const getSelectOptions = async (
  field: FilterableField
): Promise<SelectOption[]> => {
  // Select

  if (field.fieldname === "status") {
    return [
      { label: "Open", value: "Open" },
      { label: "Closed", value: "Closed" },
      { label: "Awaiting User Response ", value: "Replied" },
      { label: "Reopened", value: "Reopened" },
      { label: "Not Assigned", value: "Not Assigned" },
      { label: "Archived", value: "Archived" },
      { label: "Requested Closure", value: "Requested Closure" },
    ];
  }
  if (field.fieldtype === "Select" && field.options) {
    return field.options
      .split("\n")
      .filter(Boolean)
      .map((opt) => ({
        label: opt,
        value: opt,
      }));
  }

  // Check
  if (field.fieldtype === "Check") {
    return [
      { label: "Yes", value: "Yes" },
      { label: "No", value: "No" },
    ];
  }

  // Link
  if (field.fieldtype === "Link" && field.options) {
    try {
      const result = (await FrappeAPI.callMethod(
        "cn_hrms_core.cn_hrms_core.apis.fetch_data.get_searched_doc_list",
        {
          fields: ["name", field.display_field || "name"],
          doctype: field.options,
        }
      )) as Record<string, string>[];

      return result.map((item) => {
        const displayValue = field.display_field
          ? item[field.display_field]
          : item.name;

        return {
          label: displayValue,
          value: item.name,
        };
      });
    } catch (error) {
      console.error("Error fetching link options:", error);
      return [];
    }
  }

  return [];
};

/** Multi-select dropdown with checkboxes for in/not in operators */
const MultiCheckboxSelect: React.FC<{
  options: SelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}> = ({ options, selectedValues, onChange }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useFloatingPosition(buttonRef, dropdownRef, open, {
    placement: "bottom",
    align: "start",
    offset: 4,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath();
      const clickedButton = buttonRef.current && path.includes(buttonRef.current);
      const clickedDropdown = dropdownRef.current && path.includes(dropdownRef.current);

      if (!clickedButton && !clickedDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const label =
    selectedValues.length === 0
      ? "Select..."
      : selectedValues.length <= 2
        ? selectedValues.join(", ")
        : `${selectedValues.length} selected`;

  return (
    <div className="w-full md:flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white text-left"
      >
        <span className="truncate text-gray-700">{label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="multi-checkbox-portal z-[1000] w-full min-w-[200px] max-w-[300px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

const TicketFiltersComponent: React.FC<TicketFiltersProps> = ({
  fields,
  filters,
  onApply,
}) => {
  const [optionsMap, setOptionsMap] = useState<
    Record<string, SelectOption[]>
  >({});
  const [isOpen, setIsOpen] = useState(false);
  const [filterItems, setFilterItems] = useState<FilterItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch options
  useEffect(() => {
    const fetchOptions = async () => {
      const newOptionsMap: Record<string, SelectOption[]> = {};

      for (const item of filterItems) {
        const field = fields.find((f) => f.fieldname === item.field);
        if (field) {
          const options = await getSelectOptions(field);
          newOptionsMap[item.id] = options;
        }
      }

      setOptionsMap(newOptionsMap);
    };

    fetchOptions();
  }, [filterItems, fields]);

  // Initialize filters
  useEffect(() => {
    const items: FilterItem[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        const filterVal = value[1];
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          field: key,
          operator: value[0] as string,
          value: Array.isArray(filterVal) ? filterVal.join(", ") : (filterVal as string),
        });
      } else if (value !== undefined) {
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          field: key,
          operator: "=",
          value: value as string,
        });
      }
    });

    setFilterItems(items);
  }, []);

  // Close on outside click
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const path = event.composedPath();

      const clickedDropdown = dropdownRef.current && path.includes(dropdownRef.current);
      const clickedTooltip = tooltipRef.current && path.includes(tooltipRef.current);
      const clickedMultiSelect = path.some(
        (node) => (node as Element).classList?.contains('multi-checkbox-portal')
      );

      if (!clickedDropdown && !clickedTooltip && !clickedMultiSelect) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addFilter = () => {
    const defaultField = fields[0]?.fieldname || "";
    setFilterItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        field: defaultField,
        operator: "=",
        value: "",
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilterItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterItem>) => {
    setFilterItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const applyFilters = () => {
    const newFilters: TicketFiltersType = {};

    filterItems.forEach((item) => {
      if (item.field && item.value) {
        let filterValue: unknown = item.value;

        if (item.operator === "like") {
          filterValue = `%${item.value}%`;
        } else if (item.operator === "in" || item.operator === "not in") {
          filterValue = item.value.split(",").map((v) => v.trim()).filter(Boolean);
        }

        const field = fields.find((f) => f.fieldname === item.field);

        if (field?.fieldtype === "Check") {
          filterValue = item.value === "Yes" ? 1 : 0;
        }

        newFilters[item.field] = [item.operator, filterValue];
      }
    });

    onApply(newFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setFilterItems([]);
    onApply({});
    setIsOpen(false);
  };

  const activeFilterCount = Object.keys(filters).length;
  const buttonRef = useRef<HTMLButtonElement>(null);

  useFloatingPosition(buttonRef, tooltipRef, isOpen, {
    placement: "bottom",
    align: "end",
    offset: 10,
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filter</span>

        {activeFilterCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded-lg">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className="z-[999] mt-2 w-[calc(100vw-2rem)] md:w-[500px] bg-white rounded-xl border border-gray-200 shadow-lg"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <Typography
                  variant="body"
                  color="primary"
                  className="font-medium"
                >
                  Filters
                </Typography>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filterItems.map((item) => {
                  const field = fields.find(
                    (f) => f.fieldname === item.field
                  );
                  const operators = getOperatorsForFieldType(
                    field?.fieldtype || "Data"
                  );
                  const selectOptions = optionsMap[item.id] || [];

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col md:flex-row md:items-center gap-2"
                    >
                      {/* Field */}
                      <select
                        value={item.field}
                        onChange={(e) =>
                          updateFilter(item.id, {
                            field: e.target.value,
                            value: "",
                          })
                        }
                        className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      >
                        {fields.map((f) => (
                          <option key={f.fieldname} value={f.fieldname}>
                            {f.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator */}
                      <select
                        value={item.operator}
                        onChange={(e) =>
                          updateFilter(item.id, {
                            operator: e.target.value,
                          })
                        }
                        className="w-full md:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      >
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      {/* Value */}
                      {selectOptions.length > 0 ? (
                        (item.operator === "in" || item.operator === "not in") ? (
                          <MultiCheckboxSelect
                            options={selectOptions}
                            selectedValues={item.value ? item.value.split(",").map((v) => v.trim()).filter(Boolean) : []}
                            onChange={(selected) =>
                              updateFilter(item.id, {
                                value: selected.join(", "),
                              })
                            }
                          />
                        ) : (
                          <select
                            value={item.value}
                            onChange={(e) =>
                              updateFilter(item.id, {
                                value: e.target.value,
                              })
                            }
                            className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                          >
                            <option value="">Select...</option>
                            {selectOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )
                      ) : field?.fieldtype === "Date" ||
                        field?.fieldtype === "Datetime" ? (
                        <input
                          type="date"
                          value={item.value}
                          onChange={(e) =>
                            updateFilter(item.id, {
                              value: e.target.value,
                            })
                          }
                          className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                      ) : (
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) =>
                            updateFilter(item.id, {
                              value: e.target.value,
                            })
                          }
                          placeholder="Value"
                          className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => removeFilter(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 md:self-auto self-end"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Filter */}
              <button
                onClick={addFilter}
                className="flex items-center gap-2 mt-3 text-sm text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add Filter
              </button>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>

                <Button
                  variant="contain"
                  bgColor="primary"
                  size="sm"
                  onClick={applyFilters}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TicketFiltersComponent;
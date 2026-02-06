import React, { useState, useRef, useEffect } from "react";
import { Filter, Plus, X } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import { FilterableField, TicketFilters as TicketFiltersType } from "../../hooks/useHelpDeskTickets";

interface FilterItem {
  id: string;
  field: string;
  operator: string;
  value: string;
}

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
      return [
        { value: "=", label: "Equals" },
      ];
    default:
      return [
        { value: "=", label: "Equals" },
        { value: "like", label: "Contains" },
      ];
  }
};

const getSelectOptions = (field: FilterableField) => {
  if (field.fieldtype === "Select" && field.options) {
    return field.options.split("\n").filter(Boolean);
  }
  if (field.fieldtype === "Check") {
    return ["Yes", "No"];
  }
  return [];
};

const TicketFiltersComponent: React.FC<TicketFiltersProps> = ({
  fields,
  filters,
  onApply,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterItems, setFilterItems] = useState<FilterItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize filter items from existing filters
  useEffect(() => {
    const items: FilterItem[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        items.push({
          id: Math.random().toString(36).substr(2, 9),
          field: key,
          operator: value[0] as string,
          value: value[1] as string,
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addFilter = () => {
    const defaultField = fields[0]?.fieldname || "";
    setFilterItems([
      ...filterItems,
      {
        id: Math.random().toString(36).substr(2, 9),
        field: defaultField,
        operator: "=",
        value: "",
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilterItems(filterItems.filter((item) => item.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterItem>) => {
    setFilterItems(
      filterItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const applyFilters = () => {
    const newFilters: TicketFiltersType = {};
    filterItems.forEach((item) => {
      if (item.field && item.value) {
        let filterValue: unknown = item.value;

        // Handle special operators
        if (item.operator === "like") {
          filterValue = `%${item.value}%`;
        }

        // Handle check field
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
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

      {/* Filter Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] md:w-[500px] bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="body" color="primary" className="font-medium">
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
                const field = fields.find((f) => f.fieldname === item.field);
                const operators = getOperatorsForFieldType(field?.fieldtype || "Data");
                const selectOptions = field ? getSelectOptions(field) : [];

                return (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-2">
                    {/* Field Select */}
                    <select
                      value={item.field}
                      onChange={(e) => updateFilter(item.id, { field: e.target.value, value: "" })}
                      className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    >
                      {fields.map((f) => (
                        <option key={f.fieldname} value={f.fieldname}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator Select */}
                    <select
                      value={item.operator}
                      onChange={(e) => updateFilter(item.id, { operator: e.target.value })}
                      className="w-full md:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value Input */}
                    {selectOptions.length > 0 ? (
                      <select
                        value={item.value}
                        onChange={(e) => updateFilter(item.id, { value: e.target.value })}
                        className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      >
                        <option value="">Select...</option>
                        {selectOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field?.fieldtype === "Date" || field?.fieldtype === "Datetime" ? (
                      <input
                        type="date"
                        value={item.value}
                        onChange={(e) => updateFilter(item.id, { value: e.target.value })}
                        className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    ) : (
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => updateFilter(item.id, { value: e.target.value })}
                        placeholder="Value"
                        className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                      />
                    )}

                    {/* Remove Button */}
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

            {/* Add Filter Button */}
            <button
              onClick={addFilter}
              className="flex items-center gap-2 mt-3 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Add Filter
            </button>

            {/* Action Buttons */}
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
        </div>
      )}
    </div>
  );
};

export default TicketFiltersComponent;

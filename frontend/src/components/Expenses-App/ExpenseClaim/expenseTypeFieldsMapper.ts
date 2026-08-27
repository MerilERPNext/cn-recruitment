/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { getCustomFormComponents } from "./customFormMapper";

type FieldConfig = {
  fieldname?: string;
  label?: string;
  fieldtype?: string;
  options?: string;
  required?: boolean;
};

type ExpenseTypeFieldsPayload = {
  fields?: FieldConfig[];
  [key: string]: any;
};

type MapperContext = {
  employeeName?: string;
  expenseType?: string;
  isAmountReadonly?: boolean;
  unitFieldLabel?: string;
  hasParticipants?: boolean;
  isUnitsReadonly?: boolean;
  isCostCenterReadonly?: boolean;
  autoCostCenterId?: string;
  autoCostCenterName?: string;
  filterProjectsByCostCenter?: boolean;
  selectedCostCenter?: string;
};

const buildLabel = (label?: string) => {
  if (!label) return "";
  return label;
};

const buildValidation = (label?: string, required?: boolean) => ({
  required: !!required,
  customMessage: `${label || "This field"} is required`,
});

const mapFieldToFormio = (field: FieldConfig, ctx: MapperContext) => {
  const required = !!field.required;
  const label = buildLabel(field.label);

  switch (field.fieldtype) {
    case "Date":
      return {
        type: "datetime",
        key: field.fieldname,
        label,
        input: true,
        enableDate: true,
        enableTime: false,
        format: "dd-MM-yyyy",
        placeholder: "dd-mm-yyyy",
        widget: { type: "calendar", displayInTimezone: "viewer" },
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        html: true,
        ...(field.fieldname === "expense_date"
          ? {
              widget: {
                type: "calendar",
                displayInTimezone: "viewer",
                locale: "en",
                maxDate: format(new Date(), "yyyy-MM-dd"),
              },
              datePicker: {
                maxDate: format(new Date(), "yyyy-MM-dd"),
              },
            }
          : {}),
      };

    case "Currency":
      return {
        type: "number",
        key: field.fieldname,
        label,
        input: true,
        delimiter: true,
        applyMaskOn: "change",
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        ...(field.fieldname === "amount" && ctx.isAmountReadonly
          ? { attributes: { readonly: true } }
          : {}),
        html: true,
      };

    case "Text":
      return {
        type: "textarea",
        key: field.fieldname,
        label,
        rows: 1,
        input: true,
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        html: true,
      };

    case "Attach":
      return {
        type: "file",
        key: field.fieldname,
        label,
        input: true,
        multiple: true,
        storage: "customfiles",
        filePattern: ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.xls",
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        html: true,
      };

    case "Link":
      if (field.fieldname === "currency" && field.options === "Currency") {
        const url = ctx.expenseType
          ? `/api/method/chatnext_expense_trips.expense_claim.get_allowed_currencies_for_expense_claim_type?expense_claim_type=${encodeURIComponent(
              ctx.expenseType,
            )}`
          : "/api/method/chatnext_expense_trips.expense_claim.get_allowed_currencies_for_expense_claim_type";

        return {
          type: "select",
          key: field.fieldname,
          label,
          input: true,
          dataSrc: "url",
          data: { url },
          selectValues: "message.currencies",
          valueProperty: "",
          template: "<span>{{ item }}</span>",
          searchEnabled: false,
          defaultValue: "INR",
          validate: buildValidation(field.label, required),
          validateOn: "blur",
          html: true,
        };
      }

      if (
        field.fieldname === "vehicle_type" ||
        field.options === "Daily Allowance Vehicle Category"
      ) {
        return {
          type: "select",
          key: field.fieldname,
          label,
          input: true,
          dataSrc: "url",
          data: {
            url: `/api/method/chatnext_expense_trips.expense_claim.get_applicable_vehicle_types?employee=${ctx.employeeName || ""}&claim_type=${ctx.expenseType || ""}`,
          },
          selectValues: "message",
          valueProperty: "name",
          template: "<span>{{ item.vehicle_category }}</span>",
          searchEnabled: false,
          clearOnRefresh: true,
          validate: buildValidation(field.label, required),
          validateOn: "blur",
          html: true,
        };
      }

      if (field.fieldname === "project" || field.fieldname === "cost_center") {
        const doctype = field.options || (field.fieldname === "project" ? "Project" : "Cost Center");
        const nameField = field.fieldname === "project" ? "project_name" : "cost_center_name";
        const isAutopopulated = field.fieldname === "cost_center" && ctx.isCostCenterReadonly && ctx.autoCostCenterId;
        const shouldFilterProjectByCostCenter =
          field.fieldname === "project" && !!ctx.filterProjectsByCostCenter;
        const isProjectWaitingForCostCenter =
          shouldFilterProjectByCostCenter && !ctx.selectedCostCenter;
        const baseResourceUrl = `/api/resource/${doctype}?fields=%5B%22name%22,%22${nameField}%22%5D&limit_page_length=100&limit=100&skip=0`;
        const projectCostCenterFilter = `&filters=%5B%5B%22cost_center%22,%22=%22,%22{{ data.cost_center }}%22%5D%5D`;

        return {
          type: "select",
          key: field.fieldname,
          label,
          input: true,
          dataSrc: isAutopopulated ? "json" : "url",
          data: isAutopopulated
            ? {
                json: [
                  {
                    name: ctx.autoCostCenterId,
                    cost_center_name: ctx.autoCostCenterName || ctx.autoCostCenterId,
                  },
                ],
            }
            : {
                url: `${baseResourceUrl}${shouldFilterProjectByCostCenter ? projectCostCenterFilter : ""}`,
              },
          template: `<span>{{ item.${nameField} || item.name || item }}</span>`,
          valueProperty: "name",
          selectValues: isAutopopulated ? "" : "data",
          validate: buildValidation(field.label, required),
          validateOn: "blur",
          html: true,
          ...(field.fieldname === "cost_center" && ctx.isCostCenterReadonly
            ? { disabled: true }
            : {}),
          ...(field.fieldname === "cost_center" && ctx.autoCostCenterId
            ? { defaultValue: ctx.autoCostCenterId }
            : {}),
          ...(isProjectWaitingForCostCenter
            ? { disabled: true }
            : {}),
          ...(shouldFilterProjectByCostCenter
            ? {
                refreshOn: "cost_center",
                redrawOn: "cost_center",
                clearOnRefresh: true,
                customRefresh: "return !!data.cost_center;",
              }
            : {}),
        };
      }

      if (field.fieldname === "custom_location") {
        const url = ctx.expenseType
          ? `/api/method/chatnext_expense_trips.expense_claim.get_cities_for_claim_type?expense_type=${encodeURIComponent(
              ctx.expenseType,
            )}`
          : "/api/method/chatnext_expense_trips.expense_claim.get_cities_for_claim_type";

        return {
          type: "select",
          key: field.fieldname,
          label,
          input: true,
          dataSrc: "url",
          data: {
            url,
          },
          selectValues: "message.data",
          valueProperty: "name",
          template: "<span>{{ item.city }}</span>",
          searchEnabled: true,
          validate: buildValidation(field.label, required),
          validateOn: "blur",
          html: true,
        };
      }

      return {
        type: "select",
        key: field.fieldname,
        label,
        input: true,
        dataSrc: "url",
        data: {
          url: `/api/method/chatnext_expense_trips.expense_claim.get_link_options?doctype=${field.options || ""}`,
        },
        selectValues: "message",
        valueProperty: "name",
        template: "<span>{{ item.name }}</span>",
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        html: true,
      };

    case "Data":
      if (
        field.fieldname === "odometer_from" ||
        field.fieldname === "odometer_to"
      ) {
        return {
          type: "number",
          key: field.fieldname,
          label,
          input: true,
          delimiter: false,
          validate: {
            ...buildValidation(field.label, required),
            min: 0,
          },
          validateOn: "blur",
          html: true,
        };
      }
      if (field.fieldname === "units" || field.fieldname === "no_of_units") {
        if (!required) return null;
        const resolvedUnitLabel =
          ctx.unitFieldLabel && ctx.unitFieldLabel.trim()
            ? ctx.unitFieldLabel
            : field.label || "Units";
        return {
          type: "number",
          key: field.fieldname,
          label: buildLabel(resolvedUnitLabel),
          input: true,
          validate: buildValidation(field.label, required),
          validateOn: "blur",
          html: true,
          ...(ctx.isUnitsReadonly ? { attributes: { readonly: true } } : {}),
        };
      }
      return {
        type: "textfield",
        key: field.fieldname,
        label,
        input: true,
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        html: true,
      };

    default:
      return {
        type: "textfield",
        key: field.fieldname,
        label,
        input: true,
        validate: buildValidation(field.label, required),
        validateOn: "blur",
        html: true,
      };
  }
};

export const buildExpenseTypeDynamicSchema = (
  response: any,
  ctx: MapperContext,
) => {
  const payload: ExpenseTypeFieldsPayload =
    response?.message && typeof response.message === "object"
      ? response.message
      : response || {};

  const mappedFields = (payload.fields || [])
    .map((field) => mapFieldToFormio(field, ctx))
    .filter(Boolean);

  const attachmentField = mappedFields.find(
    (comp: any) => comp?.type === "file" && comp?.key === "attach_receipt",
  );
  const nonAttachmentFields = mappedFields.filter(
    (comp: any) => !(comp?.type === "file" && comp?.key === "attach_receipt"),
  );

  const columnRows = [];
  for (let i = 0; i < nonAttachmentFields.length; i += 2) {
    columnRows.push({
      type: "columns",
      customClass: "mt-3",
      columns: [
        { components: [nonAttachmentFields[i]] },
        {
          components: nonAttachmentFields[i + 1]
            ? [nonAttachmentFields[i + 1]]
            : [],
        },
      ],
    });
  }

  if (attachmentField) {
    const fieldWithClass = attachmentField as any;
    columnRows.push({
      ...fieldWithClass,
      customClass: fieldWithClass.customClass
        ? `${fieldWithClass.customClass} mt-3`
        : "mt-3",
    });
    columnRows.push({
      type: "htmlelement",
      tag: "div",
      className: "mt-3",
      attrs: [{ attr: "id", value: "attachment-preview-portal-v2" }],
      content: "",
    });
  }

  if (payload.shared_expense_allowed) {
    columnRows.push({
      type: "columns",
      customClass: "mt-3",
      // Use Formio's dynamic conditional to hide the toggler without rebuilding the entire schema.
      // This is better for "minimal rendering" as it prevents form remounts.
      customConditional:
        "show = !(data.participants && data.participants.length > 0)",
      columns: [
        {
          components: [
            {
              type: "checkbox",
              key: "shareExpenseCheckbox",
              label: "Share Expense",
              input: true,
              customClass:
                "custom-halfday-toggle border rounded-lg shadow-sm p-4 bg-gray-50",
            },
          ],
        },
        {
          components: [],
        },
      ],
    });
  }

  const customComponents = getCustomFormComponents(payload.custom_form_data);
  if (customComponents.length > 0) {
    columnRows.push({
      type: "htmlelement",
      tag: "div",
      className: "mt-6 border-t pt-4 border-gray-200",
      content: "",
    });
    columnRows.push({
      type: "htmlelement",
      tag: "h3",
      className: "text-lg font-semibold mb-4",
      content: "Additional Details",
    });
    columnRows.push(...customComponents);
  }

  return {
    components: columnRows,
    metadata: {
      claim_type_based_on: payload.claim_type_based_on,
      is_amount_readonly: payload.is_amount_readonly,
      shared_expense_allowed: payload.shared_expense_allowed,
      shared_expense_limit: payload.shared_expense_limit,
      show_limits_on_units: payload.show_limits_on_units,
      max_allowed_per_unit_cost: payload.max_allowed_per_unit_cost,
    },
  };
};

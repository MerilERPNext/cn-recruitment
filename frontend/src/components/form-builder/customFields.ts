/* eslint-disable @typescript-eslint/no-explicit-any */
import { get_fields_for_doctype } from "./getField";
import { appendCustomSettings } from "./customSettings";

const formioFieldTypeMap = {
  Data: "textfield",
  "Small Text": "textarea",
  "Long Text": "textarea",
  "Text Editor": "textarea",
  Date: "datetime",
  Datetime: "datetime",
  Table: "datagrid",
  Time: "time",
  Text: "textfield",
  Textarea: "textarea",
  Select: "select",
  Link: "select",
  "Dynamic Link": "textfield",
  "Read Only": "textfield",
  Currency: "currency",
  Float: "number",
  Int: "number",
  Check: "checkbox",
  Password: "password",
  Email: "email",
  Phone: "tel",
  "Link to another DocType": "textfield",
  Autocomplete: "textfield",
  Percent: "number",
  Code: "code",
  Signature: "signature",
  Color: "color",
  Barcode: "barcode",
  Geolocation: "map",
} as const;

const extraTypeMap = {
  Duration: "durationCustomComp",
  Rating: "radio",
  Attach: "file",
  "Attach Image": "file",
  Phone: "phoneNumber",
  Color: "colorPickerCustomComp",
  Code: "codeCustomComp",
} as const;

const allFormIoFields = [
  ...Object.values(formioFieldTypeMap),
  ...Object.values(extraTypeMap),
];
appendCustomSettings(allFormIoFields);

function frappeFieldTypeToFormioFieldType(
  frappeType: string | number,
  child = false
) {
  const formioType =
    formioFieldTypeMap[frappeType as keyof typeof formioFieldTypeMap];
  if (child) return formioType || "textfield";
  return (
    extraTypeMap[frappeType as keyof typeof extraTypeMap] ||
    formioType ||
    "textfield"
  );
}

export const getSchema = async (field: any) => {
  const fieldType = field.fieldtype;
  const baseSchema = {
    title: field.label,
    key: field.fieldname,
    schema: {
      label: field.label,
      key: field.fieldname,
      type: frappeFieldTypeToFormioFieldType(fieldType, false),
      input: true,
      isUserField: true,
      selectedSyncField: field.fieldname,
      selectedSyncDoctype: field.doctype,
      isCustomUserField: true,
      targetDoctypeName: "{{doc.name}}",
      validate: {
        required: Boolean(field?.reqd),
      },
    },
  };

  switch (fieldType) {
    case "Data":
      return {
        ...baseSchema,
        icon: "file-text-o",
      };
    case "Currency":
      return {
        ...baseSchema,
        icon: "usd",
      };
    case "Percent":
      return {
        ...baseSchema,
        icon: "percent",
        schema: {
          ...baseSchema.schema,
          decimalLimit: 2,
          disabled: true,
          applyMaskOn: "change",
          mask: false,
          suffix: "%",
          tableView: false,
          delimiter: false,
          requireDecimal: false,
          inputFormat: "plain",
          truncateMultipleSpaces: false,
          validate: {
            ...baseSchema.schema.validate,
            min: 0,
            max: 100,
          },
        },
      };
    case "Duration":
      return {
        ...baseSchema,
        icon: "clock-o",
      };
    case "Link": {
      const possibleTitleFields = [
        "title",
        "label",
        "full_name",
        "fullname",
        "first_name",
      ];
      const formioLinkTemplate =
        `<span>{{ (__f_fill__item__ = (${possibleTitleFields
          .map((f) => `item.${f}`)
          .join(" || ")})` +
        ", (__f_fill__item__ === item.name || !__f_fill__item__) ? item.name : (__f_fill__item__ + ' - ' + item.name)) }}</span>";
      return {
        ...baseSchema,
        icon: "link",
        schema: {
          ...baseSchema.schema,
          dataSrc: "url",
          data: {
            url: `/api/method/nextai.funnel.apis.fetch_data.get_searched_doc_list?fields=*`,
          },
          filter: `doctype=${field?.options ?? ""}&limit=20.523`,
          dataType: "string",
          idPath: "name",
          valueProperty: "name",
          selectValues: "message",
          template: formioLinkTemplate,
          searchField: "q",
        },
      };
    }

    case "Table": {
      const allowedFields = new Set([
        "Data",
        "Small Text",
        "Select",
        "Link",
        "Currency",
        "Float",
        "Int",
        "Text",
        "Check",
        "Email",
        "Password",
        "Phone",
        "Percent",
      ]);

      let childComponents: any[] = [];
      if (field.options) {
        const res = await get_fields_for_doctype(field.options);
        if (res?.length) {
          childComponents = await Promise.all(
            res
              .filter((fd: { fieldtype: string }) =>
                allowedFields.has(fd.fieldtype)
              )
              .map(
                async (childField: {
                  label: any;
                  fieldtype: string | number;
                  fieldname: any;
                }) => ({
                  label: childField.label,
                  type: frappeFieldTypeToFormioFieldType(
                    childField.fieldtype,
                    true
                  ),
                  key: childField.fieldname,
                  input: true,
                  applyMaskOn: "change",
                  tableView: true,
                })
              )
          );
        }
      }

      return {
        ...baseSchema,
        icon: "table",
        schema: {
          ...baseSchema.schema,
          reorder: false,
          addAnotherPosition: "bottom",
          layoutFixed: false,
          enableRowGroups: false,
          initEmpty: false,
          tableView: false,
          defaultValue: [{}],
          components: childComponents,
        },
      };
    }

    case "Datetime":
      return {
        ...baseSchema,
        icon: "calendar",
        schema: {
          ...baseSchema.schema,
          enableTime: true,
          format: "yyyy-MM-dd hh:mm:ss",
          tableView: false,
          datePicker: {
            disableWeekends: false,
            disableWeekdays: false,
          },
          timePicker: {
            showMeridian: true,
          },
          enableMinDateInput: false,
          enableMaxDateInput: false,
          widget: {
            type: "calendar",
            displayInTimezone: "viewer",
            locale: "en",
            useLocaleSettings: false,
            allowInput: true,
            mode: "single",
            enableTime: false,
            noCalendar: false,
            format: "yyyy-MM-dd hh:mm:ss",
            hourIncrement: 1,
            minuteIncrement: 1,
            time_24hr: true,
            minDate: null,
            disableWeekends: false,
            disableWeekdays: false,
            maxDate: null,
          },
        },
      };
    case "Time":
      return {
        ...baseSchema,
        icon: "clock-o",
        schema: {
          ...baseSchema.schema,
          enableTime: false,
          tableView: false,
          inputMask: "99:99:99",
        },
      };
    case "Date":
      return {
        ...baseSchema,
        icon: "calendar",
        schema: {
          ...baseSchema.schema,
          format: "yyyy-MM-dd",
          tableView: false,
          datePicker: {
            disableWeekends: false,
            disableWeekdays: false,
          },
          enableTime: false,
          timePicker: {
            showMeridian: false,
          },
          enableMinDateInput: false,
          enableMaxDateInput: false,
          widget: {
            type: "calendar",
            displayInTimezone: "viewer",
            locale: "en",
            useLocaleSettings: false,
            allowInput: true,
            mode: "single",
            enableTime: false,
            noCalendar: false,
            format: "yyyy-MM-dd",
            hourIncrement: 1,
            minuteIncrement: 1,
            time_24hr: true,
            minDate: null,
            disableWeekends: false,
            disableWeekdays: false,
            maxDate: null,
          },
        },
      };

    case "Select": {
      const options =
        field.options
          .trim()
          ?.split("\n")
          ?.map((option: any) => ({
            label: option,
            value: option,
          })) || [];

      return {
        ...baseSchema,
        icon: "th-list",
        schema: {
          ...baseSchema.schema,
          enableTime: false,
          data: {
            values: options,
          },
        },
      };
    }

    case "Float":
      return {
        ...baseSchema,
        icon: "hashtag",
        schema: {
          ...baseSchema.schema,
          enableTime: false,
          decimalLimit: 9,
        },
      };

    case "Phone":
      return {
        ...baseSchema,
        icon: "phone-square",
        schema: {
          ...baseSchema.schema,
          applyMaskOn: "change",
          tableView: true,
        },
      };

    case "Check":
      return {
        ...baseSchema,
        icon: "check-square",
      };

    case "Rating":
      return {
        ...baseSchema,
        icon: "check-square",
        schema: {
          ...baseSchema.schema,
          optionsLabelPosition: "right",
          inline: true,
          attributes: {
            rating: "true",
          },
          tableView: true,
          values: [
            {
              label: "1",
              value: "1",
              shortcut: "",
            },
            {
              label: "2",
              value: "2",
              shortcut: "",
            },
            {
              label: "3",
              value: "3",
              shortcut: "",
            },
            {
              label: "4",
              value: "4",
              shortcut: "",
            },
            {
              label: "5",
              value: "5",
              shortcut: "",
            },
          ],
        },
      };

    case "Int":
      return {
        ...baseSchema,
        icon: "hashtag",
        schema: {
          ...baseSchema.schema,
          applyMaskOn: "change",
          mask: false,
          tableView: false,
          delimiter: false,
          requireDecimal: false,
          inputFormat: "plain",
          truncateMultipleSpaces: false,
          decimalLimit: 0,
        },
      };

    case "Signature":
      return {
        ...baseSchema,
        icon: "pencil",
      };

    case "Attach":
      return {
        ...baseSchema,
        icon: "file",
        schema: {
          ...baseSchema.schema,
          tableView: false,
          storage: "base64",
          webcam: false,
          capture: false,
          fileTypes: [
            {
              label: "",
              value: "",
            },
          ],
          filePattern: "*",
        },
      };

    case "Attach Image":
      return {
        ...baseSchema,
        icon: "file",
        schema: {
          ...baseSchema.schema,
          tableView: false,
          storage: "base64",
          webcam: false,
          capture: false,
          fileTypes: [
            {
              label: "",
              value: "",
            },
          ],
          filePattern: "image/*",
        },
      };

    case "Color":
      return {
        ...baseSchema,
        icon: "eyedropper",
      };
    case "Code":
      return {
        ...baseSchema,
        icon: "code",
      };

    default:
      return {
        ...baseSchema,
        icon: "terminal",
      };
  }
};

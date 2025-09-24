/* eslint-disable @typescript-eslint/no-explicit-any */
type ComponentType = string;

declare const Formio: any;

export function appendCustomSettings(types: ComponentType[]): void {
  const tabKey = "fetchDetails";
  const tabTitle = "Fetch Details";

  types.forEach((type) => {
    const comp = Formio?.Components?.components?.[type];
    if (!comp) {
      return;
    }
    if (typeof comp.editForm !== "function") {
      return;
    }

    const originalEditForm = comp.editForm;
    comp.editForm = function patchedEditForm(...args: any[]) {
      const form = originalEditForm.apply(this, args);
      if (!form || !Array.isArray(form.components)) {
        return form;
      }
      const tabsComponent = form.components.find(
        (tab: any) => tab && tab.key === "tabs"
      );
      if (!tabsComponent || !Array.isArray(tabsComponent.components)) {
        return form;
      }
      const already = tabsComponent.components.some(
        (tab: any) => tab && tab.key === tabKey
      );
      if (!already) {
        tabsComponent.components = [
          ...tabsComponent.components,
          {
            key: tabKey,
            label: tabTitle,
            weight: 50,
            components: [
              {
                label: "HTML",
                content: "Can be used only with User Fields",
                refreshOnChange: false,
                key: "html_user_fields_only",
                conditional: {
                  show: false,
                  when: "isCustomUserField",
                  eq: "true",
                },
                type: "htmlelement",
                input: false,
                tableView: false,
              },
              {
                type: "checkbox",
                key: "fetchDataOnFormLoad",
                label: "Fetch Value",
                input: true,
                conditional: {
                  show: true,
                  when: "isCustomUserField",
                  eq: "true",
                },
              },
              {
                type: "checkbox",
                key: "updateFieldOnFormSubmit",
                label: "Update on Submit",
                input: true,
                conditional: {
                  show: true,
                  when: "isCustomUserField",
                  eq: "true",
                },
              },
              {
                type: "select",
                key: "selectedSyncDoctype",
                label: "Select Doctype",
                input: true,
                dataSrc: "url",
                dataType: "string",
                selectValues: "message",
                idPath: "name",
                filter: "doctype=DocType&limit=20.523",
                valueProperty: "name",
                searchField: "q",
                data: {
                  url: "/api/method/nextai.funnel.apis.fetch_data.get_searched_doc_list",
                },
                template: "<span>{{ item.name }}</span>",
                validate: {
                  required: true,
                },
                conditional: {
                  show: true,
                  when: "isCustomUserField",
                  eq: "true",
                },
              },
              {
                type: "select",
                key: "selectedSyncField",
                label: "Select Field",
                input: true,
                dataSrc: "url",
                dataType: "string",
                idPath: "value",
                data: {
                  url: `/api/method/nextai.api.get_doc_fields_list.get_doc_fields_list?doctype={{ data.selectedSyncDoctype }}`,
                },
                refreshOn: "selectedSyncDoctype",
                selectValues: "message",
                template: "<span>{{ item.label }}</span>",
                valueProperty: "value",
                validate: {
                  required: true,
                },
                conditional: {
                  show: true,
                  when: "isCustomUserField",
                  eq: "true",
                },
              },
              {
                type: "textfield",
                key: "targetDoctypeName",
                label: "Docname Template",
                input: true,
                validate: {
                  required: true,
                },
                conditional: {
                  show: true,
                  when: "isCustomUserField",
                  eq: "true",
                },
                defaultValue: "{{doc.name}}",
              },
            ],
          },
        ];
      }
      return form;
    };
  });
}

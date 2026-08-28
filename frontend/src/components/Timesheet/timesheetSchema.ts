export const timesheetSchema = {
  components: [
    {
      type: "textfield",
      key: "employee",
      label: "Employee",
      input: true,
      validate: { required: true },
      hidden: true,
    },
    {
      type: "columns",
      columns: [
        {
          width: 6,
          components: [
            {
              type: "select",
              key: "company",
              label: "Company",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Company?fields=[\"name\",\"company_name\"]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.company_name || item.name }} <span style='color:#7f8c8d'>({{ item.name }})</span></span>",
              searchEnabled: true,
              validate: { required: true },
            },
            {
              type: "select",
              key: "customer",
              label: "Customer",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Customer?fields=[\"name\",\"customer_name\"]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.customer_name || item.name }} <span style='color:#7f8c8d'>({{ item.name }})</span></span>",
              searchEnabled: true,
            },

          ],
        },
        {
          width: 6,
          components: [
            {
              type: "select",
              key: "parent_project",
              label: "Project",
              description: "If filled, this project will be automatically applied to all time logs.",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/resource/Project?fields=[\"name\",\"project_name\"]",
              },
              selectValues: "data",
              valueProperty: "name",
              template: "<span>{{ item.project_name || item.name }}</span>",
              searchEnabled: true,
            },
          ],
        },
      ],
    },
    {
      type: "editgrid",
      key: "time_logs",
      label: "Time Logs",
      input: true,
      validate: { required: true },
      components: [
        {
          type: "columns",
          columns: [
            {
              width: 6,
              components: [
                {
                  type: "select",
                  key: "activity_type",
                  label: "Activity Type",
                  input: true,
                  dataSrc: "url",
                  data: {
                    url: "/api/resource/Activity Type?fields=[\"name\"]",
                  },
                  selectValues: "data",
                  valueProperty: "name",
                  template: "<span>{{ item.name }}</span>",
                  searchEnabled: true,
                },
                {
                  type: "datetime",
                  key: "from_time",
                  label: "From Time",
                  input: true,
                  enableTime: true,
                  format: "dd-MM-yyyy hh:mm a",
                  widget: {
                    type: "calendar",
                    displayInTimezone: "viewer",
                    locale: "en",
                    useLocaleSettings: false,
                    allowInput: true,
                    mode: "single",
                    enableTime: true,
                    noCalendar: false,
                    format: "dd-MM-yyyy hh:mm a",
                    hourIncrement: 1,
                    minuteIncrement: 1,
                    time_24hr: false,
                    enableSeconds: false,
                    minDate: null,
                    disableWeekends: false,
                    disableWeekdays: false,
                    maxDate: null,
                  },
                },
                {
                  type: "textarea",
                  key: "description",
                  label: "Description",
                  input: true,
                  rows: 3,
                },
              ],
            },
            {
              width: 6,
              components: [
                {
                  type: "number",
                  key: "expected_hours",
                  label: "Expected Hrs",
                  input: true,
                },
                {
                  type: "datetime",
                  key: "to_time",
                  label: "To Time",
                  input: true,
                  enableTime: true,
                  format: "dd-MM-yyyy hh:mm a",
                  validate: {
                    custom: "if (row.from_time && row.to_time) { const diff = moment(row.to_time).diff(moment(row.from_time, ['YYYY-MM-DDTHH:mm:ssZ', 'DD-MM-YYYY HH:mm:ss', 'DD-MM-YYYY hh:mm a'])); valid = diff > 0 ? true : 'To time must be greater than from time'; } else { valid = true; }"
                  },
                  widget: {
                    type: "calendar",
                    displayInTimezone: "viewer",
                    locale: "en",
                    useLocaleSettings: false,
                    allowInput: true,
                    mode: "single",
                    enableTime: true,
                    noCalendar: false,
                    format: "dd-MM-yyyy hh:mm a",
                    hourIncrement: 1,
                    minuteIncrement: 1,
                    time_24hr: false,
                    enableSeconds: false,
                    minDate: null,
                    disableWeekends: false,
                    disableWeekdays: false,
                    maxDate: null,
                  },
                },
                {
                  type: "number",
                  key: "hours",
                  label: "Hrs",
                  input: true,
                  validate: { min: 0 },
                  calculateValue: "if (row.from_time && row.to_time) { const diff = moment(row.to_time).diff(moment(row.from_time, ['YYYY-MM-DDTHH:mm:ssZ', 'DD-MM-YYYY HH:mm:ss', 'DD-MM-YYYY hh:mm a']), 'hours', true); value = diff > 0 ? parseFloat(diff.toFixed(2)) : 0; } else { value = 0; }",
                },
                {
                  type: "checkbox",
                  key: "completed",
                  label: "Completed",
                  input: true,
                },
              ],
            },
          ],
        },
        {
          type: "columns",
          columns: [
            {
              width: 6,
              components: [
                {
                  type: "select",
                  key: "project",
                  label: "Project",
                  input: true,
                  dataSrc: "url",
                  data: {
                    url: "/api/resource/Project?fields=[\"name\",\"project_name\"]",
                  },
                  selectValues: "data",
                  valueProperty: "name",
                  template: "<span>{{ item.project_name }}</span>",
                  searchEnabled: true,
                  validate: { required: true },
                  calculateValue: "if (data.parent_project) { value = data.parent_project; } else { value = value; }",
                  logic: [
                    {
                      name: "Disable Field if Form Project is Filled",
                      trigger: {
                        type: "javascript",
                        javascript: "result = !!data.parent_project;"
                      },
                      actions: [
                        {
                          name: "Disable",
                          type: "property",
                          property: {
                            label: "Disabled",
                            value: "disabled",
                            type: "boolean"
                          },
                          state: true
                        }
                      ]
                    }
                  ],
                },
              ],
            }, {
              width: 6,
              components: [
                {
                  type: "select",
                  key: "custom_parent_task",
                  label: "Task",
                  input: true,
                  dataSrc: "url",
                  data: {
                    url: "/api/resource/Task?fields=[\"name\",\"subject\",\"project\"]&filters=[[\"project\",\"=\",\"{{ row.project }}\"],[\"is_group\",\"=\",1]]",
                  },
                  selectValues: "data",
                  valueProperty: "name",
                  template: "<span>{{ item.subject || item.name }}</span>",
                  searchEnabled: true,
                  refreshOn: "project",
                  clearOnRefresh: true,
                  lazyLoad: false,
                  ignoreCache: true,
                },
                {
                  type: "select",
                  key: "task",
                  label: "Sub Task",
                  input: true,
                  dataSrc: "url",
                  data: {
                    url: "/api/resource/Task?fields=[\"name\",\"subject\",\"project\"]&filters=[[\"parent_task\",\"=\",\"{{ row.custom_parent_task }}\"],[\"project\",\"=\",\"{{ row.project }}\"],[\"is_group\",\"=\",0]]",
                  },
                  selectValues: "data",
                  valueProperty: "name",
                  template: "<span>{{ item.subject || item.name }}</span>",
                  searchEnabled: true,
                  refreshOn: "custom_parent_task",
                  clearOnRefresh: true,
                  lazyLoad: false,
                  ignoreCache: true,
                },
              ]
            },
          ],
        },
        {
          type: "columns",
          columns: [
            {
              width: 12,
              components: [
                {
                  type: "checkbox",
                  key: "is_billable",
                  label: "Is Billable",
                  input: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

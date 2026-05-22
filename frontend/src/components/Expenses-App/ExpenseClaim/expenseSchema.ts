export const expenseSchema = {
  components: [
    {
      type: "textfield",
      key: "employee",
      input: true,
      hidden: true,
      clearOnHide: false,
    },
    {
      type: "select",
      key: "category_type",
      label: "Select Class",
      input: true,
      defaultValue: "General",
      dataSrc: "url",
      data: {
        url: "/api/method/chatnext_expense_trips.expense_claim.fiter_category_types",
      },
      selectValues: "message",
      valueProperty: "",
      template: "<span>{{ item }}</span>",
      placeholder: "Select Class",
      clearOnRefresh: false,
      validate: {
        required: true,
        customMessage: "Select Class is required",
      },
    },
    {
      type: "columns",
      key: "categoryAndTypeRow",
      customClass: "flex min-w-full mt-4",
      columns: [
        {
          components: [
            {
              type: "select",
              key: "expenseCategory",
              label: "Select Expense Category",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/method/chatnext_expense_trips.expense_claim.get_applicable_expense_categories?category_type={{ data.category_type && data.category_type.value ? data.category_type.value : data.category_type }}",
              },
              selectValues: "message",
              valueProperty: "name",
              template: "<span>{{ item.category_name }}</span>",
              refreshOn: "category_type",
              clearOnRefresh: true,
              placeholder: "Select Expense Category",
              validate: {
                required: true,
                customMessage: "Select Expense Category is required",
              },
            },
          ],
        },
        {
          components: [
            {
              type: "select",
              key: "expenseType",
              label: "Select Expense Type",
              input: true,
              dataSrc: "url",
              data: {
                url: "/api/method/chatnext_expense_trips.expense_claim.get_expense_types_by_category?employee={{ data.employee }}&&reimbursement_category={{ data.expenseCategory }}",
                headers: [{ key: "Accept", value: "application/json" }],
              },
              selectValues: "message",
              valueProperty: "",
              template: "<span>{{ item.expense_type }}</span>",
              refreshOn: "expenseCategory",
              clearOnRefresh: true,
              placeholder: "Select Expense Type",
              validate: {
                required: true,
                customMessage: "Select Expense Type is required",
              },
            },
          ],
        },
      ],
    },
  ],
};

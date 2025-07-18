
// In your Dynamic User Assignment form script
frappe.ui.form.on("Dynamic User Assignment", {
  refresh(frm) {
    render_dynamic_user_assignment_filter_ui(frm)
  },
})

function render_dynamic_user_assignment_filter_ui(frm) {
  // Check if the field exists
  if (!frm.fields_dict["approval_condtions"]) {
    console.error('Field "approval_condtions" not found in form')
    return
  }

  const wrapper = frm.fields_dict["approval_condtions"].$wrapper
  wrapper.empty() // Clear existing content

  // Define the operators configuration
  const filterConfig = {
    targetTypes: [], // Will be populated with all doctypes
    fields: {}, // Will be populated dynamically
    operators: {
      Data: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "Like", value: "like" },
        { label: "Not Like", value: "not like" },
        { label: "In", value: "in" },
      ],
      Link: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "In", value: "in" },
      ],
      Currency: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "Greater Than", value: ">" },
        { label: "Less Than", value: "<" },
        { label: "Greater Than or Equal To", value: ">=" },
        { label: "Less Than or Equal To", value: "<=" },
        { label: "Between", value: "between" },
      ],
      Int: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "Greater Than", value: ">" },
        { label: "Less Than", value: "<" },
        { label: "Greater Than or Equal To", value: ">=" },
        { label: "Less Than or Equal To", value: "<=" },
        { label: "Between", value: "between" },
      ],
      Float: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "Greater Than", value: ">" },
        { label: "Less Than", value: "<" },
        { label: "Greater Than or Equal To", value: ">=" },
        { label: "Less Than or Equal To", value: "<=" },
        { label: "Between", value: "between" },
      ],
      Check: [{ label: "Equals", value: "=" }],
      Date: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "Before", value: "<" },
        { label: "After", value: ">" },
        { label: "Between", value: "between" },
      ],
      Datetime: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "Before", value: "<" },
        { label: "After", value: ">" },
        { label: "Between", value: "between" },
      ],
      Select: [
        { label: "Equals", value: "=" },
        { label: "Not Equals", value: "!=" },
        { label: "In", value: "in" },
      ],
    },
  }

  // Add filter builder container with styling
  wrapper.append(`
        <div id="filter-builder" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; width: 100%; background-color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); padding: 16px; margin: 20px 0;">
            <div id="filters-container">
                <!-- Filter rows will be added here -->
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 16px;">
                <button id="add-filter-btn" style="background: none; border: none; color: #4F46E5; font-size: 14px; cursor: pointer; display: flex; align-items: center; padding: 8px 0;">
                    <span style="margin-right: 4px; font-weight: bold;">+</span> Add a Condition
                </button>
                <div>
                    <button id="clear-filters-btn" style="background: none; border: 1px solid #E5E7EB; color: #374151; font-size: 14px; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                        Clear Conditions
                    </button>
                    <button id="apply-filters-btn" style="background-color: #111827; border: none; color: white; font-size: 14px; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        Apply Conditions
                    </button>
                </div>
            </div>
        </div>
    `)

  const filtersContainer = wrapper.find("#filters-container")
  const addFilterBtn = wrapper.find("#add-filter-btn")
  const clearFiltersBtn = wrapper.find("#clear-filters-btn")
  const applyFiltersBtn = wrapper.find("#apply-filters-btn")

  let filterIndex = 0

  // Function to create a styled select element
  function createStyledSelect(className, width, multiple = false) {
    const multipleAttr = multiple ? "multiple" : ""
    const heightStyle = multiple ? "min-height: 80px;" : ""
    return `<select class="${className}" ${multipleAttr} style="padding: 8px 12px; border-radius: 4px; border: none; background-color: #F3F4F6; width: ${width || "150px"}; ${heightStyle} font-size: 14px; color: #374151; appearance: none; background-image: url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'12\\' height=\\'12\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23374151\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Cpolyline points=\\'6 9 12 15 18 9\\'%3E%3C/polyline%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;"></select>`
  }

  // Function to create a styled input element
  function createStyledInput(type, className, placeholder) {
    return `<input type="${type}" class="${className}" ${placeholder ? `placeholder="${placeholder}"` : ""} style="padding: 8px 12px; border-radius: 4px; border: none; background-color: #F3F4F6; width: 100%; font-size: 14px; color: #374151; box-sizing: border-box;">`
  }

  // Function to create a styled textarea element
  function createStyledTextarea(className, placeholder) {
    return `<textarea class="${className}" ${placeholder ? `placeholder="${placeholder}"` : ""} style="padding: 8px 12px; border-radius: 4px; border: none; background-color: #F3F4F6; width: 100%; font-size: 14px; color: #374151; box-sizing: border-box; min-height: 60px; resize: vertical;"></textarea>`
  }

  // Function to create multiselect dropdown for Data fields (like name field)
  function createMultiselectDataField() {
    return `
            <div class="multiselect-data-container" style="position: relative; width: 100%;">
                <div class="selected-values" style="min-height: 40px; padding: 8px 12px; border-radius: 4px; background-color: #F3F4F6; border: 1px solid #E5E7EB; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                    <input type="text" class="multiselect-input" placeholder="Type to search and select..." style="border: none; background: none; outline: none; flex: 1; min-width: 150px;">
                </div>
                <div class="multiselect-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background-color: white; border: 1px solid #E5E7EB; border-radius: 4px; z-index: 100; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>
            </div>
        `
  }

  // Function to create multiselect Link field with tags
  function createMultiselectLinkField() {
    return `
            <div class="multiselect-link-container" style="position: relative; width: 100%;">
                <div class="selected-values" style="min-height: 40px; padding: 8px 12px; border-radius: 4px; background-color: #F3F4F6; border: 1px solid #E5E7EB; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                    <input type="text" class="multiselect-input" placeholder="Type to search and select..." style="border: none; background: none; outline: none; flex: 1; min-width: 150px;">
                </div>
                <div class="multiselect-dropdown" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; max-height: 200px; overflow-y: auto; background-color: white; border: 1px solid #E5E7EB; border-radius: 4px; z-index: 100; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>
            </div>
        `
  }

  // Function to add a new filter row
  function addFilterRow() {
    const rowHtml = `
            <div class="filter-row" data-index="${filterIndex++}" style="display: flex; align-items: center; margin-bottom: 12px; gap: 8px;">
                ${createStyledSelect("target-type-select", "150px")}
                ${createStyledSelect("field-select", "150px")}
                ${createStyledSelect("operator-select", "150px")}
                <div class="value-container" style="flex: 1;"></div>
                <button class="remove-filter-btn" style="background: none; border: none; color: #9CA3AF; font-size: 18px; cursor: pointer; padding: 4px 8px; display: flex; align-items: center; justify-content: center;">&times;</button>
            </div>
        `

    filtersContainer.append(rowHtml)

    const newRow = filtersContainer.find(`.filter-row[data-index="${filterIndex - 1}"]`)
    const targetTypeSelect = newRow.find(".target-type-select")
    const fieldSelect = newRow.find(".field-select")
    const operatorSelect = newRow.find(".operator-select")
    const valueContainer = newRow.find(".value-container")

    // Populate target type (doctype) options
    let targetTypeOptions = '<option value="">Select Doctype...</option>'
    filterConfig.targetTypes.forEach((doctype) => {
      targetTypeOptions += `<option value="${doctype.value}">${doctype.label}</option>`
    })
    targetTypeSelect.html(targetTypeOptions)


    // Set up event handlers for cascading updates
    targetTypeSelect.on("change", function () {
      const selectedValue = jQuery(this).val()
      console.log("Target type changed to:", selectedValue)
      updateFieldOptions(jQuery(this), fieldSelect)
      // Clear operator and value when target type changes
      operatorSelect.empty().append('<option value="">Select Operator...</option>')
      valueContainer.empty()
    })

    fieldSelect.on("change", function () {
      const selectedValue = jQuery(this).val()
      console.log("Field changed to:", selectedValue)
      updateOperatorOptions(jQuery(this), operatorSelect)
      updateValueInput(jQuery(this), operatorSelect, valueContainer)
    })

    operatorSelect.on("change", function () {
      const selectedValue = jQuery(this).val()
      console.log("Operator changed to:", selectedValue)
      updateValueInput(fieldSelect, jQuery(this), valueContainer)
    })

    // Set up remove button
    newRow.find(".remove-filter-btn").on("click", function () {
      jQuery(this).closest(".filter-row").remove()
    })
  }

  // Function to update field options based on selected target type (doctype)
  function updateFieldOptions(targetTypeSelect, fieldSelect) {
    const selectedDoctype = targetTypeSelect.val()
    console.log("Updating fields for doctype:", selectedDoctype)

    // Clear existing options
    fieldSelect.empty().append('<option value="">Select Field...</option>')

    if (!selectedDoctype) return

    // If we already have the fields for this doctype, use them
    if (filterConfig.fields[selectedDoctype]) {
      populateFieldOptions(selectedDoctype, fieldSelect)
      return
    }

    // Show loading indicator
    fieldSelect.html('<option value="">Loading fields...</option>')

    // Fetch fields from the selected doctype
    frappe.model.with_doctype(selectedDoctype, () => {
      try {
        const meta = frappe.get_meta(selectedDoctype)
        filterConfig.fields[selectedDoctype] = meta.fields
        populateFieldOptions(selectedDoctype, fieldSelect)
      } catch (error) {
        console.error("Error getting meta for", selectedDoctype, ":", error)
        fieldSelect.html('<option value="">Error loading fields</option>')
      }
    })
  }

  // Helper function to populate field options
  function populateFieldOptions(doctype, fieldSelect) {
    fieldSelect.empty().append('<option value="">Select Field...</option>')

    const fields = filterConfig.fields[doctype]
    if (!fields || !Array.isArray(fields)) {
      console.error("No fields found for doctype:", doctype)
      return
    }
    // console.log("Populating fields for doctype:", doctype, "with", fields.length, "fields", fields)
    fields.forEach((field) => {
        console.log("Processing field:", field.fieldname, "of type:", field.fieldtype)
      // Skip hidden and section break fields
      if (
        field.hidden ||
        field.fieldtype === "Section Break" ||
        field.fieldtype === "Column Break" ||
        field.fieldtype === "HTML" ||
        field.fieldtype === "Button" ||
        field.fieldtype === "Table"
      ) {
        return
      }

      const option = jQuery(
        `<option value="${field.fieldname}" data-type="${field.fieldtype}" data-options="${field.options || ""}" data-link-doctype="${field.options || ""}">${field.label || field.fieldname}</option>`,
      )
      fieldSelect.append(option)
    })

    console.log("Populated", fieldSelect.find("option").length - 1, "fields for", doctype)
  }

  // Function to update operator options based on selected field
  function updateOperatorOptions(fieldSelect, operatorSelect) {
    const selectedOption = fieldSelect.find("option:selected")
    const fieldType = selectedOption.data("type")
    console.log("Updating operators for field type:", fieldType)

    // Clear existing options
    operatorSelect.empty().append('<option value="">Select Operator...</option>')

    if (!fieldType) return

    // Map Frappe field types to our operator types
    let operatorType = fieldType
    if (["Small Text", "Text", "Text Editor", "Code", "Data"].includes(fieldType)) {
      operatorType = "Data"
    } else if (["Percent", "Currency", "Float", "Decimal"].includes(fieldType)) {
      operatorType = "Float"
    } else if (["Int", "Integer"].includes(fieldType)) {
      operatorType = "Int"
    }

    // Add new options based on field type
    if (filterConfig.operators[operatorType]) {
      filterConfig.operators[operatorType].forEach((operator) => {
        operatorSelect.append(`<option value="${operator.value}">${operator.label}</option>`)
      })
    } else {
      // Default to Data operators if we don't have specific ones
      filterConfig.operators.Data.forEach((operator) => {
        operatorSelect.append(`<option value="${operator.value}">${operator.label}</option>`)
      })
    }

    console.log("Populated", operatorSelect.find("option").length - 1, "operators")
  }

  // Function to update the value input based on the selected field and operator
  function updateValueInput(fieldSelect, operatorSelect, valueContainer) {
    if (fieldSelect.find("option").length === 0 || operatorSelect.find("option").length === 0) return

    const selectedFieldOption = fieldSelect.find("option:selected")
    const fieldType = selectedFieldOption.data("type")
    const fieldName = selectedFieldOption.val()
    const selectedDoctype = fieldSelect.closest(".filter-row").find(".target-type-select").val()
    const operatorValue = operatorSelect.val()

    console.log("Updating value input for:", { fieldType, fieldName, selectedDoctype, operatorValue })

    // Clear the value container
    valueContainer.empty()

    if (!fieldType || !operatorValue) return

    // Create the appropriate input based on field type and operator
    if (fieldType === "Check") {
      // Create a Yes/No dropdown for Check fields
      const selectHtml = createStyledSelect("value-input", "100%")
      valueContainer.html(selectHtml)

      const select = valueContainer.find(".value-input")
      select.append('<option value="">Select...</option>')
      select.append('<option value="1">Yes</option>')
      select.append('<option value="0">No</option>')
    } else if (fieldType === "Select") {
      // Check if operator is 'in' for multiselect
      if (operatorValue === "in") {
        // Create multiselect dropdown for Select fields with 'in' operator
        const selectHtml = createStyledSelect("value-input multiselect-select", "100%", true)
        valueContainer.html(selectHtml)

        const select = valueContainer.find(".multiselect-select")
        select.html('<option value="">Loading options...</option>')

        // Fetch options from the field's metadata
        frappe.model.with_doctype(selectedDoctype, () => {
          const fieldMeta = frappe.meta.get_docfield(selectedDoctype, fieldName)
          if (fieldMeta && fieldMeta.options) {
            const optionsList = fieldMeta.options.split("\n").filter((opt) => opt.trim())
            select.empty()
            optionsList.forEach((optionText) => {
              select.append(`<option value="${optionText}">${optionText}</option>`)
            })
            console.log("Loaded", optionsList.length, "select options for multiselect")
          } else {
            select.html('<option value="">No options available</option>')
          }
        })
      } else {
        // Create single select dropdown for Select fields
        const selectHtml = createStyledSelect("value-input", "100%")
        valueContainer.html(selectHtml)

        const select = valueContainer.find(".value-input")
        select.html('<option value="">Loading options...</option>')

        // Fetch options from the field's metadata
        frappe.model.with_doctype(selectedDoctype, () => {
          const fieldMeta = frappe.meta.get_docfield(selectedDoctype, fieldName)
          if (fieldMeta && fieldMeta.options) {
            const optionsList = fieldMeta.options.split("\n").filter((opt) => opt.trim())
            select.empty().append('<option value="">Select...</option>')
            optionsList.forEach((optionText) => {
              select.append(`<option value="${optionText}">${optionText}</option>`)
            })
            console.log("Loaded", optionsList.length, "select options for single select")
          } else {
            select.html('<option value="">No options available</option>')
          }
        })
      }
    } else if (fieldType === "Link") {
      // Check if operator is 'in' for multiselect
      if (operatorValue === "in") {
        // Create multiselect autocomplete for Link fields with 'in' operator
        valueContainer.html(createMultiselectLinkField())
        setupMultiselectLink(valueContainer, fieldName, selectedDoctype)
      } else {
        // Create single autocomplete for Link fields
        valueContainer.html(createStyledInput("text", "value-input"))
        setupSingleLink(valueContainer, fieldName, selectedDoctype)
      }
    } else if (fieldType === "Data" && fieldName === "name" && operatorValue === "in") {
      // Special handling for 'name' field with 'in' operator - create multiselect
      console.log("Creating multiselect for name field of", selectedDoctype)
      valueContainer.html(createMultiselectDataField())
      setupMultiselectDataField(valueContainer, selectedDoctype)
    } else if (["Currency", "Float", "Int", "Decimal", "Percent"].includes(fieldType)) {
      // Create number input(s) for numeric fields
      if (operatorValue === "between") {
        // For 'between' operator, create two inputs
        valueContainer.html(`
                    <div style="display: flex; gap: 8px;">
                        ${createStyledInput("number", "value-input-min", "Min")}
                        ${createStyledInput("number", "value-input-max", "Max")}
                    </div>
                `)

        // Add step attribute for Float/Currency fields
        if (["Currency", "Float", "Decimal", "Percent"].includes(fieldType)) {
          valueContainer.find("input").attr("step", "0.01")
        }
      } else {
        // For other operators, create a single input
        valueContainer.html(createStyledInput("number", "value-input"))

        // Add step attribute for Float/Currency fields
        if (["Currency", "Float", "Decimal", "Percent"].includes(fieldType)) {
          valueContainer.find("input").attr("step", "0.01")
        }
      }
    } else if (["Date", "Datetime"].includes(fieldType)) {
      // Create date input(s) for Date fields
      if (operatorValue === "between") {
        // For 'between' operator, create two inputs
        valueContainer.html(`
                    <div style="display: flex; gap: 8px;">
                        ${createStyledInput(fieldType.toLowerCase(), "value-input-min")}
                        ${createStyledInput(fieldType.toLowerCase(), "value-input-max")}
                    </div>
                `)
      } else {
        // For other operators, create a single input
        valueContainer.html(createStyledInput(fieldType.toLowerCase(), "value-input"))
      }
    } else {
      // Create a text input for all other fields
      if (operatorValue === "in") {
        // For 'in' operator, create a textarea for comma-separated values
        valueContainer.html(createStyledTextarea("value-input", "Enter comma-separated values"))
      } else {
        // For other operators, create a single input
        valueContainer.html(createStyledInput("text", "value-input"))
      }
    }
  }

  // Function to setup multiselect for Data fields (like name field)
  function setupMultiselectDataField(valueContainer, selectedDoctype) {
    const input = valueContainer.find(".multiselect-input")
    const dropdown = valueContainer.find(".multiselect-dropdown")
    const selectedContainer = valueContainer.find(".selected-values")
    let selectedValues = []

    console.log("Setting up multiselect data field for doctype:", selectedDoctype)

    // Function to fetch and display options
    const fetchOptions = (searchText) => {
      dropdown.html('<div style="padding: 8px; text-align: center; color: #6B7280;">Loading...</div>')
      dropdown.show()

      // Fetch records from the selected doctype
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: selectedDoctype,
          fields: ["name"],
          filters: searchText ? [["name", "like", `%${searchText}%`]] : [],
          limit_page_length: 20,
        },
        callback: (r) => {
          if (!r.message || r.message.length === 0) {
            dropdown.html('<div style="padding: 8px; text-align: center; color: #6B7280;">No results found</div>')
            return
          }

          dropdown.empty()

          r.message.forEach((record) => {
            const optionHtml = `
                            <div class="multiselect-option" data-value="${record.name}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                                <div style="font-weight: 500;">${record.name}</div>
                            </div>
                        `
            dropdown.append(optionHtml)
          })

          // Handle option click
          dropdown.find(".multiselect-option").on("click", function () {
            const value = jQuery(this).data("value")
            if (!selectedValues.includes(value)) {
              selectedValues.push(value)
              addSelectedTag(value)
              input.val("")
              dropdown.hide()
            }
          })

          // Add hover effect
          dropdown.find(".multiselect-option").on("mouseenter", function () {
            jQuery(this).css("background-color", "#F9FAFB")
          })
          dropdown.find(".multiselect-option").on("mouseleave", function () {
            jQuery(this).css("background-color", "")
          })
        },
        error: (err) => {
          console.error("Error fetching data field options:", err)
          dropdown.html('<div style="padding: 8px; text-align: center; color: #EF4444;">Error loading options</div>')
        },
      })
    }

    // Function to add selected tag
    const addSelectedTag = (value) => {
      const tag = jQuery(`
                <span class="selected-tag" data-value="${value}" style="background-color: #E5E7EB; padding: 2px 8px; border-radius: 12px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                    ${value}
                    <button type="button" class="remove-tag" style="background: none; border: none; color: #6B7280; cursor: pointer; font-size: 14px;">&times;</button>
                </span>
            `)

      tag.find(".remove-tag").on("click", () => {
        const valueToRemove = tag.data("value")
        selectedValues = selectedValues.filter((v) => v !== valueToRemove)
        tag.remove()
      })

      selectedContainer.find(".multiselect-input").before(tag)
    }

    // Set up input event with debounce
    let debounceTimer
    input.on("input", function () {
      const searchText = jQuery(this).val()
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchOptions(searchText)
      }, 300)
    })

    // Show dropdown on focus
    input.on("focus", function () {
      const searchText = jQuery(this).val()
      fetchOptions(searchText)
    })

    // Hide dropdown when clicking outside
    jQuery(document).on("click", (e) => {
      if (!jQuery(e.target).closest(".multiselect-data-container").length) {
        dropdown.hide()
      }
    })

    // Store selected values in a hidden way for retrieval
    valueContainer.data("getSelectedValues", () => selectedValues.join(","))
  }

  // Function to setup multiselect Link field
  function setupMultiselectLink(valueContainer, fieldName, selectedDoctype) {
    const input = valueContainer.find(".multiselect-input")
    const dropdown = valueContainer.find(".multiselect-dropdown")
    const selectedContainer = valueContainer.find(".selected-values")
    let selectedValues = []

    // Get the linked doctype
    const fieldMeta = frappe.meta.get_docfield(selectedDoctype, fieldName)
    const linkDoctype = fieldMeta ? fieldMeta.options : null

    console.log("Setting up multiselect link for:", fieldName, "linked to:", linkDoctype)

    if (linkDoctype) {
      // Function to fetch and display options
      const fetchOptions = (searchText) => {
        dropdown.html('<div style="padding: 8px; text-align: center; color: #6B7280;">Loading...</div>')
        dropdown.show()

        frappe.db
          .get_link_options(linkDoctype, searchText)
          .then((results) => {
            if (results.length === 0) {
              dropdown.html('<div style="padding: 8px; text-align: center; color: #6B7280;">No results found</div>')
              return
            }

            dropdown.empty()

            results.forEach((result) => {
              const optionHtml = `
                                <div class="multiselect-option" data-value="${result.value}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                                    <div style="font-weight: 500;">${result.value}</div>
                                    ${result.description ? `<div style="font-size: 12px; color: #6B7280;">${result.description}</div>` : ""}
                                </div>
                            `
              dropdown.append(optionHtml)
            })

            // Handle option click
            dropdown.find(".multiselect-option").on("click", function () {
              const value = jQuery(this).data("value")
              if (!selectedValues.includes(value)) {
                selectedValues.push(value)
                addSelectedTag(value)
                input.val("")
                dropdown.hide()
              }
            })

            // Add hover effect
            dropdown.find(".multiselect-option").on("mouseenter", function () {
              jQuery(this).css("background-color", "#F9FAFB")
            })
            dropdown.find(".multiselect-option").on("mouseleave", function () {
              jQuery(this).css("background-color", "")
            })
          })
          .catch((err) => {
            console.error("Error fetching link options:", err)
            dropdown.html('<div style="padding: 8px; text-align: center; color: #EF4444;">Error loading options</div>')
          })
      }

      // Function to add selected tag
      const addSelectedTag = (value) => {
        const tag = jQuery(`
                    <span class="selected-tag" data-value="${value}" style="background-color: #E5E7EB; padding: 2px 8px; border-radius: 12px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                        ${value}
                        <button type="button" class="remove-tag" style="background: none; border: none; color: #6B7280; cursor: pointer; font-size: 14px;">&times;</button>
                    </span>
                `)

        tag.find(".remove-tag").on("click", () => {
          const valueToRemove = tag.data("value")
          selectedValues = selectedValues.filter((v) => v !== valueToRemove)
          tag.remove()
        })

        selectedContainer.find(".multiselect-input").before(tag)
      }

      // Set up input event with debounce
      let debounceTimer
      input.on("input", function () {
        const searchText = jQuery(this).val()
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          fetchOptions(searchText)
        }, 300)
      })

      // Show dropdown on focus
      input.on("focus", function () {
        const searchText = jQuery(this).val()
        fetchOptions(searchText)
      })

      // Hide dropdown when clicking outside
      jQuery(document).on("click", (e) => {
        if (!jQuery(e.target).closest(".multiselect-link-container").length) {
          dropdown.hide()
        }
      })

      // Store selected values in a hidden way for retrieval
      valueContainer.data("getSelectedValues", () => selectedValues.join(","))
    }
  }

  // Function to setup single Link field
  function setupSingleLink(valueContainer, fieldName, selectedDoctype) {
    const input = valueContainer.find(".value-input")

    // Get the linked doctype
    const fieldMeta = frappe.meta.get_docfield(selectedDoctype, fieldName)
    const linkDoctype = fieldMeta ? fieldMeta.options : null

    console.log("Setting up single link for:", fieldName, "linked to:", linkDoctype)

    if (linkDoctype) {
      // Set up autocomplete for link field
      input.attr("data-link-doctype", linkDoctype)

      // Initialize the autocomplete
      input.on("input", function () {
        const searchText = jQuery(this).val()

        // Use the recommended Frappe method to fetch link options
        frappe.db
          .get_link_options(linkDoctype, searchText)
          .then((results) => {
            // Create a datalist for autocomplete suggestions
            const datalistId = `link-options-${fieldName}-${Date.now()}`

            // Remove existing datalist if any
            jQuery(`datalist[id^="link-options-${fieldName}"]`).remove()

            // Create new datalist
            const datalist = jQuery(`<datalist id="${datalistId}"></datalist>`)

            // Add options to datalist
            results.forEach((result) => {
              datalist.append(`<option value="${result.value}">${result.description || ""}</option>`)
            })

            // Append datalist to document
            jQuery("body").append(datalist)

            // Connect input to datalist
            input.attr("list", datalistId)
          })
          .catch((err) => {
            console.error("Error fetching link options:", err)
          })
      })

      // Trigger initial load of options
      setTimeout(() => {
        input.trigger("input")
      }, 100)
    }
  }

  // Function to get value from input (handles multiselect)
  function getValueFromInput(row) {
    const fieldType = row.find(".field-select option:selected").data("type")
    const fieldName = row.find(".field-select option:selected").val()
    const operatorValue = row.find(".operator-select").val()
    const valueContainer = row.find(".value-container")

    console.log("Getting value for field type:", fieldType, "field name:", fieldName, "operator:", operatorValue)

    // Check if this is a multiselect case
    const isMultiselect =
      (["Link", "Select"].includes(fieldType) || (fieldType === "Data" && fieldName === "name")) &&
      operatorValue === "in"

    if (isMultiselect) {
      if (fieldType === "Link") {
        // Get selected values from multiselect Link field
        const getSelectedValues = valueContainer.data("getSelectedValues")
        const result = getSelectedValues ? getSelectedValues() : ""
        console.log("Multiselect Link values:", result)
        return result
      } else if (fieldType === "Select") {
        // Get selected values from multiselect Select field
        const selectedOptions = valueContainer.find(".multiselect-select option:selected")
        const values = []
        selectedOptions.each(function () {
          values.push(jQuery(this).val())
        })
        const result = values.join(",")
        console.log("Multiselect Select values:", result)
        return result
      } else if (fieldType === "Data" && fieldName === "name") {
        // Get selected values from multiselect Data field (name field)
        const getSelectedValues = valueContainer.data("getSelectedValues")
        const result = getSelectedValues ? getSelectedValues() : ""
        console.log("Multiselect Data (name) values:", result)
        return result
      }
    }

    // Standard value handling
    const valueInput = row.find(".value-input")
    const valueInputMin = row.find(".value-input-min")
    const valueInputMax = row.find(".value-input-max")

    if (valueInputMin.length && valueInputMax.length) {
      // For 'between' operator
      const result = {
        min: valueInputMin.val(),
        max: valueInputMax.val(),
      }
      console.log("Between values:", result)
      return result
    } else if (valueInput.length) {
      const result = valueInput.val()
      console.log("Single value:", result)
      return result
    }

    console.log("No value found")
    return null
  }

  // Function to clear all filters
  function clearFilters() {
    filtersContainer.empty()
    filterIndex = 0
    addFilterRow()
  }

  // Function to apply filters
  function applyFilters() {
    console.log("Apply filters clicked")
    const filters = []
    const duplicates = []

    filtersContainer.find(".filter-row").each(function () {
      const row = jQuery(this)
      const targetTypeSelect = row.find(".target-type-select")
      const fieldSelect = row.find(".field-select")
      const operatorSelect = row.find(".operator-select")

      console.log("Processing row:", {
        targetType: targetTypeSelect.val(),
        field: fieldSelect.val(),
        operator: operatorSelect.val(),
      })

      // Handle different value input types
      const value = getValueFromInput(row)
      console.log("Value from input:", value)

      // Only add filter if all fields are selected and value is provided
      if (targetTypeSelect.val() && fieldSelect.val() && operatorSelect.val() && value) {
        const targetTypeOption = targetTypeSelect.find("option:selected")
        const fieldOption = fieldSelect.find("option:selected")
        const operatorOption = operatorSelect.find("option:selected")

        // Check for duplicates in the current set of filters
        const filterData = {
          target_type: targetTypeSelect.val(),
          target_type_label: targetTypeOption.text(),
          field: fieldSelect.val(),
          field_label: fieldOption.text(),
          operator: operatorSelect.val(),
          operator_label: operatorOption.text(),
          value: value,
          field_type: fieldOption.data("type"),
        }

        console.log("Filter data:", filterData)

        // Check if this filter is a duplicate
        let isDuplicate = false
        for (let i = 0; i < filters.length; i++) {
          const existingFilter = filters[i]

          if (
            existingFilter.target_type === filterData.target_type &&
            existingFilter.field === filterData.field &&
            existingFilter.operator === filterData.operator
          ) {
            // For between operator with min/max values
            if (typeof filterData.value === "object" && typeof existingFilter.value === "object") {
              if (
                filterData.value.min === existingFilter.value.min &&
                filterData.value.max === existingFilter.value.max
              ) {
                isDuplicate = true
                break
              }
            }
            // For simple values
            else if (JSON.stringify(filterData.value) === JSON.stringify(existingFilter.value)) {
              isDuplicate = true
              break
            }
          }
        }

        if (isDuplicate) {
          duplicates.push(filterData)
        } else {
          filters.push(filterData)
        }
      }
    })

    console.log("Final filters:", filters)

    // Notify about duplicates if any
    if (duplicates.length > 0) {
      frappe.msgprint(`${duplicates.length} duplicate filter(s) were ignored.`)
    }

    // Add to child table in Frappe
    frm.doc.assignment_conditions = []

    filters.forEach((filter) => {
      const child = frappe.model.add_child(frm.doc, "Assignment Conditions", "assignment_conditions")
      child.target_type = filter.target_type
      child.field_name = filter.field
      child.operator = filter.operator

      // Handle different value formats
      if (typeof filter.value === "object" && filter.value !== null) {
        // For 'between' operator
        child.value = `${filter.value.min}:${filter.value.max}`
      } else {
        // For regular values (including comma-separated multiselect values)
        child.value = filter.value
      }
    })

    frm.refresh_field("assignment_conditions")
    frappe.msgprint(`${filters.length} filter(s) applied successfully`)
    console.log("Filters applied to form")
  }

  // Function to get all doctypes for target type dropdown
  function getAllDoctypes(callback) {
    console.log("Fetching all doctypes...")

    // Try multiple methods to get doctypes
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "DocType",
        fields: ["name", "module"],
        filters: {
          istable: 0,
          issingle: 0,
          custom: 0,
        },
        limit_page_length: 0,
      },
      callback: (r) => {
        console.log("Doctypes response (method 1):", r)
        if (r.message && r.message.length > 0) {
          const options = r.message.map((doctype) => ({
            label: doctype.name,
            value: doctype.name,
          }))
          console.log("Processed doctypes:", options.length)
          callback(options)
        } else {
          // Fallback method
          console.log("Trying fallback method for doctypes...")
          frappe.call({
            method: "frappe.desk.search.search_link",
            args: {
              doctype: "DocType",
              txt: "",
              filters: {
                istable: 0,
                issingle: 0,
              },
            },
            callback: (r2) => {
              console.log("Doctypes response (method 2):", r2)
              if (r2.results) {
                const options = r2.results.map((result) => ({
                  label: result.value,
                  value: result.value,
                }))
                console.log("Processed doctypes (fallback):", options.length)
                callback(options)
              } else {
                console.log("No doctypes found with either method")
                callback([])
              }
            },
          })
        }
      },
    })
  }

  // Get all doctypes then load UI
  getAllDoctypes((doctypes) => {
    console.log("Setting up UI with doctypes:", doctypes.length)
    filterConfig.targetTypes = doctypes

    // Set up event handlers
    addFilterBtn.on("click", () => {
      console.log("Add filter button clicked")
      // Check if there are any incomplete rows before adding a new one
      let hasIncompleteRow = false

      filtersContainer.find(".filter-row").each(function () {
        const row = jQuery(this)
        const targetTypeSelect = row.find(".target-type-select")
        const fieldSelect = row.find(".field-select")
        const operatorSelect = row.find(".operator-select")

        // Get value based on input type
        const value = getValueFromInput(row)
        const hasValue = !!value

        if (!targetTypeSelect.val() || !fieldSelect.val() || !operatorSelect.val() || !hasValue) {
          hasIncompleteRow = true
          return false // Break the each loop
        }
      })

      if (hasIncompleteRow) {
        frappe.msgprint("Please complete the existing filter row before adding a new one.")
      } else {
        addFilterRow()
      }
    })

    clearFiltersBtn.on("click", clearFilters)
    applyFiltersBtn.on("click", applyFilters)

    // Load saved filters if available
    if (frm.doc.assignment_conditions && frm.doc.assignment_conditions.length > 0) {
      console.log("Loading saved conditions:", frm.doc.assignment_conditions.length)
      frm.doc.assignment_conditions.forEach((condition) => {
        addFilterRow()
        const lastIndex = filterIndex - 1
        const row = filtersContainer.find(`.filter-row[data-index="${lastIndex}"]`)

        const targetTypeSelect = row.find(".target-type-select")
        const fieldSelect = row.find(".field-select")
        const operatorSelect = row.find(".operator-select")

        setTimeout(() => {
          targetTypeSelect.val(condition.target_type).trigger("change")

          setTimeout(() => {
            fieldSelect.val(condition.field_name).trigger("change")

            setTimeout(() => {
              operatorSelect.val(condition.operator).trigger("change")

              setTimeout(() => {
                const conditionValue = condition.value

                if (condition.operator === "between" && conditionValue.includes(":")) {
                  const [min, max] = conditionValue.split(":")
                  row.find(".value-input-min").val(min)
                  row.find(".value-input-max").val(max)
                } else {
                  // Handle multiselect values (comma-separated)
                  const fieldType = fieldSelect.find("option:selected").data("type")
                  const fieldName = fieldSelect.find("option:selected").val()
                  const isMultiselect =
                    (["Link", "Select"].includes(fieldType) || (fieldType === "Data" && fieldName === "name")) &&
                    condition.operator === "in"

                  if (isMultiselect) {
                    if (fieldType === "Select") {
                      // Set multiple selected values for Select field
                      const values = conditionValue.split(",")
                      setTimeout(() => {
                        const selectElement = row.find(".multiselect-select")
                        values.forEach((value) => {
                          selectElement.find(`option[value="${value.trim()}"]`).prop("selected", true)
                        })
                      }, 200)
                    }
                    // For Link and Data fields, the multiselect restoration would need custom implementation
                  } else {
                    row.find(".value-input").val(conditionValue)
                  }
                }
              }, 100)
            }, 100)
          }, 100)
        }, 100)
      })
    } else {
      // If no saved filters, show a blank one
      console.log("Adding initial blank filter row")
      addFilterRow()
    }
  })
}

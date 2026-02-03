// Copyright (c) 2026, Prathamesh Jadhav and contributors
// For license information, please see license.txt

frappe.ui.form.on('JD Template', {
    refresh: function (frm) {
        render_custom_interface(frm);
    }
});

function render_custom_interface(frm) {
    // Container for the whole UI
    let wrapper = frm.fields_dict.editor_interface.wrapper;
    $(wrapper).html(''); // Clear previous

    // Custom CSS for the Interface
    let css = `
        <style>
            .jd-builder-container {
                display: flex;
                height: 600px;
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                background: var(--card-bg);
                font-family: var(--font-stack);
                overflow: hidden;
            }
            /* Sidebar */
            .jd-sidebar {
                width: 280px;
                border-right: 1px solid var(--border-color);
                background: var(--bg-color); /* Light grey ish */
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
            }
            .jd-sidebar-header {
                padding: 15px;
                font-weight: 600;
                border-bottom: 1px solid var(--border-color);
                font-size: 14px;
            }
            .jd-sidebar-content {
                overflow-y: auto;
                flex: 1;
                padding: 10px;
            }
            .jd-variable-group {
                margin-bottom: 15px;
            }
            .jd-group-title {
                font-size: 11px;
                text-transform: uppercase;
                color: var(--text-muted);
                margin-bottom: 8px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .jd-variable-item {
                padding: 8px 10px;
                background: var(--control-bg);
                margin-bottom: 5px;
                border-radius: 4px;
                cursor: grab;
                font-size: 13px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 1px solid transparent;
                transition: all 0.2s;
            }
            .jd-variable-item:hover {
                border-color: var(--primary);
                background: var(--fg-hover-color);
            }
            .jd-variable-token {
                font-family: monospace;
                font-size: 10px;
                color: var(--text-muted);
                display: none; /* Hidden visually, used for data */
            }

            /* Editor Area */
            .jd-editor-area {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: white;
                min-height: 400px; /* Force minimum height */
            }
            /* Override Quill Toolbar */
            .ql-toolbar.ql-snow {
                border: none;
                border-bottom: 1px solid var(--border-color);
                background: var(--control-bg);
            }
            .ql-container.ql-snow {
                border: none;
                flex: 1;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                display: flex;
                flex-direction: column;
            }
            .ql-editor {
                flex: 1;
                padding: 20px 40px; /* Paper like padding */
                overflow-y: auto;
            }
        </style>
    `;

    // HTML Structure
    let html = `
        <div class="jd-builder-container">
            <div class="jd-sidebar">
                <div class="jd-sidebar-header">Available Variables</div>
                <div class="jd-sidebar-content" id="jd-sidebar-content">
                    <!-- Content injected via JS -->
                    <div class="text-center text-muted p-2">Loading...</div>
                </div>
            </div>
            <div class="jd-editor-area" id="jd-editor-area">
                <!-- Frame's Text Editor will be moved here -->
            </div>
        </div>
    `;

    $(wrapper).html(css + html);

    // Wait for field to be ready and move it
    const setup_editor = () => {
        let field = frm.fields_dict.template_html;
        if (!field || !field.wrapper) return;

        // Ensure field is visible so it initializes
        $(field.wrapper).show();

        // Move the wrapper into our custom area
        $('#jd-editor-area').append(field.wrapper);

        // Access the Quill instance
        // Frappe's TextEditor control exposes 'quill' property usually
        // We might need to wait for it to initialize if it's lazy
        const check_quill = () => {
            if (field.quill) {
                attach_drop_handler(field.quill);
            } else {
                setTimeout(check_quill, 500);
            }
        };
        check_quill();
    };

    setup_editor();
    load_variables(frm);
}

function attach_drop_handler(quill) {
    if (!quill) return;
    let editor_root = quill.root;

    $(editor_root).on('dragover', (e) => {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'copy';
        $(editor_root).addClass('drag-over');
    });

    $(editor_root).on('dragleave', (e) => {
        $(editor_root).removeClass('drag-over');
    });

    $(editor_root).on('drop', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling
        $(editor_root).removeClass('drag-over');

        let token = e.originalEvent.dataTransfer.getData('text/plain');
        if (!token) return;

        // Ensure editor has focus so we can manipulate selection
        quill.focus();

        let range = null;
        // Attempt to place cursor at drop point
        if (document.caretRangeFromPoint) {
            let nativeRange = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (nativeRange) {
                let selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(nativeRange);
            }
        } else if (document.caretPositionFromPoint) {
            // Firefox support
            let point = document.caretPositionFromPoint(e.clientX, e.clientY);
            if (point) {
                let selection = window.getSelection();
                selection.removeAllRanges();
                let r = document.createRange();
                r.setStart(point.offsetNode, point.offset);
                r.setEnd(point.offsetNode, point.offset);
                selection.addRange(r);
            }
        }

        // Get updated selection from Quill
        range = quill.getSelection();

        if (range) {
            // Insert at the specific point
            quill.insertText(range.index, token);
            // Move cursor to end of inserted token
            quill.setSelection(range.index + token.length);
        } else {
            // Fallback: Append to end if no selection found
            let len = quill.getLength();
            quill.insertText(Math.max(0, len - 1), token);
            quill.setSelection(Math.max(0, len - 1) + token.length);
        }
    });
}

function load_variables(frm) {
    // Define Standard Sections based on User Request
    const sections = {
        "Standard Sections": [
            { label: "Job Title", fieldname: "designation" },
            { label: "Group Company", fieldname: "company" },
            { label: "Designation", fieldname: "designation" },
            { label: "Department", fieldname: "department" },
            { label: "Business Unit", fieldname: "custom_division" },
            { label: "Current Office Location", fieldname: "location" },
            { label: "Sector", fieldname: "sector" },
            { label: "About Company", fieldname: "about_company" }
        ],
        "Education and Experience": [
            { label: "Education", fieldname: "education" },
            { label: "Experience", fieldname: "custom_experience_range_from" }
        ],
        "Competencies": [
            { label: "Competencies", fieldname: "custom_skills" },
            { label: "Skills", fieldname: "custom_skills" }
        ],
        "Additional Attributes": [
            { label: "Posting Date", fieldname: "posting_date" },
            { label: "Closing Date", fieldname: "expected_by" }
        ]
    };

    // Store definitions as requested
    if (frm.fields_dict.variables_json) {
        frm.set_value('variables_json', JSON.stringify(sections, null, 4));
    }

    let html = ``;

    for (const [section, vars] of Object.entries(sections)) {
        html += `<div class="jd-variable-group">
                    <div class="jd-group-title">${section}</div>`;

        vars.forEach(v => {
            // User requested format: {{ doc.fieldname }} (Jinja)
            let variable_token = `{{ doc.${v.fieldname} }}`;

            html += `
                <div class="jd-variable-item" draggable="true" data-token="${variable_token}">
                    <span>${v.label}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Render
    let $sidebar = $(frm.fields_dict.editor_interface.wrapper).find('#jd-sidebar-content');
    if ($sidebar.length) {
        $sidebar.html(html);

        // Attach Drag Start
        $sidebar.find('.jd-variable-item').on('dragstart', function (e) {
            let token = $(this).data('token');
            e.originalEvent.dataTransfer.setData('text/plain', token);
            e.originalEvent.dataTransfer.effectAllowed = 'copy';
        });
    }
}

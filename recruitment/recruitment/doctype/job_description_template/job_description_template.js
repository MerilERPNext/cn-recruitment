frappe.ui.form.on('Job Description Template', {
    refresh(frm) {
        render_jd_form(frm);
    },

    jd_details_add(frm) {
        render_jd_form(frm);
    },

    jd_details_remove(frm) {
        render_jd_form(frm);
    }
});

function render_jd_form(frm) {
    const wrapper = frm.fields_dict.preview?.$wrapper;
    if (!wrapper) return;

    wrapper.empty();
    const rows = frm.doc.jd_details || [];

    if (!rows.length) {
        wrapper.html(`<p class="text-muted">No responsibilities added.</p>`);
        return;
    }

    let html = `
        <style>
            .frappe-jd-group {
                margin-bottom: 18px;
            }

            .frappe-jd-heading {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 6px;
                color: var(--gray-800);
            }

            .frappe-jd-box {
                background-color: var(--control-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: 12px;
            }

            .frappe-jd-box textarea {
                width: 100%;
                border: none;
                resize: vertical;
                font-size: 14px;
                background-color: transparent;
                font-family: inherit;
                line-height: 1.5;
                color: var(--text-color);
            }

            .frappe-jd-box textarea:focus {
                outline: none;
            }
        </style>
    `;

    rows.forEach((row, index) => {
        html += `
            <div class="frappe-jd-group">
                <div class="frappe-jd-heading">${row.label}</div>
                <div class="frappe-jd-box">
                    <textarea rows="4" data-index="${index}">${row.description || ''}</textarea>
                </div>
            </div>
        `;
    });

    wrapper.html(html);

    // Bind textarea input
    wrapper.find('textarea').on('input', function () {
        const i = $(this).data('index');
        frm.doc.jd_details[i].description = $(this).val();
        frm.dirty();
    });
}

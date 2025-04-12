frappe.ui.form.on('Exit Interview Record', {
    exit_interview_template: function (frm) {
        if (!frm.doc.exit_interview_template) {
            frm.set_value('exit_interview_table', []);
            frm.refresh_field('exit_interview_table');

            const wrapper = frm.fields_dict.form?.$wrapper;
            if (wrapper) wrapper.empty();

            return;
        }

        frappe.db.get_doc('Exit Interview Template', frm.doc.exit_interview_template).then(template => {
            if (!template || !template.questionaire) return;

            frm.set_value('exit_interview_table', []);
            frm.refresh_field('exit_interview_table');

            const wrapper = frm.fields_dict.form?.$wrapper;
            if (wrapper) wrapper.empty();

            template.questionaire.forEach(row => {
                const newRow = frm.add_child('exit_interview_table');
                newRow.label = row.label;
                newRow.type = row.type;
                newRow.options = row.options;
                newRow.is_collapsible = row.is_collapsible;
                newRow.data = row.data;
                newRow.mandatory = row.mandatory; 
            });

            frm.refresh_field('exit_interview_table');
            render_exit_form(frm);
        });
    },

    refresh: function (frm) {
        render_exit_form(frm);
    },

    validate: function (frm) {
        if (!frm.doc.exit_interview_table || frm.doc.exit_interview_table.length === 0) {
            frm.fields_dict.form.$wrapper.empty();
        }

        // ✅ throw if mandatory fields are missing
        let missing_fields = [];

        (frm.doc.exit_interview_table || []).forEach(row => {
            if (row.mandatory && !row.data) {
                missing_fields.push(row.label);
            }
        });

        if (missing_fields.length) {
            frappe.throw(__('Please fill the following mandatory fields:<br><ul><li>' + missing_fields.join('</li><li>') + '</li></ul>'));
        }
    }
});

function render_exit_form(frm) {
    const wrapper = frm.fields_dict.form?.$wrapper;
    if (!wrapper) return;

    wrapper.empty();
    const rows = frm.doc.exit_interview_table || [];

    if (!rows.length) {
        wrapper.html(`<p style="color: #999;">No questions to show.</p>`);
        return;
    }

    let html = `
        <style>
            .eit-section {
                background: #eef2ff;
                padding: 10px 14px;
                margin: 20px 0 10px;
                font-size: 16px;
                font-weight: 600;
                border-left: 4px solid #6366f1;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .eit-collapsible-content.hidden {
                display: none;
            }

            .eit-question {
                margin: 12px 0;
            }

            .eit-question label {
                font-weight: 500;
                display: block;
                margin-bottom: 4px;
            }

            .eit-question input[type="text"],
            .eit-question select {
                width: 60%;
                padding: 6px 10px;
                border: 1px solid #d1d5db;
                border-radius: 5px;
                font-size: 14px;
                background-color: #fff;
            }

            .eit-question input[type="range"] {
                width: 60%;
            }

            .eit-rating-meta {
                font-size: 13px;
                margin-top: 4px;
                color: #555;
            }

            .eit-toggle {
                cursor: pointer;
                font-size: 16px;
                background: none;
                border: none;
                color: #6366f1;
                transform: rotate(0deg);
                transition: transform 0.3s ease;
            }

            .eit-toggle.collapsed {
                transform: rotate(90deg);
            }

            .reqd {
                color: red;
                font-weight: bold;
            }
        </style>
    `;

    let openSection = false;

    rows.forEach((row, index) => {
        const value = row.data || '';
        const isMandatory = row.mandatory;

        if (row.type === "Section") {
            if (openSection) html += `</div>`;
            openSection = false;

            if (row.is_collapsible) {
                const sectionId = `section_${index}`;
                html += `
                    <div class="eit-section">
                        ${row.label}
                        <button class="eit-toggle collapsed" onclick="document.getElementById('${sectionId}').classList.toggle('hidden'); this.classList.toggle('collapsed')">▶</button>
                    </div>
                    <div id="${sectionId}" class="eit-collapsible-content hidden">
                `;
                openSection = true;
            } else {
                html += `<div class="eit-section">${row.label}</div>`;
            }
        } else {
            let fieldHtml = '';

            if (row.type === "Data") {
                fieldHtml = `
                    <div class="eit-question">
                        <label>${row.label}${isMandatory ? ' <span class="reqd">*</span>' : ''}</label>
                        <input type="text" data-index="${index}" class="exit-data" value="${value}" style="${isMandatory && !value ? 'border: 1px solid red;' : ''}" />
                    </div>
                `;
            } else if (row.type === "Rating") {
                let min = 1, max = 10;
                if (row.options?.includes('-')) {
                    const parts = row.options.split('-');
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        min = parseInt(parts[0].trim());
                        max = parseInt(parts[1].trim());
                    }
                }
                const sliderVal = value || min;
                const valueId = `slider_value_${index}`;
                fieldHtml = `
                    <div class="eit-question">
                        <label>${row.label}${isMandatory ? ' <span class="reqd">*</span>' : ''}</label>
                        <input type="range" min="${min}" max="${max}" value="${sliderVal}" data-index="${index}" class="exit-slider" style="${isMandatory && !value ? 'border: 1px solid red;' : ''}" />
                        <div class="eit-rating-meta">
                            Selected: <span id="${valueId}">${sliderVal}</span> (${min} to ${max})
                        </div>
                    </div>
                `;
            } else if (row.type === "Select" && row.options) {
                const options = row.options.split('\n').map(opt => {
                    const selected = opt.trim() === value ? 'selected' : '';
                    return `<option value="${opt.trim()}" ${selected}>${opt.trim()}</option>`;
                }).join('');
                fieldHtml = `
                    <div class="eit-question">
                        <label>${row.label}${isMandatory ? ' <span class="reqd">*</span>' : ''}</label>
                        <select data-index="${index}" class="exit-select" style="${isMandatory && !value ? 'border: 1px solid red;' : ''}">${options}</select>
                    </div>
                `;
            }

            html += fieldHtml;
        }
    });

    if (openSection) html += `</div>`;
    wrapper.html(html);

    wrapper.find('.exit-data').on('input', function () {
        const index = $(this).data('index');
        frm.doc.exit_interview_table[index].data = $(this).val();
        frm.dirty();
    });

    wrapper.find('.exit-select').on('change', function () {
        const index = $(this).data('index');
        frm.doc.exit_interview_table[index].data = $(this).val();
        frm.dirty();
    });

    wrapper.find('.exit-slider').on('input', function () {
        const index = $(this).data('index');
        const val = $(this).val();
        frm.doc.exit_interview_table[index].data = val;
        $(this).next('.eit-rating-meta').find('span').text(val);
        frm.dirty();
    });
}

frappe.ui.form.on("Exit Interview Record", {
	onload: function (frm) {
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Employee",
				filters: { user_id: frappe.session.user },
				fields: ["name"]
			},
			callback: function (r) {
				if (r.message && r.message.length > 0) {
					let emp = r.message[0];
					if (!frm.doc.employee_code) {
						frm.set_value("employee_code", emp.name);
					}
				}
			}
		});
	},

	employee_code: function (frm) {
		if (frm.doc.employee_code) {
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Employee",
					name: frm.doc.employee_code
				},
				callback: function (r) {
					if (r.message) {
						let emp = r.message;
						frm.set_value("employee_name", emp.employee_name);
						frm.set_value("designation", emp.designation);
						frm.set_value("email_id", emp.user_id);
						frm.set_value("department", emp.department);
					}
				}
			});
		}
	}
});

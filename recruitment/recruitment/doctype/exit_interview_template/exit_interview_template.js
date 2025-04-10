frappe.ui.form.on('Exit Interview Template', {
    refresh: function(frm) {
        setTimeout(() => {
            const wrapper = frm.fields_dict.preview?.$wrapper;
            if (!wrapper) return;

            wrapper.empty();

            frappe.db.get_doc('Exit Interview Template', frm.doc.name).then(doc => {
                const rows = doc.questionaire || [];
                if (Array.isArray(rows) && rows.length > 0) {
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
                        </style>
                    `;

                    let openSection = false;

                    rows.forEach((row, index) => {
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
                                        <label>${row.label}</label>
                                        <input type="text" />
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
                                const sliderId = `slider_${index}`;
                                const valueId = `slider_value_${index}`;
                                fieldHtml = `
                                    <div class="eit-question">
                                        <label>${row.label}</label>
                                        <input type="range" id="${sliderId}" min="${min}" max="${max}" value="${min}"
                                            oninput="document.getElementById('${valueId}').innerText = this.value" />
                                        <div class="eit-rating-meta">
                                            Selected: <span id="${valueId}">${min}</span> (${min} to ${max})
                                        </div>
                                    </div>
                                `;
                            } else if (row.type === "Select" && row.options) {
                                const options = row.options.split('\n').map(opt => `<option value="${opt.trim()}">${opt.trim()}</option>`).join('');
                                fieldHtml = `
                                    <div class="eit-question">
                                        <label>${row.label}</label>
                                        <select>${options}</select>
                                    </div>
                                `;
                            }

                            html += fieldHtml;
                        }
                    });

                    if (openSection) html += `</div>`;
                    wrapper.html(html);
                } else {
                    wrapper.html(`<p style="color: #999;">No questionaire data to render.</p>`);
                }
            });
        }, 300);
    }
});

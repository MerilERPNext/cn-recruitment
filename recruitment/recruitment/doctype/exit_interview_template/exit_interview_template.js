frappe.ui.form.on('Exit Interview Template', {
    refresh: function(frm) {
        frm.fields_dict.preview.$wrapper.empty();

        if (Array.isArray(frm.doc.questionaire) && frm.doc.questionaire.length > 0) {
            let html = '';

            frm.doc.questionaire.forEach((row, index) => {
                if (row.type === "Section") {
                    html += `<h3 style="margin-top: 20px;">${row.label}</h3>`;
                } else if (row.type === "Data") {
                    html += `
                        <div style="margin-bottom: 15px;">
                            <label>${row.label}</label><br>
                            <input type="text" style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px;" />
                        </div>
                    `;
                } else if (row.type === "Rating") {
                    html += `
                        <div style="margin-bottom: 15px;">
                            <label>${row.label}</label><br>
                            <input type="range" min="1" max="10" value="5" />
                            <span>1</span> to <span>10</span>
                        </div>
                    `;
                }
            });

            frm.fields_dict.preview.$wrapper.html(html);
        }
    }
});

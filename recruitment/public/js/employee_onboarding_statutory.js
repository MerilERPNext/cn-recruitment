// Adds a "Statutory Forms" button group to Employee Onboarding so HR can
// generate / regenerate the PF Form 11 and Gratuity Nomination on demand.
//
// The buttons appear only when
// `Onboarding Settings.enable_statutory_forms_button` is checked. HR can
// toggle the doctype from the Desk to hide them globally without code
// changes.
//
// Each action runs server-side, autofills the dedicated form doctype from
// the onboarding's portal data, renders the print format to PDF, attaches
// it to the form record, and mirrors the PDF URL onto Employee
// Onboarding's existing `custom_pf_form` / `custom_gratuity_form` fields
// under the Statutory tab..

frappe.ui.form.on("Employee Onboarding", {
    async refresh(frm) {
        if (frm.is_new()) return;

        const enabled = await frappe.db.get_single_value(
            "Onboarding Settings",
            "enable_statutory_forms_button"
        );
        if (!enabled) return;

        const group = __("Statutory Forms");

        frm.add_custom_button(
            __("Generate / Regenerate All"),
            () => runGenerator(frm, "generate_all"),
            group
        );

        frm.add_custom_button(
            __("PF Form 11 Only"),
            () => runGenerator(frm, "generate_pf_form_11"),
            group
        );

        frm.add_custom_button(
            __("Gratuity Nomination Only"),
            () => runGenerator(frm, "generate_gratuity_nomination"),
            group
        );
    },
});

function runGenerator(frm, method) {
    frappe.confirm(
        __("Generate statutory form(s) from this onboarding's current data? Existing PDFs will be overwritten unless the form is Signed or Filed."),
        () => {
            frappe.call({
                method: `recruitment.recruitment.statutory_forms.${method}`,
                args: { onboarding_name: frm.doc.name, force: true },
                freeze: true,
                freeze_message: __("Generating statutory forms..."),
                callback: (r) => {
                    const result = r.message || {};
                    let html;

                    if (method === "generate_all") {
                        const pf = result.pf_form_11 || {};
                        const gr = result.gratuity_nomination || {};
                        html = `
                            <p><b>PF Form 11:</b> ${formatLine(pf)}</p>
                            <p><b>Gratuity Nomination:</b> ${formatLine(gr)}</p>
                        `;
                    } else {
                        html = `<p>${formatLine(result)}</p>`;
                    }

                    frappe.msgprint({
                        title: __("Statutory Forms"),
                        message: html,
                        indicator: "green",
                    });
                    frm.reload_doc();
                },
            });
        }
    );
}

function formatLine(result) {
    if (!result || !result.name) return __("No result returned");
    if (result.skipped) {
        return `${result.name} — ${frappe.utils.escape_html(result.message || "Skipped")}`;
    }
    const pdf = result.pdf_url
        ? ` &middot; <a href="${result.pdf_url}" target="_blank">${__("Open PDF")}</a>`
        : "";
    return `${result.name} — ${result.status}${pdf}`;
}

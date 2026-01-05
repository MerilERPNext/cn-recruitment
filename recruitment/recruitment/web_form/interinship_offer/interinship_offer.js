frappe.ready(function () {

    // Hide Submit, Discard, and "Not Saved"
    $(".web-form-actions").hide();
    $(".indicator-pill").hide();

    // Get ID from URL
    const params = new URLSearchParams(window.location.search);
    const internship_id = params.get("id");

    if (!internship_id) {
        frappe.msgprint("Invalid internship offer link.");
        return;
    }

    // Fetch Internship Offer via custom API
    frappe.call({
        method: "recruitment.recruitment.web_form.interinship_offer.interinship_offer.get_internship_offer",
        args: {
            docname: internship_id
        },
        freeze: true,
        callback: function (r) {
            if (!r.message) {
                frappe.msgprint("Internship offer not found.");
                return;
            }
            populate_form(r.message);
            add_action_buttons(r.message);
        }
    });

    // Populate fields
    function populate_form(doc) {
        Object.keys(doc).forEach(fieldname => {
            if (frappe.web_form.fields_dict[fieldname]) {
                frappe.web_form.set_value(fieldname, doc[fieldname]);
            }
        });

        // Make everything read-only
        $("input, textarea, select").prop("disabled", true);
    }

    // Add Accept / Reject buttons
    function add_action_buttons(doc) {

        if (["Accepted", "Rejected"].includes(doc.status)) {
            return;
        }

        const action_bar = $(`
            <div style="margin-bottom:15px;">
                <button class="btn btn-success" id="accept_btn">
                    Accept
                </button>
                <button class="btn btn-danger" id="reject_btn" style="margin-left:10px;">
                    Reject
                </button>
            </div>
        `);

        $(".web-form-title").after(action_bar);

        $("#accept_btn").click(() => update_status("Accepted"));
        $("#reject_btn").click(() => update_status("Rejected"));
    }

    // Update status API
   function update_status(status) {
    frappe.call({
        method: "recruitment.recruitment.web_form.interinship_offer.interinship_offer.update_status_from_web",
        args: {
            docname: internship_id,
            status: status
        },
        freeze: true,
        callback: function () {

            if (status === "Accepted") {
                window.location.href = "/intern_accept";
            } else if (status === "Rejected") {
                window.location.href = "/intern_reject";
            }
        }
    });
}


});

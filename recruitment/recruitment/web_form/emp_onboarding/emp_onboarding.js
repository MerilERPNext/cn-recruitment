/**********************************************************
 * EMP ONBOARDING – CLEAN WEB FORM SCRIPT
 * Compatible with Frappe v14 / v15
 **********************************************************/

frappe.ready(function () {

    console.log("Emp Onboarding Web Form Loaded");

    /**********************************************************
     * BASIC UI CLEANUP
     **********************************************************/
    document.title = "Onboarding Form";
    $(".navbar, .web-footer").remove();

    // Function to update title (runs multiple times to override any dynamic changes)
    function updateTitle() {
        $('.web-form-title').text("Onboarding Form");
        $('.page-title h3').text("Onboarding Form");
        $('.page-title h1').text("Onboarding Form");
        $('h3').each(function() {
            const text = $(this).text();
            if (text.includes("KG") || text.includes("Staff") || text.includes("Professional") || text.includes("Welcome") || text.includes("Incubyte") || text.includes("Proffessional")) {
                $(this).text("Onboarding Form");
            }
        });
        $('h1').each(function() {
            const text = $(this).text();
            if (text.includes("KG") || text.includes("Staff") || text.includes("Professional") || text.includes("Welcome") || text.includes("Incubyte") || text.includes("Proffessional")) {
                $(this).text("Onboarding Form");
            }
        });
        $('.web-form-title, .page-title h3, .page-title h1').css({
            'font-weight': 'bold',
            'font-size': '32px'
        });
    }

    updateTitle();
    setTimeout(updateTitle, 100);
    setTimeout(updateTitle, 300);
    setTimeout(updateTitle, 800);
    setTimeout(updateTitle, 1500);

    /**********************************************************
     * HELPER: Set read-only field value
     * set_value() silently fails on read-only fields,
     * so we set the doc model directly + update DOM display.
     **********************************************************/
    function setReadOnlyField(fieldname, value) {
        if (!value) return;
        frappe.web_form.doc[fieldname] = value;
        const $wrapper = $(`[data-fieldname="${fieldname}"]`);
        // Update read-only display text
        $wrapper.find(".control-value, .like-disabled-input").text(value);
        // Also update any input element that may exist
        $wrapper.find("input").val(value);
    }

    /**********************************************************
     * INITIATE ONBOARDING DATA (FROM URL)
     **********************************************************/
    const params = new URLSearchParams(window.location.search);
    const initiate_id = params.get("initiate_onboarding_id");

    if (initiate_id) {
        frappe.call({
            method: "dah_customization.dah_customization.doctype.initiate_onboarding.initiate_onboarding.get_initiate_onboarding_data",
            args: { initiate_onboarding_id: initiate_id },
            callback(r) {
                if (!r.message?.found) return;

                const d = r.message;

                setTimeout(() => {
                    // custom_initiate_onboarding_id is read-only -> set in doc model + DOM
                    setReadOnlyField("custom_initiate_onboarding_id", initiate_id);

                    // designation is read-only Link -> set in doc model + DOM
                    setReadOnlyField("designation", d.designation);

                    // company is editable -> set_value works
                    frappe.web_form.set_value("company", d.company);

                    // department is hidden -> set in doc model only
                    if (d.department) {
                        frappe.web_form.doc.department = d.department;
                    }
                }, 500);
            }
        });
    }

    /**********************************************************
     * PREVIOUSLY EMPLOYED -> CONDITIONAL REQUIRED FIELD
     **********************************************************/
    frappe.web_form.on("custom_previously_employed", (f, v) => {
        frappe.web_form.set_df_property(
            "custom_last_3_months_salary_slip",
            "reqd",
            v === "Experienced" ? 1 : 0
        );
    });

    /**********************************************************
     * AADHAAR & PAN VERIFICATION REFERENCE URL
     **********************************************************/
    (function () {
        let urlInserted = false;

        function insertUrlAboveAadhaarLabel() {
            if (urlInserted || document.querySelector('.custom-dummy-url')) return;

            const field = document.querySelector('[data-fieldname="custom_aadhar_card_number"]');
            if (!field) return;

            const label = field.querySelector('label');
            if (!label) return;

            const urlDiv = document.createElement('div');
            urlDiv.className = 'custom-dummy-url';
            urlDiv.style.cssText = `
                margin-bottom: 6px;
                padding: 8px 10px;
                background: #f8f9fa;
                border-left: 3px solid #007bff;
                border-radius: 4px;
                font-size: 13px;
            `;
            urlDiv.innerHTML = `
                <strong>Reference:</strong>
                <a href="https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status"
                   target="_blank"
                   style="color:#007bff; text-decoration:none;">
                    Click here for Aadhaar &amp; PAN Verification
                </a>
            `;

            label.parentNode.insertBefore(urlDiv, label);
            urlInserted = true;
        }

        let attempts = 0;
        const interval = setInterval(() => {
            insertUrlAboveAadhaarLabel();
            attempts++;
            if (urlInserted || attempts > 20) clearInterval(interval);
        }, 300);
    })();

    /**********************************************************
     * ITS FETCH WITH DEBOUNCE
     **********************************************************/
    let its_timer = null;
    let last_its = null;

    frappe.web_form.on("custom_its_id", () => {
        const its = frappe.web_form.get_value("custom_its_id");

        if (!its || its.length < 3 || its === last_its) return;

        clearTimeout(its_timer);
        its_timer = setTimeout(() => {
            last_its = its;

            frappe.call({
                method: "recruitment.recruitment.web_form.employee_onboarding.employee_onboarding.fetch_employee_data_by_its_id",
                args: { its_id: its },
                freeze: true,
                freeze_message: "Fetching ITS data...",
                callback(r) {
                    if (!r.message?.success) {
                        frappe.msgprint(r.message?.error || "ITS data not found");
                        return;
                    }

                    const d = r.message;

                    frappe.web_form.set_value("employee_name", d.employee_name);
                    frappe.web_form.set_value("custom_email_id", d.custom_email_id);
                    frappe.web_form.set_value("custom_primary_mobile_number", d.custom_primary_mobile_number);
                    frappe.web_form.set_value("custom_whatsapp_number", d.custom_whatsapp_number);
                    frappe.web_form.set_value("custom_farig_year", d.custom_farig_year);
                    frappe.web_form.set_value("custom_farig_darajah", d.custom_farig_darajah);
                }
            });
        }, 700);
    });

    /**********************************************************
     * EXTRA VALIDATIONS (RUNS ON SAVE)
     **********************************************************/
    frappe.web_form.validate = function () {

        const v = frappe.web_form.doc;

        // Bank Account
        if (v.custom_bank_account_no &&
            !/^[0-9]{9,18}$/.test(v.custom_bank_account_no)) {
            frappe.msgprint("Bank account must be 9-18 digits");
            return false;
        }

        // IFSC
        if (v.custom_ifsc_code &&
            !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.custom_ifsc_code)) {
            frappe.msgprint("Invalid IFSC Code");
            return false;
        }

        // Aadhaar
        if (v.custom_aadhar_card_number &&
            (!/^\d{12}$/.test(v.custom_aadhar_card_number) ||
             v.custom_aadhar_card_number.startsWith("0") ||
             v.custom_aadhar_card_number.startsWith("1"))) {
            frappe.msgprint("Invalid Aadhaar Number");
            return false;
        }

        // PAN
        if (v.custom_pan_card_number &&
            !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.custom_pan_card_number)) {
            frappe.msgprint("Invalid PAN Number");
            return false;
        }

        return true;
    };

    /**********************************************************
     * SAVE BUTTON OVERRIDE
     *
     * Frappe's default save calls web_form.accept which tries
     * to create Employee Onboarding directly — that fails
     * because job_applicant & job_offer are mandatory.
     *
     * Override: Creates Job Applicant -> Job Offer -> Employee
     * Onboarding (all 3 records) via our backend function.
     **********************************************************/
    frappe.web_form.save = function () {

        if (frappe.web_form.validate && frappe.web_form.validate() === false) {
            return false;
        }

        const v = frappe.web_form.doc;

        frappe.call({
            method: "recruitment.recruitment.web_form.employee_onboarding.employee_onboarding.create_job_applicant_and_offer",
            freeze: true,
            freeze_message: "Submitting Employee Onboarding...",
            args: {
                email: v.custom_email_id,
                first_name: v.employee_name,
                designation: v.designation,
                web_form_data: JSON.stringify(v)
            },
            callback(r) {
                if (!r.message?.success) {
                    frappe.msgprint(r.message?.message || "Failed to create onboarding");
                    return;
                }

                $(".web-form-container").html(`
                    <div style="text-align:center; padding:80px">
                        <i class="fa fa-check-circle" style="font-size:80px;color:#28a745"></i>
                        <h2>Submitted Successfully</h2>
                        <p>Thank you! Your onboarding request has been received.</p>
                    </div>
                `);
            }
        });

        return false;
    };

    // Backup: Rebind the form submit event for Save button
    setTimeout(() => {
        $(".web-form").off("submit").on("submit", function (e) {
            e.preventDefault();
            frappe.web_form.save();
            return false;
        });
    }, 500);

});

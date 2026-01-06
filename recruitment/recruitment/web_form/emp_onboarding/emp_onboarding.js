// INJECT CSS IMMEDIATELY - Before anything else loads
if (!document.getElementById('override-title-css')) {
    const style = document.createElement('style');
    style.id = 'override-title-css';
    style.innerHTML = `
        /* Completely hide original title text */
        .web-form-title, .page-title h3, .page-title h1 {
            visibility: hidden !important;
            position: relative !important;
            font-weight: bold !important;
            height: 40px !important;
            margin-bottom: 20px !important;
        }
        /* Show only the replacement text */
        .web-form-title::before, .page-title h3::before, .page-title h1::before {
            content: "Onboarding Form" !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            font-size: 32px !important;
            font-weight: bold !important;
            color: #000 !important;
        }
    `;
    document.head.appendChild(style);
}

frappe.ready(function () {
    console.log("✅ Web Form Script Loaded");

    const wait = setInterval(() => {
        if (window.frappe && frappe.web_form) {
            clearInterval(wait);
            console.log("✅ frappe.web_form ready");
            initWebForm();
        }
    }, 300);

    function initWebForm() {

        // Set custom page title
        document.title = "Onboarding Form";

        // Function to update title (runs multiple times to override any dynamic changes)
        function updateTitle() {
            // Target all possible title elements and update text
            $('.web-form-title').text("Onboarding Form");
            $('.page-title h3').text("Onboarding Form");
            $('.page-title h1').text("Onboarding Form");
            $('h3').each(function() {
                const text = $(this).text();
                if (text.includes("KG") || text.includes("Staff") || text.includes("Professional") || text.includes("Emp") || text.includes("Employee") || text.includes("Welcome") || text.includes("Incubyte") || text.includes("Proffessional")) {
                    $(this).text("Onboarding Form");
                }
            });
            $('h1').each(function() {
                const text = $(this).text();
                if (text.includes("KG") || text.includes("Staff") || text.includes("Professional") || text.includes("Emp") || text.includes("Employee") || text.includes("Welcome") || text.includes("Incubyte") || text.includes("Proffessional")) {
                    $(this).text("Onboarding Form");
                }
            });

            // Make title bold and bigger (CSS already handles this, but reinforce it)
            $('.web-form-title, .page-title h3, .page-title h1').css({
                'font-weight': 'bold',
                'font-size': '32px'
            });
        }

        // Update title multiple times to ensure it sticks
        updateTitle();
        setTimeout(updateTitle, 100);
        setTimeout(updateTitle, 300);
        setTimeout(updateTitle, 800);
        setTimeout(updateTitle, 1500);

        console.log("✅ Page title set to: Onboarding Form (bold & big)");

        $(".navbar, .web-footer").remove();

        // Add debug function to window for manual field inspection
        window.debugWebForm = function() {
            console.log("=".repeat(80));
            console.log("DEBUG: All fields in DOM:");
            let allFields = [];
            $('[data-fieldname]').each(function() {
                const fname = $(this).attr('data-fieldname');
                const visible = $(this).is(':visible');
                const height = $(this).height();
                allFields.push({ name: fname, visible: visible, height: height });
            });
            console.table(allFields);

            console.log("\nVISIBLE fields only:");
            let visibleFields = allFields.filter(f => f.visible && f.height > 0);
            console.log(visibleFields.map(f => f.name));

            console.log("\nFramework info:");
            console.log("frappe.web_form exists:", !!frappe.web_form);
            if (frappe.web_form) {
                console.log("frappe.web_form.page_number:", frappe.web_form.page_number);
                console.log("frappe.web_form keys:", Object.keys(frappe.web_form));
            }
            console.log("=".repeat(80));
        };
        console.log("💡 Debug function added! Run 'debugWebForm()' in console to see all fields.");

        // Inject CSS into <head> IMMEDIATELY (for button control and review page)
        if (!$('#webform-custom-styles').length) {
            $('head').append(`
                <style id="webform-custom-styles">
                    /* Force hide Next button on Page 4 */
                    body.on-page-4 .web-form-actions .btn-next,
                    body.on-page-4 .web-form-actions button.btn-primary {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                    /* Review page styles */
                    .review-row {
                        padding: 10px 0;
                        border-bottom: 1px solid #e0e0e0;
                        font-size: 15px;
                    }
                    .review-row:last-child {
                        border-bottom: none;
                    }
                    .review-row strong {
                        color: #555;
                        margin-right: 10px;
                    }
                </style>
            `);
            console.log("✅ Custom CSS injected into <head>");
        }

        /* ======================================================
           FETCH INITIATE ONBOARDING (SAFE + DELAYED)
        ====================================================== */

        const params = new URLSearchParams(window.location.search);
        const initiate_id = params.get("initiate_onboarding_id");
        const employee_onboarding_id = params.get("name") || params.get("employee_onboarding_id");

        // Check if we're editing an existing Employee Onboarding document
        if (employee_onboarding_id) {
            console.log("📝 Editing existing Employee Onboarding:", employee_onboarding_id);
            loadSavedData(employee_onboarding_id);
        }
        // Otherwise, check if we're creating from Initiate Onboarding
        else if (initiate_id) {
            console.log("🚀 Fetching Initiate Onboarding:", initiate_id);

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Initiate Onboarding",
                    name: initiate_id
                },
                callback(r) {
                    if (!r.message) {
                        console.warn("❌ No Initiate Onboarding data");
                        return;
                    }

                    const d = r.message;
                    console.log("✅ Initiate Data:", d);

                    // 🔥 WAIT until fields exist - increased delay
                    setTimeout(() => {
                        safeSet("custom_initiate_onboarding_id", d.name);
                        safeSet("department", d.department);
                        safeSet("designation", d.designation);
                        // safeSet("employee_grade", d.employee_grade);
                        safeSet("company", d.company);
                    console.log("✅ All Initiate fields set");
                    }, 2000);
                }
            });
        }

        function safeSet(field, value) {
            // ENHANCED LOGGING FOR MOBILE/WHATSAPP
            const isMobileOrWhatsapp = field === 'custom_primary_mobile_number' || field === 'custom_whatsapp_number';
            if (isMobileOrWhatsapp) {
                console.log("=" + "=".repeat(80));
                console.log(`🔍 ENHANCED DEBUG for ${field}`);
                console.log(`  Value received:`, value);
                console.log(`  Value type:`, typeof value);
                console.log(`  Value length:`, value ? value.toString().length : 0);
                console.log("=" + "=".repeat(80));
            }

            if (!value) {
                console.warn(`⚠️ Empty value for: ${field}`);
                if (isMobileOrWhatsapp) {
                    console.error(`❌ ${field} has empty/null value! This is the problem!`);
                }
                return;
            }

            try {
                console.log(`🔧 Setting ${field} to:`, value);

                const field_obj = frappe.web_form.fields_dict[field];
                if (!field_obj) {
                    console.warn(`  → Field object NOT found in fields_dict for ${field}`);
                    if (isMobileOrWhatsapp) {
                        console.error(`❌ ${field} field object NOT FOUND! Available fields:`, Object.keys(frappe.web_form.fields_dict).filter(f => f.includes('mobile') || f.includes('whatsapp')));
                    }
                    return;
                }

                console.log(`  → Field object found for ${field}, type: ${field_obj.df?.fieldtype}`);
                if (isMobileOrWhatsapp) {
                    console.log(`  → Field details:`, field_obj.df);
                }

                // Check if field is read-only
                const isReadOnly = field_obj.df?.read_only === 1;
                console.log(`  → Read-only: ${isReadOnly}`);

                // Special handling for Link fields (they use awesomplete/autocomplete)
                if (field_obj.df?.fieldtype === 'Link') {
                    console.log(`  → Handling as Link field`);

                    // For read-only Link fields, temporarily make editable, set value, then make read-only again
                    if (isReadOnly) {
                        console.log(`  → Temporarily disabling read-only to set value`);

                        // Step 1: Make field editable
                        frappe.web_form.set_df_property(field, "read_only", 0);

                        // Step 2: Wait a bit for field to re-render as editable
                        setTimeout(() => {
                            // Step 3: Set the value using standard Frappe method
                            frappe.web_form.set_value(field, value).then(() => {
                                console.log(`  → Value set, re-enabling read-only`);

                                // Step 4: Make field read-only again
                                setTimeout(() => {
                                    frappe.web_form.set_df_property(field, "read_only", 1);
                                    console.log(`  → Read-only Link field value set and locked`);
                                }, 100);
                            });
                        }, 200);
                    } else {
                        // For editable Link fields
                        // Method 1: Set via awesomplete if available
                        if (field_obj.awesomplete) {
                            field_obj.awesomplete.list = [value];
                            field_obj.awesomplete.input.value = value;
                        }

                        // Method 2: Set the value and last_value directly
                        if (field_obj.$input && field_obj.$input.length) {
                            field_obj.$input.val(value);
                            field_obj.last_value = value;
                            field_obj.value = value;
                        }

                        // Method 3: Set via set_model_value to bypass validation
                        if (field_obj.set_model_value) {
                            field_obj.set_model_value(value);
                        }

                        // Method 4: Direct DOM and model update
                        const $wrapper = $(`[data-fieldname="${field}"]`);
                        const $input = $wrapper.find('input').first();
                        if ($input.length) {
                            $input.val(value);
                            $input.attr('data-value', value);
                        }

                        console.log(`  → Editable Link field set via awesomplete bypass`);
                    }
                } else {
                    // For non-Link fields (Data, Phone, etc.)

                    if (isReadOnly) {
                        // For read-only non-Link fields
                        // Set in the model
                        frappe.web_form.doc[field] = value;
                        field_obj.value = value;

                        // Update the read-only display wrapper
                        const $wrapper = $(`[data-fieldname="${field}"]`);
                        const $control = $wrapper.find('.control-value');
                        if ($control.length) {
                            $control.html(value);
                        }

                        // Also try updating any input that might be there
                        const $input = $wrapper.find('input, select, textarea').first();
                        if ($input.length) {
                            $input.val(value);
                        }

                        console.log(`  → Read-only field value set in model and display`);
                    } else {
                        // For editable non-Link fields, use standard methods

                        // Method 1: Standard Frappe API
                        frappe.web_form.set_value(field, value);

                        // Method 2: Set via set_input if available
                        if (field_obj.set_input) {
                            field_obj.set_input(value);
                        }

                        // Method 3: Set via $input if available
                        if (field_obj.$input && field_obj.$input.length) {
                            field_obj.$input.val(value).trigger('change').trigger('input');
                        }

                        // Method 4: Refresh the field
                        if (field_obj.refresh) {
                            field_obj.refresh();
                        }

                        // Method 5: jQuery DOM fallback
                        const $wrapper = $(`[data-fieldname="${field}"]`);
                        if ($wrapper.length) {
                            const $input = $wrapper.find('input, select, textarea').first();
                            if ($input.length) {
                                $input.val(value).trigger('change').trigger('input').trigger('blur');
                                console.log(`  → jQuery set for ${field}`);
                            }
                        }
                    }
                }

                console.log(`✅ Set ${field} complete`);

                // VERIFY VALUE WAS SET (for mobile/whatsapp)
                if (isMobileOrWhatsapp) {
                    setTimeout(() => {
                        const currentValue = frappe.web_form.get_value(field);
                        console.log(`🔍 VERIFICATION for ${field}:`);
                        console.log(`  → Value in model:`, currentValue);
                        console.log(`  → Value in DOM:`, $(`[data-fieldname="${field}"] input`).val());
                        if (!currentValue || currentValue !== value) {
                            console.error(`❌ ${field} was NOT set correctly! Expected: ${value}, Got: ${currentValue}`);
                        } else {
                            console.log(`✅ ${field} verified successfully!`);
                        }
                    }, 200);
                }
            } catch (err) {
                console.error(`❌ Error setting ${field}:`, err);
                if (isMobileOrWhatsapp) {
                    console.error(`❌ CRITICAL ERROR setting ${field}:`, err.stack);
                }
            }
        }

        /* ======================================================
           READ ONLY
        ====================================================== */
        if (frappe.web_form.get_field("boarding_begins_on")) {
            frappe.web_form.set_df_property("boarding_begins_on", "read_only", 1);
        }

        /* ======================================================
           ADD DUMMY URL ABOVE AADHAAR NUMBER
        ====================================================== */
        (function () {
            let urlInserted = false;
        
            function insertUrlAboveAadhaarLabel() {
        
                // Prevent duplicate insertion
                if (urlInserted || document.querySelector('.custom-dummy-url')) {
                    return;
                }
        
                // Web Form field wrapper
                const field = document.querySelector('[data-fieldname="custom_aadhar_card_number"]');
        
                if (!field) return;
        
                // Label (Web Forms render it differently)
                let label = field.querySelector('label');
        
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
                        Click here for  Aadhaar & PAN Verification
                    </a>
                `;
        
                // 🔥 Insert ABOVE label
                label.parentNode.insertBefore(urlDiv, label);
        
                urlInserted = true;
                console.log("✅ Aadhaar reference URL added above label");
            }
        
            // Retry until field is rendered
            let attempts = 0;
            const interval = setInterval(() => {
                insertUrlAboveAadhaarLabel();
                attempts++;
        
                if (urlInserted || attempts > 20) {
                    clearInterval(interval);
                }
            }, 300);
        
        })();
        
        /* ======================================================
           PREVIOUS EMPLOYED LOGIC
        ====================================================== */
        // Only set up event handler if field exists
        if (frappe.web_form.fields_dict && frappe.web_form.fields_dict.custom_previously_employed) {
            frappe.web_form.on("custom_previously_employed", function (f, v) {
                frappe.web_form.set_df_property(
                    "custom_last_3_months_salary_slip",
                    "reqd",
                    v === "Experienced" ? 1 : 0
                );
            });
        }

        /* ======================================================
           FORM VALIDATION + SUBMIT
        ====================================================== */
        let is_saving = false;

        // Show Save button on PAGE 4 (Education/Marksheets page)
        const pageWatcher = setInterval(() => {
            const isReviewPage = $('.review-page-container').length > 0;
            const formIsVisible = $('form[data-web-form], form.web-form').is(':visible');

            // Page 4 detector - Check for education fields (SSC/HSC, Bachelors, Masters)
            let isPage4 = false;
            let foundField = '';

            // Check for SSC & HSC field (unique to Page 4 - Education page)
            const $educationField = $('[data-fieldname="custom_ssc__hsc_marksheets__certificates"]');
            console.log("🔎 Checking for custom_ssc__hsc_marksheets__certificates field:");
            console.log("  - Field exists in DOM:", $educationField.length > 0);
            if ($educationField.length > 0) {
                console.log("  - Field is visible:", $educationField.is(':visible'));
                console.log("  - Field height:", $educationField.height());
            }

            if ($educationField.length > 0 && $educationField.is(':visible') && $educationField.height() > 0) {
                isPage4 = true;
                foundField = 'custom_ssc__hsc_marksheets__certificates';
                console.log("✅ Page 4 DETECTED! Field: custom_ssc__hsc_marksheets__certificates is visible");
            } else {
                console.log("❌ Page 4 NOT detected - custom_ssc__hsc_marksheets__certificates not found/visible");
            }

            // All fallback detection disabled - only using education field for Page 4 detection

            // Log ALL visible fields for debugging - ALWAYS LOG to help diagnose
            let allVisible = [];
            $('[data-fieldname]').filter(':visible').each(function() {
                const fname = $(this).attr('data-fieldname');
                const height = $(this).height();
                if (height > 0) {
                    allVisible.push(fname);
                }
            });

            console.log("🔍 Detection - isPage4:", isPage4, "foundField:", foundField, "isReviewPage:", isReviewPage);
            console.log("📋 Visible field count:", allVisible.length);
            console.log("📋 First 10 visible fields:", allVisible.slice(0, 10));

            console.log("🔍 Conditions: isReviewPage=", isReviewPage, "formVisible=", formIsVisible, "isPage4=", isPage4);

            if (!isReviewPage && formIsVisible && isPage4) {
                console.log("✅ ON PAGE 4 - Creating Save button, HIDING Next button");

                // Add class to body to indicate we're on Page 4
                $('body').addClass('on-page-4');

                // Hide ALL default Save/Submit buttons on Page 4
                $('button[type="submit"]').not('.btn-custom-save').hide();
                $('.page-header button, .page-title button, .page-head button, .page-actions button').filter(function() {
                    return $(this).text().toLowerCase().includes('save');
                }).hide();

                // AGGRESSIVELY HIDE Next button on Page 4
                $('.web-form-actions .btn-next').hide().attr('style', 'display: none !important;');
                $('.web-form-actions button').filter(function() {
                    return $(this).text().toLowerCase().includes('next');
                }).hide().attr('style', 'display: none !important;');
                $('.web-form-actions .btn-primary').filter(function() {
                    return $(this).text().toLowerCase().includes('next');
                }).hide().attr('style', 'display: none !important;');

                // Show Previous and Discard
                $('.web-form-actions .btn-previous').show();
                $('.web-form-actions .btn-default').show();

                // Create Save button ONLY if it doesn't exist - place it AFTER Discard button
                if ($('.btn-custom-save').length === 0) {
                    const saveBtn = `<button type="button" class="btn btn-primary btn-sm btn-custom-save" style="margin-left:8px; display: inline-block !important;">Save</button>`;

                    // Insert AFTER the Discard button (btn-default)
                    const $discardBtn = $('.web-form-actions .btn-default').last();
                    console.log("🔍 Discard button search:");
                    console.log("  - Discard buttons found:", $('.web-form-actions .btn-default').length);
                    console.log("  - Discard button exists:", $discardBtn.length > 0);

                    if ($discardBtn.length) {
                        $discardBtn.after(saveBtn);
                        console.log("💾 Save button created after Discard button");
                    } else {
                        $('.web-form-actions').first().append(saveBtn);
                        console.log("💾 Save button created (appended to actions - Discard not found)");
                    }

                    // Verify Save button was added to DOM and watch for removal
                    setTimeout(function() {
                        const saveCount = $('.btn-custom-save').length;
                        const saveVisible = $('.btn-custom-save').is(':visible');
                        console.log("✔️ Verification - Save buttons in DOM:", saveCount, "Visible:", saveVisible);
                        if (saveCount > 0 && !saveVisible) {
                            console.error("⚠️ WARNING: Save button exists but is NOT VISIBLE!");
                        }

                        // Add MutationObserver to detect if Save button is removed
                        if (saveCount > 0 && !window.saveButtonObserver) {
                            const $saveBtn = $('.btn-custom-save').get(0);
                            if ($saveBtn && $saveBtn.parentNode) {
                                window.saveButtonObserver = new MutationObserver(function(mutations) {
                                    mutations.forEach(function(mutation) {
                                        mutation.removedNodes.forEach(function(node) {
                                            if (node.classList && node.classList.contains('btn-custom-save')) {
                                                console.error("🚨 ALERT: Save button was REMOVED from DOM!");
                                                console.trace("Stack trace:");
                                            }
                                        });
                                    });
                                });
                                window.saveButtonObserver.observe($saveBtn.parentNode, { childList: true });
                                console.log("👀 Watching for Save button removal");
                            }
                        }
                    }, 50);
                } else {
                    console.log("ℹ️ Save button already exists, not recreating");
                    // Force visibility even if button exists
                    $('.btn-custom-save').attr('style', 'margin-left:8px; display: inline-block !important; visibility: visible !important; opacity: 1 !important;');
                    $('.btn-custom-save').show();
                }

                // FORCE Save button to stay visible AND clickable on every iteration
                if ($('.btn-custom-save').length > 0) {
                    $('.btn-custom-save').each(function() {
                        $(this).attr('style', 'margin-left:8px; display: inline-block !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important; z-index: 9999 !important; position: relative !important; cursor: pointer !important;');
                        $(this).show();
                        $(this).prop('disabled', false); // Ensure not disabled
                        $(this).removeAttr('disabled'); // Remove disabled attribute
                    });
                }

                // Bind Save button click - Collect ALL form data and create documents
                $('.btn-custom-save').off('click').on('click', function(e) {
                    console.log("🎯 SAVE BUTTON CLICKED!");
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("💾 Save button clicked - Collecting all form data");

                    // Get required fields
                    const email = frappe.web_form.get_value('custom_email_id');
                    const first_name = frappe.web_form.get_value('custom_first_name');
                    const designation = frappe.web_form.get_value('designation');

                    if (!email || !first_name || !designation) {
                        frappe.msgprint({
                            title: 'Required Fields Missing',
                            indicator: 'red',
                            message: 'Please fill Email, First Name, and Designation before saving.'
                        });
                        return false;
                    }

                    // Collect ALL form data from all pages
                    const form_data = frappe.web_form.get_values();
                    form_data.job_applicant = '';
                    form_data.job_offer = '';

                    console.log("📋 Collected form data from all pages:", form_data);

                    // Call backend to create Job Applicant, Job Offer, and Employee Onboarding
                    frappe.call({
                        method: "recruitment.recruitment.web_form.emp_onboarding.emp_onboarding.create_job_applicant_and_offer",
                        args: {
                            email: email,
                            first_name: first_name,
                            designation: designation,
                            web_form_data: JSON.stringify(form_data)
                        },
                        freeze: true,
                        freeze_message: "Creating Employee Onboarding...",
                        callback: function(r) {
                            console.log("✅ Backend response:", r.message);
                            if (r.message && r.message.success && r.message.saved) {
                                const docname = r.message.employee_onboarding;
                                frappe.msgprint({
                                    title: 'Success',
                                    indicator: 'green',
                                    message: 'Employee Onboarding created successfully!'
                                });

                                // Show review page with the created document
                                setTimeout(() => {
                                    showReviewPage(docname, form_data);
                                }, 1000);
                            } else {
                                frappe.msgprint({
                                    title: 'Error',
                                    indicator: 'red',
                                    message: r.message?.message || 'Failed to create Employee Onboarding'
                                });
                            }
                        },
                        error: function(err) {
                            console.error("❌ Error creating documents:", err);
                            frappe.msgprint({
                                title: 'Error',
                                indicator: 'red',
                                message: 'Failed to create records. Please try again.'
                            });
                        }
                    });

                    return false;
                });

            } else {
                console.log("❌ NOT on Page 4 - Showing Next button, HIDING Save button");

                // Remove class from body
                $('body').removeClass('on-page-4');

                // Remove custom Save button
                $('.btn-custom-save').remove();

                if (!isReviewPage && formIsVisible) {
                    // On other pages (1-3) - HIDE Save button, SHOW Next button
                    console.log("🔄 Hiding Save button, showing Next button on pages 1-3");

                    // HIDE default save/submit button on Pages 1-3
                    $('button[type="submit"]').hide();
                    $('.web-form-actions button[type="submit"]').hide();
                    $('.page-header button, .page-title button, .page-head button, .page-actions button').filter(function() {
                        return $(this).text().toLowerCase().includes('save');
                    }).hide();

                    // Remove ALL inline styles and show the Next button
                    $('.web-form-actions .btn-next').removeAttr('style').attr('style', 'display: inline-block !important;').show();

                    $('.web-form-actions button').each(function() {
                        if ($(this).text().toLowerCase().includes('next')) {
                            $(this).removeAttr('style').attr('style', 'display: inline-block !important;').show();
                            console.log("👉 Next button found and shown:", $(this).text());
                        }
                    });

                    // Also try with filter
                    $('.web-form-actions .btn-primary').filter(function() {
                        return $(this).text().toLowerCase().includes('next');
                    }).removeAttr('style').attr('style', 'display: inline-block !important;').show();
                } else if (isReviewPage) {
                    // On review page - hide default buttons
                    $('button[type="submit"]').not('.btn-submit-final').hide();
                }
            }
        }, 400);
        // Prevent default form submission
        $(document).on('submit', 'form[data-web-form], form.web-form', function(e) {
            console.log("🚫 Form submit blocked");
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        });

        // Override frappe.after_ajax to prevent default redirect
        const originalAfterAjax = frappe.after_ajax;
        frappe.after_ajax = function(data) {
            // Don't redirect if we just created Employee Onboarding
            if (data && data.employee_onboarding && data.success) {
                console.log("🚫 Preventing default redirect after Employee Onboarding creation");
                return;
            }
            if (originalAfterAjax) {
                originalAfterAjax.call(this, data);
            }
        };

        // Override Frappe's save function to prevent default behavior
        // frappe.web_form.save = function() {
        //     console.log("🚫 Intercepted save() - redirecting to validate()");
        //     // Call our custom validate function instead
        //     frappe.web_form.validate();
        // };

        // Prevent all form submission events
        // $('form[data-web-form="employee-onboarding"]').on('submit', function(e) {
        //     console.log("🚫 Form submit event blocked");
        //     e.preventDefault();
        //     e.stopPropagation();
        //     e.stopImmediatePropagation();
        //     return false;
        // });

        // Intercept save button clicks
        // $(document).on('click', 'button[type="submit"], .btn-primary', function(e) {
        //     const $btn = $(e.currentTarget);
        //     if ($btn.text().includes('Save') || $btn.attr('type') === 'submit') {
        //         console.log("🚫 Save button click intercepted");
        //         e.preventDefault();
        //         e.stopPropagation();
        //         e.stopImmediatePropagation();

        //         // Manually trigger our validation
        //         frappe.web_form.validate();
        //         return false;
        //     }
        // });

        frappe.web_form.validate = function () {
            console.log("🔍 Running validation...");

            // Prevent duplicate submission
            if (is_saving) {
                console.log("⏸️ Already saving, preventing duplicate submission");
                return false;
            }

            const v = frappe.web_form.get_values();

            // Validation 1: Mandatory fields check
            let missing = [];
            const mandatory_fields = [
                { field: "employee_name", label: "Employee Name" },
                { field: "custom_email_id", label: "Email ID" },
                { field: "custom_primary_mobile_number", label: "Mobile Number" },
                { field: "custom_its_id", label: "ITS ID" },
                { field: "designation", label: "Designation" },
                { field: "company", label: "Company" }
            ];

            mandatory_fields.forEach(item => {
                const value = frappe.web_form.get_value(item.field);
                if (!value || !value.toString().trim()) {
                    missing.push(item.label);
                }
            });

            if (missing.length > 0) {
                frappe.msgprint(
                    "Please fill the following fields:<br><br><b>" + missing.join("<br>") + "</b>",
                    "Missing Mandatory Fields"
                );
                console.log("❌ Validation failed: Missing mandatory fields:", missing);
                return false;
            }

            // Validation 2: Conditional salary slip
            if (
                v.custom_previously_employed === "Experienced" &&
                !v.custom_last_3_months_salary_slip
            ) {
                frappe.msgprint(
                    "Salary slip is required for Experienced employees",
                    "Required Field Missing"
                );
                console.log("❌ Validation failed: Salary slip required");
                return false;
            }

            // Validation 3: Bank account
            if (v.custom_bank_account_no && !/^[0-9]{9,18}$/.test(v.custom_bank_account_no)) {
                frappe.msgprint(
                    "Bank account number must be 9-18 digits",
                    "Invalid Bank Account"
                );
                console.log("❌ Validation failed: Invalid bank account");
                return false;
            }

            // Validation 4: IFSC code
            if (v.custom_ifsc_code) {

                // Normalize input
                const ifsc = v.custom_ifsc_code
                    .toString()
                    .trim()
                    .toUpperCase();
            
                // Put normalized value back into field
                frappe.web_form.set_value("custom_ifsc_code", ifsc);
            
                // Correct IFSC regex (AAAA0BBBBBB)
                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            
                if (!ifscRegex.test(ifsc)) {
                    frappe.msgprint({
                        title: __("Invalid IFSC Code"),
                        indicator: "red",
                        message: __(
                            "IFSC code format is incorrect.<br><br>" +
                            "<b>Correct format:</b> AAAA0BBBBBB<br>" +
                            "<b>Example:</b> SBIN0123456<br><br>" +
                            "• First 4 characters must be letters<br>" +
                            "• 5th character must be <b>0</b>"
                        )
                    });
            
                    console.log("❌ Validation failed: Invalid IFSC →", ifsc);
                    return false;
                }
            }
            

            // Validation 5: Aadhaar
            if (
                v.custom_aadhar_card_number &&
                (!/^\d{12}$/.test(v.custom_aadhar_card_number) ||
                    v.custom_aadhar_card_number.startsWith("0") ||
                    v.custom_aadhar_card_number.startsWith("1"))
            ) {
                frappe.msgprint(
                    "Aadhaar must be 12 digits and cannot start with 0 or 1",
                    "Invalid Aadhaar Number"
                );
                console.log("❌ Validation failed: Invalid Aadhaar");
                return false;
            }

            // Validation 6: PAN card
            if (
                v.custom_pan_card_number &&
                !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.custom_pan_card_number)
            ) {
                frappe.msgprint(
                    "PAN card format is incorrect (e.g., ABCDE1234F)",
                    "Invalid PAN Card"
                );
                console.log("❌ Validation failed: Invalid PAN");
                return false;
            }

            // All validations passed - proceed with submission
            console.log("✅ All validations passed");
            console.log("📤 Form data being sent:", {
                email: v.custom_email_id,
                first_name: v.employee_name,
                designation: v.designation
            });
            is_saving = true;

            frappe.call({
                method: "recruitment.recruitment.web_form.emp_onboarding.emp_onboarding.create_job_applicant_and_offer",
                freeze: true,
                freeze_message: "Creating Employee Onboarding...",
                args: {
                    email: v.custom_email_id,
                    first_name: v.employee_name,  // Use employee_name instead of custom_first_name
                    designation: v.designation,
                    web_form_data: JSON.stringify(v)
                },
                callback(r) {
                    is_saving = false;
                    console.log("📥 Backend response:", r);

                    if (r.message?.success && r.message.employee_onboarding) {
                        console.log("✅ Employee Onboarding created:", r.message.employee_onboarding);

                        // Prevent any redirects
                        frappe.dom.freeze("Loading review page...");

                        // Show review page immediately
                        setTimeout(() => {
                            frappe.dom.unfreeze();
                            showReviewPage(r.message.employee_onboarding, v);
                        }, 500);
                    } else {
                        console.error("❌ Backend response:", r.message);
                        frappe.msgprint(
                            "Failed to create Employee Onboarding. Check console for details.",
                            "Error"
                        );
                        console.error("❌ Failed to create Employee Onboarding");
                    }
                },
                error(err) {
                    is_saving = false;
                    console.error("❌ Server error details:", err);
                    frappe.msgprint(
                        "An error occurred while creating the onboarding. Please check console and try again.",
                        "Server Error"
                    );
                    console.error("❌ Server error:", err);
                }
            });

            // Always return false to prevent default Frappe form submission
            return false;
        };

        /* ======================================================
           ITS FETCH (GUARANTEED) WITH DEBOUNCING
        ====================================================== */

        let itsBindAttempts = 0;
        const maxItsBindAttempts = 20; // Try for 10 seconds
        let itsFetchTimeout = null; // For debouncing
        let lastFetchedITS = null; // To prevent duplicate fetches

        function bindITS() {
            itsBindAttempts++;
            console.log(`🔍 [${itsBindAttempts}/${maxItsBindAttempts}] Attempting to bind ITS field...`);

            // Try multiple ways to find the input field
            let $input = null;

            // Method 1: Standard data-fieldname selector
            $input = $('[data-fieldname="custom_its_id"] input');
            if ($input.length) {
                console.log("  → Found via [data-fieldname] selector");
            }

            // Method 2: Direct input selector
            if (!$input || !$input.length) {
                $input = $('input[data-fieldname="custom_its_id"]');
                if ($input.length) {
                    console.log("  → Found via input[data-fieldname] selector");
                }
            }

            // Method 3: Via fields_dict
            if (!$input || !$input.length) {
                const field_obj = frappe.web_form.fields_dict['custom_its_id'];
                if (field_obj && field_obj.$input) {
                    $input = field_obj.$input;
                    console.log("  → Found via fields_dict.$input");
                }
            }

            // Method 4: Search in all web form inputs
            if (!$input || !$input.length) {
                $('input').each(function() {
                    const name = $(this).attr('data-fieldname');
                    if (name === 'custom_its_id') {
                        $input = $(this);
                        console.log("  → Found via iterating all inputs");
                        return false;
                    }
                });
            }

            if (!$input || !$input.length) {
                console.warn(`  ⚠️ ITS field not found (attempt ${itsBindAttempts})`);

                if (itsBindAttempts < maxItsBindAttempts) {
                    setTimeout(bindITS, 500);
                } else {
                    console.error("  ❌ Failed to bind ITS field after maximum attempts");
                }
                return;
            }

            console.log("✅ ITS input field bound successfully!", $input);
            console.log("  → Field type:", $input.attr('type'));
            console.log("  → Field name:", $input.attr('data-fieldname'));

            // Remove any existing handlers and bind new ones with debouncing
            $input.off(".its").on("blur.its", function () {
                const its = $(this).val();
                console.log("🔄 ITS field blur event, current value:", its);

                // Clear any pending timeout
                if (itsFetchTimeout) {
                    clearTimeout(itsFetchTimeout);
                }

                if (!its || its.trim().length < 3) {
                    console.log("  ⏭️ ITS value too short (need at least 3 chars), skipping fetch");
                    return;
                }

                // Don't fetch if we already fetched this ITS ID
                if (its === lastFetchedITS) {
                    console.log("  ⏭️ Already fetched data for this ITS ID, skipping");
                    return;
                }

                // Debounce: Wait 800ms before fetching
                itsFetchTimeout = setTimeout(() => {
                    console.log("🚀 Fetching ITS data for:", its);
                    lastFetchedITS = its; // Remember this ITS ID

                    frappe.call({
                        method: "recruitment.recruitment.web_form.emp_onboarding.emp_onboarding.fetch_employee_data_by_its_id",
                        args: { its_id: its },
                        freeze: true,
                        freeze_message: "Fetching ITS data...",
                        callback(r) {
                            console.log("📦 ITS API Response:", r);

                            if (!r.message?.success) {
                                console.warn("❌ ITS fetch failed:", r.message?.error || "No data found");

                                // Show the detailed error message from backend
                                frappe.msgprint({
                                    title: "ITS Data Fetch Failed",
                                    indicator: "red",
                                    message: r.message?.error || "No employee data found for this ITS ID"
                                });
                                return;
                            }

                            const d = r.message;
                            console.log("=" * 80);
                            console.log("✅ ITS Data received - FULL RESPONSE:", r);
                            console.log("✅ ITS Data message object:", d);
                            console.log("📱 Mobile number from response:", d.custom_primary_mobile_number);
                            console.log("📱 WhatsApp number from response:", d.custom_whatsapp_number);
                            console.log("=" * 80);

                            // Set values with slight delay to ensure fields are ready
                            setTimeout(() => {
                                console.log("🔧 Starting to set ITS data fields...");

                                console.log("Setting employee_name:", d.employee_name);
                                safeSet("employee_name", d.employee_name);

                                console.log("Setting custom_email_id:", d.custom_email_id);
                                safeSet("custom_email_id", d.custom_email_id);

                                console.log("Setting custom_primary_mobile_number:", d.custom_primary_mobile_number);
                                safeSet("custom_primary_mobile_number", d.custom_primary_mobile_number);

                                console.log("Setting custom_whatsapp_number:", d.custom_whatsapp_number);
                                safeSet("custom_whatsapp_number", d.custom_whatsapp_number);

                                console.log("Setting custom_farig_year:", d.custom_farig_year);
                                safeSet("custom_farig_year", d.custom_farig_year);

                                console.log("Setting custom_farig_darajah:", d.custom_farig_darajah);
                                safeSet("custom_farig_darajah", d.custom_farig_darajah);

                                console.log("✅ All ITS fields set");

                                frappe.msgprint({
                                    title: "Success",
                                    indicator: "green",
                                    message: "ITS data fetched and populated successfully!"
                                });
                            }, 100);
                        },
                        error(err) {
                            console.error("❌ ITS API Error:", err);
                            frappe.msgprint({
                                title: "API Error",
                                indicator: "red",
                                message: "Failed to fetch ITS data. Please check your internet connection and try again."
                            });
                        }
                    });
                }, 800); // 800ms debounce delay
            });

            // Also add a test on focus to verify binding
            $input.on("focus.its", function() {
                console.log("👆 ITS field focused - binding is active");
            });
        }

        bindITS();

        /* ======================================================
           PAGE 5 - REVIEW PAGE WITH PREVIOUS AND SUBMIT BUTTONS
        ====================================================== */
        function showReviewPage(docname, formData) {
            console.log("📋 Showing Page 5 (Review Page) for:", docname);
            console.log("📋 Form data:", formData);

            // Hide the form and all buttons (works with any form name)
            $('form[data-web-form], form.web-form').hide();
            $('.web-form-footer').hide();
            $('.web-form-actions').hide();
            $('.btn-primary[type="submit"]').hide();
            $('button[type="submit"]').hide();

            // Hide only the form content inside page_content, not the container itself
            $('.page_content > *').not('.review-page-container').hide();
            $('.page-content > *').not('.review-page-container').hide();

            // Remove any existing review page
            $('.review-page-container').remove();

            // Create Page 5 (Review Page) HTML
            const reviewHtml = `
                <div class="review-page-container" style="max-width: 900px; margin: 40px auto; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: block !important; position: relative; z-index: 1000;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2c3e50; margin-bottom: 10px; font-size: 28px;">Review Your Information</h2>
                        <p style="color: #7f8c8d; font-size: 14px;">Please review all your details before final submission</p>
                    </div>

                    <div class="review-data" style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
                        <div class="review-section" style="margin-bottom: 25px;">
                            <h4 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; font-size: 18px;">
                                <i class="fa fa-user"></i> Personal Information
                            </h4>
                            <div class="review-row"><strong>Employee Name:</strong> ${formData.employee_name || 'N/A'}</div>
                            <div class="review-row"><strong>Email:</strong> ${formData.custom_email_id || 'N/A'}</div>
                            <div class="review-row"><strong>Mobile Number:</strong> ${formData.custom_primary_mobile_number || 'N/A'}</div>
                            <div class="review-row"><strong>ITS ID:</strong> ${formData.custom_its_id || 'N/A'}</div>
                        </div>

                        <div class="review-section" style="margin-bottom: 25px;">
                            <h4 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; font-size: 18px;">
                                <i class="fa fa-briefcase"></i> Job Information
                            </h4>
                            <div class="review-row"><strong>Company:</strong> ${formData.company || 'N/A'}</div>
                            <div class="review-row"><strong>Designation:</strong> ${formData.designation || 'N/A'}</div>
                            <div class="review-row"><strong>Department:</strong> ${formData.department || 'N/A'}</div>
                        </div>

                        ${formData.custom_bank_account_no ? `
                        <div class="review-section" style="margin-bottom: 25px;">
                            <h4 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; font-size: 18px;">
                                <i class="fa fa-university"></i> Bank Details
                            </h4>
                            <div class="review-row"><strong>Bank Name:</strong> ${formData.custom_name_of_bank || 'N/A'}</div>
                            <div class="review-row"><strong>Account Number:</strong> ${formData.custom_bank_account_no || 'N/A'}</div>
                            <div class="review-row"><strong>IFSC Code:</strong> ${formData.custom_ifsc_code || 'N/A'}</div>
                        </div>
                        ` : ''}

                        ${formData.custom_aadhar_card_number ? `
                        <div class="review-section" style="margin-bottom: 25px;">
                            <h4 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 15px; font-size: 18px;">
                                <i class="fa fa-file-text"></i> Documents
                            </h4>
                            <div class="review-row"><strong>Aadhaar Number:</strong> ${formData.custom_aadhar_card_number || 'N/A'}</div>
                            <div class="review-row"><strong>PAN Number:</strong> ${formData.custom_pan_card_number || 'N/A'}</div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="review-actions" style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                        <button class="btn btn-primary btn-lg btn-submit-final" style="min-width: 160px; padding: 12px 24px; font-size: 16px; background-color: #27ae60; border-color: #27ae60;">
                            Submit <i class="fa fa-check"></i>
                        </button>
                    </div>

                    <input type="hidden" class="review-docname" value="${docname}">
                </div>
            `;

            // Insert Page 5 (Review Page) - try multiple selectors
            if ($('.page-content').length) {
                $('.page-content').append(reviewHtml);
                $('.page-content').show(); // Make sure container is visible
                console.log("✅ Review page appended to .page-content");
            } else if ($('.page_content').length) {
                $('.page_content').append(reviewHtml);
                $('.page_content').show(); // Make sure container is visible
                console.log("✅ Review page appended to .page_content");
            } else if ($('body').length) {
                $('body').append(reviewHtml);
                console.log("✅ Review page appended to body");
            } else {
                console.error("❌ Could not find container to append review page");
            }

            // Force visibility of review page
            $('.review-page-container').show();

            // Scroll to top
            window.scrollTo(0, 0);
            console.log("✅ Review page should now be visible");
            console.log("📊 Review page container count:", $('.review-page-container').length);
            console.log("📊 Review page is visible:", $('.review-page-container').is(':visible'));

            // Previous button removed - review page now shows only Submit button

            // Handle Submit button - finalize submission
            $('.btn-submit-final').on('click', function() {
                console.log("✅ Final submit clicked");
                $(this).prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Submitting...');

                // Show success message
                $('.review-page-container').html(`
                    <div style="text-align: center; padding: 80px 20px;">
                        <div style="font-size: 80px; color: #27ae60; margin-bottom: 25px; animation: scaleIn 0.5s ease-out;">
                            <i class="fa fa-check-circle"></i>
                        </div>
                        <h2 style="color: #27ae60; margin-bottom: 15px; font-size: 32px;">Form Successfully Submitted!</h2>
                        <p style="color: #7f8c8d; font-size: 16px; line-height: 1.6;">
                            Thank you for completing the Employee Onboarding form.<br>
                            Your information has been submitted successfully.
                        </p>
                    </div>
                    <style>
                        @keyframes scaleIn {
                            from { transform: scale(0); }
                            to { transform: scale(1); }
                        }
                    </style>
                `);
            });
        }

        /* ======================================================
           LOAD SAVED DATA - FOR EDITING
        ====================================================== */
        function loadSavedData(docname) {
            console.log("📥 Loading saved data for editing:", docname);

            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Employee Onboarding",
                    name: docname
                },
                callback(r) {
                    if (r.message) {
                        const doc = r.message;
                        console.log("✅ Loaded saved data:", doc);

                        // Set all form fields with saved data
                        setTimeout(() => {
                            Object.keys(doc).forEach(field => {
                                if (frappe.web_form.fields_dict[field]) {
                                    frappe.web_form.set_value(field, doc[field]);
                                }
                            });
                            console.log("✅ Form populated with saved data");
                        }, 500);
                    }
                }
            });
        }
    }
});

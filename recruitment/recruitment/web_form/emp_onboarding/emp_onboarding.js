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

        $(".navbar, .web-footer").remove();

        /* ======================================================
           FETCH INITIATE ONBOARDING (SAFE + DELAYED)
        ====================================================== */

        const params = new URLSearchParams(window.location.search);
        const initiate_id = params.get("initiate_onboarding_id");

        if (initiate_id) {
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
                        safeSet("employee_grade", d.employee_grade);
                        safeSet("company", d.company);
                    console.log("✅ All Initiate fields set");
                    }, 2000);
                }
            });
        }

        function safeSet(field, value) {
            if (!value) {
                console.warn(`⚠️ Empty value for: ${field}`);
                return;
            }

            try {
                console.log(`🔧 Setting ${field} to:`, value);

                const field_obj = frappe.web_form.fields_dict[field];
                if (!field_obj) {
                    console.warn(`  → Field object NOT found in fields_dict for ${field}`);
                    return;
                }

                console.log(`  → Field object found for ${field}, type: ${field_obj.df?.fieldtype}`);

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
            } catch (err) {
                console.error(`❌ Error setting ${field}:`, err);
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
                    <a href="https://example.com/aadhaar-info"
                       target="_blank"
                       style="color:#007bff; text-decoration:none;">
                        Click here for Aadhaar information
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
        frappe.web_form.on("custom_previously_employed", function (f, v) {
            frappe.web_form.set_df_property(
                "custom_last_3_months_salary_slip",
                "reqd",
                v === "Experienced" ? 1 : 0
            );
        });

        /* ======================================================
           FORM VALIDATION + SUBMIT
        ====================================================== */
        let is_saving = false;

        // Show Save button on PAGE 4 (Education/Marksheets page)
        let saveButtonCreated = false;

        setInterval(() => {
            // Check if we're on review or success page
            const isReviewPage = $('.review-page-container').length > 0;
            const formIsVisible = $('form[data-web-form], form.web-form').is(':visible');

            // ALWAYS hide ALL default Frappe Save/Submit buttons (be very aggressive)
            $('button[type="submit"]').not('.btn-custom-save').hide();
            $('.btn-primary[type="submit"]').not('.btn-custom-save').hide();
            $('.btn-primary').filter(function() {
                return $(this).text().toLowerCase().includes('save');
            }).not('.btn-custom-save').hide();
            $('.web-form-footer button').not('.btn-custom-save, .btn-previous, .btn-default').hide();
            $('button').filter(function() {
                return $(this).text().toLowerCase().includes('save') && !$(this).hasClass('btn-custom-save');
            }).hide();

            // Single detection method: Check if any field with "marksheet" or "previously_employed" is visible
            let isPage4 = false;

            $('[data-fieldname]').each(function() {
                const fieldname = $(this).attr('data-fieldname') || '';
                if ((fieldname.includes('marksheet') || fieldname.includes('previously_employed')) &&
                    $(this).is(':visible')) {
                    isPage4 = true;
                    return false; // break loop
                }
            });

            // On Page 4: Show our custom Save button
            if (!isReviewPage && formIsVisible && isPage4) {
                // Show default Previous and Discard buttons
                $('.web-form-actions .btn-previous').show();
                $('.web-form-actions .btn-default').show();

                // Create Save button only once
                if (!saveButtonCreated && $('.btn-custom-save').length === 0) {
                    console.log("🆕 Creating Save button (ONCE)");

                    // Create ONE Save button
                    const saveBtnHtml = `<button type="button" class="btn btn-default btn-sm btn-custom-save">Save</button>`;
                    $('.web-form-actions').first().append(saveBtnHtml);

                    // Bind click event (unbind first to prevent duplicates)
                    $('.btn-custom-save').off('click').on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("💾 Save button clicked");
                        frappe.web_form.validate();
                    });

                    saveButtonCreated = true;
                    console.log("✅ Save button created");
                }

                // Make sure it's visible
                $('.btn-custom-save').show();
            } else if (!isReviewPage && formIsVisible) {
                // On other pages: Hide our Save button
                $('.btn-custom-save').hide();
            } else {
                // On review page: Hide all buttons
                $('.btn-custom-save').hide();
            }
        }, 300);

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
           ITS FETCH (GUARANTEED)
        ====================================================== */

        let itsBindAttempts = 0;
        const maxItsBindAttempts = 20; // Try for 10 seconds

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

            // Remove any existing handlers and bind new ones
            $input.off(".its").on("blur.its change.its input.its", function () {
                const its = $(this).val();
                console.log("🔄 ITS field event triggered, current value:", its);

                if (!its || its.trim().length < 3) {
                    console.log("  ⏭️ ITS value too short (need at least 3 chars), skipping fetch");
                    return;
                }

                console.log("🚀 Fetching ITS data for:", its);

                frappe.call({
                    method: "recruitment.recruitment.web_form.emp_onboarding.emp_onboarding.fetch_employee_data_by_its_id",
                    args: { its_id: its },
                    freeze: true,
                    freeze_message: "Fetching ITS data...",
                    callback(r) {
                        console.log("📦 ITS API Response:", r);

                        if (!r.message?.success) {
                            console.warn("❌ No ITS data found in response");
                            frappe.msgprint("❌ No ITS data found");
                            return;
                        }

                        const d = r.message;
                        console.log("✅ ITS Data received:", d);

                        // Set values with slight delay to ensure fields are ready
                        setTimeout(() => {
                            console.log("🔧 Starting to set ITS data fields...");
                            safeSet("employee_name", d.employee_name);
                            safeSet("custom_email_id", d.custom_email_id);
                            safeSet("custom_primary_mobile_number", d.custom_primary_mobile_number);
                            safeSet("custom_whatsapp_number", d.custom_whatsapp_number);
                            safeSet("custom_farig_year", d.custom_farig_year);
                            safeSet("custom_farig_darajah", d.custom_farig_darajah);
                            console.log("✅ All ITS fields set");
                            frappe.msgprint("✅ ITS data fetched successfully");
                        }, 100);
                    },
                    error(err) {
                        console.error("❌ ITS API Error:", err);
                        frappe.msgprint("❌ Error fetching ITS data");
                    }
                });
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
            $('.page_content').hide(); // Hide existing page content

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
                            <div class="review-row"><strong>Employee Grade:</strong> ${formData.employee_grade || 'N/A'}</div>
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
                        <button class="btn btn-secondary btn-lg btn-previous" style="min-width: 160px; padding: 12px 24px; font-size: 16px;">
                            <i class="fa fa-arrow-left"></i> Previous
                        </button>
                        <button class="btn btn-primary btn-lg btn-submit-final" style="min-width: 160px; padding: 12px 24px; font-size: 16px; background-color: #27ae60; border-color: #27ae60;">
                            Submit <i class="fa fa-check"></i>
                        </button>
                    </div>

                    <input type="hidden" class="review-docname" value="${docname}">
                </div>

                <style>
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
            `;

            // Insert Page 5 (Review Page) - try multiple selectors
            if ($('.page-content').length) {
                $('.page-content').append(reviewHtml);
                console.log("✅ Review page appended to .page-content");
            } else if ($('.page_content').length) {
                $('.page_content').append(reviewHtml);
                console.log("✅ Review page appended to .page_content");
            } else if ($('body').length) {
                $('body').append(reviewHtml);
                console.log("✅ Review page appended to body");
            } else {
                console.error("❌ Could not find container to append review page");
            }

            // Scroll to top
            window.scrollTo(0, 0);
            console.log("✅ Review page should now be visible");

            // Handle Previous button - go back to Page 4
            $('.btn-previous').on('click', function() {
                console.log("⬅️ Previous clicked - returning to Page 4");
                $('.review-page-container').remove();
                $('form[data-web-form], form.web-form').show();
                $('.web-form-footer').show();

                // Load the saved data back into the form
                loadSavedData(docname);
            });

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

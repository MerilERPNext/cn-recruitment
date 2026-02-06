frappe.ready(function () {

	// UI cleanup
	document.title = "Rejoinee Verification Form";
	$(".navbar, .web-footer").remove();

	// Helper: set read-only field value directly in doc model + DOM
	function setReadOnlyField(fieldname, value) {
		if (value === undefined || value === null) return;
		frappe.web_form.doc[fieldname] = value;
		var $wrapper = $('[data-fieldname="' + fieldname + '"]');
		$wrapper.find(".control-value, .like-disabled-input").text(value);
		$wrapper.find("input").val(value);
	}

	// Get employee_id from URL
	var params = new URLSearchParams(window.location.search);
	var employee_id = params.get("employee_id");

	if (employee_id) {
		frappe.call({
			method: "recruitment.recruitment.web_form.rejoin_employee.rejoin_employee.get_employee_data",
			args: { employee_id: employee_id },
			callback: function (r) {
				if (!r.message || !r.message.found) return;

				var d = r.message;

				setTimeout(function () {
					// Read-only fields - set directly in doc model + DOM
					setReadOnlyField("employee_name", d.employee_name);
					setReadOnlyField("prefered_email", d.prefered_email);

					// Editable fields - use set_value
					var editable_fields = [
						"gender", "date_of_birth", "marital_status",
						"custom_its_id", "custom_farigh_year", "custom_its_mobile",
						"custom_whatsapp_no", "custom_its_name", "custom_farigh_darajah",
						"custom_its_email", "custom_citizenship", "custom_ocipassportnri",
						"cell_number", "personal_email", "company_email",
						"person_to_be_contacted", "emergency_phone_number", "relation",
						"custom_adhaar_number", "pan_number", "passport_number",
						"current_address", "permanent_address",
						"bank_name", "bank_ac_no", "ifsc_code", "micr_code", "iban"
					];

					editable_fields.forEach(function (field) {
						if (d[field]) {
							frappe.web_form.set_value(field, d[field]);
						}
					});

					// Set hidden company field in doc model
					if (d.company) {
						frappe.web_form.doc.company = d.company;
					}
					// Set salary_mode so bank fields show/hide correctly
					if (d.salary_mode) {
						frappe.web_form.set_value("salary_mode", d.salary_mode);
					}
				}, 500);
			}
		});
	}

	// Override save to update existing employee instead of creating new
	frappe.web_form.save = function () {

		if (frappe.web_form.validate && frappe.web_form.validate() === false) {
			return false;
		}

		if (!employee_id) {
			frappe.msgprint("Employee ID not found. Cannot submit form.");
			return false;
		}

		var v = frappe.web_form.doc;

		frappe.call({
			method: "recruitment.recruitment.web_form.rejoin_employee.rejoin_employee.update_employee_data",
			freeze: true,
			freeze_message: "Updating Employee Details...",
			args: {
				employee_id: employee_id,
				form_data: JSON.stringify(v)
			},
			callback: function (r) {
				if (!r.message || !r.message.success) {
					frappe.msgprint(r.message ? r.message.message : "Failed to update details.");
					return;
				}

				$(".web-form-container").html(
					'<div style="text-align:center; padding:80px">' +
						'<i class="fa fa-check-circle" style="font-size:80px;color:#28a745"></i>' +
						'<h2>Updated Successfully</h2>' +
						'<p>Thank you! Your details have been updated.</p>' +
					'</div>'
				);
			}
		});

		return false;
	};

	// Rebind form submit
	setTimeout(function () {
		$(".web-form").off("submit").on("submit", function (e) {
			e.preventDefault();
			frappe.web_form.save();
			return false;
		});
	}, 500);

});

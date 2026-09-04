// Copyright (c) 2026, Recruitment and contributors
// For license information, please see license.txt

frappe.ui.form.on("DPDP Act Settings", {
	refresh(frm) {
		// The content template only shapes the in-system form; in External Portal
		// mode the notices are owned by the partner, so the button would be misleading.
		if (frm.doc.consent_mode !== "External Portal") {
			frm.add_custom_button(__("Load Default DPDP Template"), () => {
				frappe.confirm(
					__(
						"This will fill the page content, information clauses and consent statements with the standard DPDP template. Existing rows will be replaced. Continue?"
					),
					() => load_default_template(frm)
				);
			});
		}

		if (frm.doc.consent_mode === "External Portal") {
			frm.add_custom_button(__("Generate Callback Secret"), () => {
				frappe.confirm(
					__(
						"This replaces the current callback secret. The consent portal will reject callbacks until the new secret is shared with them. Continue?"
					),
					() => generate_callback_secret(frm)
				);
			});
		}
	},

	consent_mode(frm) {
		frm.refresh();
	},
});

function generate_callback_secret(frm) {
	// Generated in the browser so the secret is never derived from anything
	// guessable server-side; 32 random bytes as hex.
	const bytes = new Uint8Array(32);
	window.crypto.getRandomValues(bytes);
	const secret = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	frm.set_value("callback_secret", secret);
	frappe.msgprint({
		title: __("Callback Secret Generated"),
		indicator: "orange",
		message:
			__("Save this record, then share the secret below with the consent portal team. It is stored encrypted and cannot be read back afterwards.") +
			`<br><br><b>${__("Header")}:</b> <code>${frappe.utils.escape_html(
				frm.doc.callback_header_name || "X-Consent-Token"
			)}</code><br><b>${__("Secret")}:</b> <code>${secret}</code>`,
	});
}

function load_default_template(frm) {
	frm.set_value("form_title", "Digital Personal Data Protection Act, 2023 (DPDP Act)");
	frm.set_value(
		"form_subtitle",
		"Employee Data Collection, Processing and Consent Declaration"
	);
	frm.set_value("information_column_label", "Information Collected");
	frm.set_value("purpose_column_label", "Purpose of Collection and Use");
	frm.set_value("declaration_heading", "Employee Declaration and Consent");
	frm.set_value(
		"intro_content",
		'As part of the recruitment, onboarding, employment, payroll, statutory compliance, ' +
			'employee benefits administration, and background verification process, the Company ' +
			"collects, processes, stores, and, where necessary, shares your personal information " +
			"for legitimate employment-related purposes."
	);
	frm.set_value(
		"closing_content",
		"<p>The Company may store this information in its internal systems and may share it, on a " +
			"need-to-know basis, with authorized third parties including background verification " +
			"agencies, payroll service providers, insurance providers, benefit administrators, " +
			"statutory authorities, auditors, and other service providers engaged for legitimate " +
			"employment-related purposes.</p>" +
			"<p>The information collected is necessary to process your employment, conduct background " +
			"verification, administer payroll and employee benefits, comply with statutory obligations, " +
			"maintain employee records, and fulfil contractual obligations arising from the employment " +
			"relationship.</p>" +
			"<p>Failure to provide information that is necessary for employment-related purposes, " +
			"statutory compliance, payroll administration, employee benefit administration, or background " +
			"verification may result in the Company being unable to proceed with or continue your " +
			"employment, including withdrawal of the employment offer where applicable.</p>" +
			"<p>If you have any questions regarding the collection, processing, storage, sharing, " +
			"correction, or withdrawal of consent relating to your personal information, please contact " +
			"your HR SPOC.</p>"
	);

	frm.clear_table("information_clauses");
	const clauses = [
		[
			"Personal Details & KYC Information (including name, contact details, family information, PAN, Aadhaar and other identity documents)",
			"Creation and maintenance of employee records, employment administration, payroll processing, statutory compliance, PF administration, identity verification, background verification, and internal business communication. Certain contact details such as mobile number may be visible to employees for legitimate business communication purposes.",
		],
		[
			"Address Information",
			"Employee record maintenance, emergency contact and support, identity and address verification, KYC validation, statutory compliance, and background verification.",
		],
		[
			"Bank Account Information",
			"Salary processing, reimbursements, incentives, final settlements, and other employment-related payments.",
		],
		[
			"Educational Qualifications",
			"Verification of educational credentials and qualifications that form the basis of employment and background verification.",
		],
		[
			"Employment History",
			"Verification of prior work experience, employment credentials, and background verification.",
		],
		[
			"Family / Dependent Information",
			"Administration of employee benefit programs, including enrolment of eligible dependents under the Company's medical insurance policy. Providing dependent information is voluntary; however, failure to provide such information may result in dependents not being covered under applicable insurance benefits.",
		],
		[
			"Nomination Information",
			"Recording nominees for Provident Fund (PF), Gratuity, Group Personal Accident (GPA), Group Term Life (GTL), ESOPs (where applicable), and other statutory or Company-sponsored benefits to ensure timely and accurate settlement of benefits and entitlements.",
		],
		[
			"Professional References",
			"Background verification and validation of professional credentials and employment information.",
		],
	];
	clauses.forEach(([info, purpose]) => {
		const row = frm.add_child("information_clauses");
		row.information_collected = info;
		row.purpose = purpose;
		row.is_active = 1;
	});

	frm.clear_table("consent_statements");
	const statements = [
		[
			"accuracy",
			"I hereby confirm that the information provided by me is true, complete, and accurate to the best of my knowledge. I acknowledge that I have read and understood the purposes for which my personal information is being collected, processed, stored, and shared.",
		],
		[
			"processing_consent",
			"I consent to the collection, processing, storage, verification, and sharing of my personal information, including personal, educational, employment, banking, nominee, dependent, and reference information, for the purposes described above.",
		],
		[
			"mandatory_ack",
			"I understand that certain information is mandatory for employment, statutory compliance, payroll administration, employee benefit administration, and background verification purposes, and that failure to provide such information may affect the Company's ability to proceed with or continue my employment.",
		],
		[
			"authorization",
			"I authorize the Company and its authorized service providers, payroll partners, insurers, technology partners, benefit administrators, auditors, and background verification agencies to process and verify the information provided by me solely for the purposes described above and in accordance with applicable laws.",
		],
		[
			"agreement",
			"I have read and agree to the Employee Data Collection, Processing and Consent Declaration.",
		],
	];
	statements.forEach(([key, text]) => {
		const row = frm.add_child("consent_statements");
		row.consent_key = key;
		row.statement = text;
		row.is_mandatory = 1;
		row.is_active = 1;
	});

	frm.refresh_field("information_clauses");
	frm.refresh_field("consent_statements");
	frappe.show_alert({
		message: __("Default DPDP template loaded. Review and Save."),
		indicator: "green",
	});
}

/* global frappe, __ */

/*
 * Direct Applicant Onboarding — "Add Direct Applicant" on the Job Applicant list.
 *
 * Loaded AFTER job_applicant_list.js (hooks.py doctype_list_js), and only wraps
 * the onload it defines, so the existing list is untouched. The button shows only
 * while Recruitment Settings -> "Enable Direct Applicant Onboarding" is on.
 */
(function () {
	const DOCTYPE = "Job Applicant";
	const API = "recruitment.api.direct_applicant";
	const HIERARCHY = ["company", "division", "department", "designation"];

	const settings = (frappe.listview_settings[DOCTYPE] = frappe.listview_settings[DOCTYPE] || {});
	const base_onload = settings.onload;

	settings.onload = function (listview) {
		if (base_onload) base_onload.apply(this, arguments);
		frappe.call({ method: `${API}.get_config` }).then((r) => {
			const config = r.message || {};
			if (!config.enabled || !config.can_create) return;
			listview.page.add_inner_button(__("Add Direct Applicant"), () => open_dialog(listview, config));
		});
	};

	// Link options come from the doctype meta, so a site that re-points a field
	// (e.g. Recruiter -> User vs Employee) needs no change here.
	function link(fieldname, label, reqd) {
		const df = frappe.meta.get_docfield(DOCTYPE, fieldname) || {};
		return { fieldtype: "Link", options: df.options, label: __(label), reqd: reqd ? 1 : 0 };
	}

	// Recruitment Settings -> "Add Direct Applicant — Extra Fields", in two columns.
	function extra_fields(fields) {
		if (!(fields || []).length) return [];
		const half = Math.ceil(fields.length / 2);
		const out = [{ fieldtype: "Section Break", label: __("Additional Details") }];
		fields.forEach((f, i) => {
			if (i === half) out.push({ fieldtype: "Column Break" });
			out.push({
				fieldname: f.fieldname,
				fieldtype: f.fieldtype,
				label: f.label,
				options: f.options,
				reqd: f.reqd,
			});
		});
		return out;
	}

	function open_dialog(listview, config) {
		// Recruitment Settings -> "Add Direct Applicant — Standard Fields" decides
		// which of these appear and which are mandatory; the locked ones (first
		// name, email, company, designation) always do. A field absent from the
		// config (older server) keeps its old behaviour.
		const std = config.standard_fields || {};
		const shown = (key) => !std[key] || std[key].show;
		const reqd = (key, fallback) => (std[key] ? std[key].reqd : fallback) ? 1 : 0;
		const opt = (key, df) => (shown(key) ? [Object.assign(df, { reqd: reqd(key, df.reqd) })] : []);
		const has_department = shown("department");

		const dialog = new frappe.ui.Dialog({
			title: __("Add Direct Applicant"),
			size: "large",
			fields: [
				{ fieldtype: "Section Break", label: __("Candidate") },
				{ fieldname: "first_name", fieldtype: "Data", label: __("First Name"), reqd: 1 },
				...opt("middle_name", { fieldname: "middle_name", fieldtype: "Data", label: __("Middle Name") }),
				...opt("last_name", { fieldname: "last_name", fieldtype: "Data", label: __("Last Name"), reqd: 1 }),
				{ fieldtype: "Column Break" },
				{ fieldname: "email_id", fieldtype: "Data", options: "Email", label: __("Email"), reqd: 1 },
				...opt("phone_number", { fieldname: "phone_number", fieldtype: "Data", options: "Phone", label: __("Phone"), reqd: 1 }),
				...opt("category", {
					fieldname: "category", fieldtype: "Select", label: __("Direct Hire Category"), reqd: 1,
					options: [""].concat(config.categories || []),
				}),
				...(shown("category") ? [{
					fieldname: "referred_by", ...link("custom_referred_by", "Referred By"),
					depends_on: "eval:doc.category=='Referral'",
					mandatory_depends_on: "eval:doc.category=='Referral'",
				}] : []),
				// Company -> Division -> Department -> Designation: each narrows the
				// next and clears what sits below it (see HIERARCHY).
				{ fieldtype: "Section Break", label: __("Position") },
				{ fieldname: "company", ...link("custom_company_finalized", "Company", true), onchange: () => cascade("company") },
				...opt("division", {
					fieldname: "division", ...link("custom_division_finalized", "Division"),
					read_only_depends_on: "eval:!doc.company", onchange: () => cascade("division"),
				}),
				...opt("department", {
					fieldname: "department", ...link("custom_department", "Department", true),
					read_only_depends_on: "eval:!doc.company", onchange: () => cascade("department"),
				}),
				{
					fieldname: "designation", ...link("designation", "Designation", true),
					read_only_depends_on: has_department ? "eval:!doc.department" : "eval:!doc.company",
				},
				{ fieldtype: "Column Break" },
				...opt("employment_type", { fieldname: "employment_type", ...link("custom_employment_type", "Employment Type", true) }),
				...opt("recruiter", { fieldname: "recruiter", ...link("custom_recruiter", "Recruiter") }),
				...opt("region", { fieldname: "region", ...link("custom_region", "Region") }),
			].concat(extra_fields(config.extra_fields)),
			primary_action_label: __("Create"),
			primary_action(values) {
				frappe.call({
					method: `${API}.create_direct_applicant`,
					args: { data: values },
					freeze: true,
					freeze_message: __("Creating applicant..."),
				}).then((r) => {
					if (!r.message) return;
					dialog.hide();
					frappe.show_alert({ message: __("Direct applicant created"), indicator: "green" });
					frappe.set_route("Form", DOCTYPE, r.message.name);
				});
			},
		});
		const value = (fieldname) => (dialog.fields_dict[fieldname] ? dialog.get_value(fieldname) : "");

		// Same filters as the requisition / new-hire forms: departments of the
		// company (and, when a division is picked, under it), then the active
		// designations of the department.
		// Same filters as the requisition / new-hire forms: departments of the
		// company (and, when a division is picked, under it), then the active
		// designations of the department — or of the company when Department is
		// not asked for.
		if (dialog.fields_dict.division) {
			dialog.fields_dict.division.get_query = () => ({
				query: `${API}.division_query`,
				filters: { company: value("company") },
			});
		}
		if (dialog.fields_dict.department) {
			dialog.fields_dict.department.get_query = () => {
				const filters = { company: value("company"), disabled: 0 };
				if (value("division")) filters.name = ["descendants of", value("division")];
				return { filters };
			};
		}
		dialog.fields_dict.designation.get_query = () => ({
			filters: has_department
				? { custom_department: value("department"), custom_status: "Active" }
				: { custom_company: value("company"), custom_status: "Active" },
		});

		// A change higher up empties everything below it, so a stale pick from
		// another company / department can never be submitted.
		function cascade(changed) {
			const below = HIERARCHY.slice(HIERARCHY.indexOf(changed) + 1);
			below.forEach((fieldname) => {
				if (dialog.fields_dict[fieldname] && value(fieldname)) dialog.set_value(fieldname, "");
			});
		}

		dialog.show();
	}
})();

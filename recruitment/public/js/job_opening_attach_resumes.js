/* global frappe, __ */
/**
 * Job Opening — "Attach Resumes" bulk applicant creation.
 *
 * Flow:
 *   1. The recruiter clicks "Attach Resumes" in the form top bar and uploads one
 *      or more resume files (multi-select).
 *   2. As soon as the uploads settle, each file becomes one Draft Job Applicant
 *      (job_title + designation carried from the opening, resume stored in
 *      resume_attachment). A future parsing API fills the rest.
 *
 * Creation happens directly on upload — it does NOT require saving the Job
 * Opening. This lets external recruiters (who have no write permission on Job
 * Opening) add applicants without a Save step.
 *
 * Server: recruitment.api.resume_applicants.create_applicants_from_resumes
 */

(function () {
	const METHOD = "recruitment.api.resume_applicants.create_applicants_from_resumes";

	// Resume file types we let the recruiter upload.
	const ALLOWED_TYPES = [".pdf", ".doc", ".docx", ".rtf", ".odt", ".txt"];

	function pending(frm) {
		// Single source of truth for the queued-but-not-yet-created resumes.
		if (!frm.__pending_resumes) frm.__pending_resumes = [];
		return frm.__pending_resumes;
	}

	function scheduleCreate(frm) {
		// on_success fires once per file; debounce so a whole multi-file batch is
		// created in a single server call (50 resumes → one call, not 50) once the
		// uploads settle.
		if (frm.__create_timer) clearTimeout(frm.__create_timer);
		frm.__create_timer = setTimeout(() => createApplicants(frm), 700);
	}

	function refreshButtonLabel(frm) {
		if (frm.__attach_resumes_btn) {
			frm.__attach_resumes_btn.text(__("Attach Resumes"));
		}
	}

	function openUploader(frm) {
		if (frm.is_new()) {
			frappe.msgprint({
				title: __("Save First"),
				message: __("Save this Job Opening before attaching resumes."),
				indicator: "orange",
			});
			return;
		}
		if (frm.doc.status === "Closed") {
			frappe.msgprint({
				title: __("Not Allowed"),
				message: __("This Job Opening is closed — reopen it to add applicants."),
				indicator: "red",
			});
			return;
		}

		new frappe.ui.FileUploader({
			dialog_title: __("Attach Resumes"),
			allow_multiple: true,
			// Keep the files standalone (don't clutter the opening's attachments) —
			// each one is referenced from its own applicant's resume_attachment.
			restrictions: { allowed_file_types: ALLOWED_TYPES },
			upload_notes: __("Each resume becomes a Job Applicant as soon as it uploads."),
			// Called once per successfully uploaded file.
			on_success(file_doc) {
				if (!file_doc || !file_doc.file_url) return;
				pending(frm).push({
					file_url: file_doc.file_url,
					file_name: file_doc.file_name || file_doc.file_url,
				});
				// Create directly on upload — no Save required (external recruiters
				// have no write permission on Job Opening). Debounced so a multi-file
				// batch becomes one server call.
				scheduleCreate(frm);
			},
		});
	}

	function createApplicants(frm) {
		const resumes = pending(frm);
		if (!resumes.length || frm.__creating_applicants) return;

		frm.__creating_applicants = true;
		// Hand the queue off and clear it immediately so an overlapping batch can't
		// double-create the same resumes.
		const batch = resumes.slice();
		frm.__pending_resumes = [];
		refreshButtonLabel(frm);

		frappe.call({
			method: METHOD,
			args: {
				job_opening: frm.doc.name,
				resumes: JSON.stringify(batch),
			},
			freeze: true,
			freeze_message: __("Creating Job Applicants from resumes…"),
			callback(r) {
				const msg = (r && r.message) || {};
				const created = msg.created || [];
				const skipped = msg.skipped || [];

				if (created.length) {
					frappe.show_alert(
						{
							message: __("Created {0} Job Applicant(s) from resumes.", [created.length]),
							indicator: "green",
						},
						7
					);
					frappe.msgprint({
						title: __("Job Applicants Created"),
						indicator: "green",
						message: __(
							"{0} Draft Job Applicant(s) were created for this opening. <a href='/app/job-applicant?job_title={1}'>View applicants</a>",
							[created.length, encodeURIComponent(frm.doc.name)]
						),
					});
				}
				if (skipped.length) {
					frappe.show_alert(
						{
							message: __("{0} resume(s) could not be processed.", [skipped.length]),
							indicator: "orange",
						},
						7
					);
				}
			},
			always() {
				frm.__creating_applicants = false;
				// Resumes uploaded while this batch was in flight were queued but
				// skipped (guard above) — flush them now.
				if (pending(frm).length) scheduleCreate(frm);
			},
		});
	}

	frappe.ui.form.on("Job Opening", {
		refresh(frm) {
			frm.__attach_resumes_btn = frm.add_custom_button(__("Attach Resumes"), () =>
				openUploader(frm)
			);
			refreshButtonLabel(frm);
		},
	});
})();

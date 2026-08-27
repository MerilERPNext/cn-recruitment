frappe.ready(function () {
	const form = document.getElementById("verify-email-form");
	const pickForm = document.getElementById("spot-pick-form");
	const applyForm = document.getElementById("spot-apply-form");
	const submitBtn = document.getElementById("verify-submit-btn");
	const inlineError = document.getElementById("verify-inline-error");

	// Campus Drive this QR/link came from (e.g. /verify_email?drive=DRV-2026-0001).
	// Spot registration only exists in the context of a drive, so every call below
	// carries it and the server re-validates institute/opening against it.
	const driveId = new URLSearchParams(window.location.search).get("drive") || "";

	// What the candidate typed on step 1 — used to pre-fill the registration form.
	const identity = { email: "", first_name: "", last_name: "", phone_number: "" };
	// The opening chosen on step 2 and the field set fetched for it.
	const spot = { institute: "", institute_name: "", opening: "", opening_title: "", fields: [] };

	const ICONS = {
		success:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>',
		warning:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>',
		error:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M15 9l-6 6"></path><path d="M9 9l6 6"></path></svg>',
	};

	if (!form) return;

	// ---- Step 1: email check ---------------------------------------------

	form.addEventListener("submit", function (e) {
		e.preventDefault();
		hideInlineError();

		const email = (document.getElementById("email").value || "").trim();
		const first_name = (document.getElementById("first_name").value || "").trim();
		const last_name = (document.getElementById("last_name").value || "").trim();
		const phone_number = (document.getElementById("phone_number").value || "").trim();

		// Email is the only checked field — the rest are carried along so a
		// spot registration can be pre-filled from what the candidate typed.
		if (!email) {
			showInlineError(__("Please enter your email address."));
			return;
		}

		Object.assign(identity, { email, first_name, last_name, phone_number });
		setLoading(submitBtn, true, __("Checking..."), __("Submit"));

		frappe
			.call({
				method: "recruitment.api.candidate_verification.verify_applicant_email",
				args: { email, first_name, last_name, phone_number, drive: driveId },
			})
			.then((r) => {
				const data = r.message || {};
				if (data.verified) {
					showVerified(data.message);
				} else if (data.status === "not_found") {
					showNotVerified(data.message, data.can_register);
				} else {
					showMismatch(data.message);
				}
			})
			.catch(() => {
				showErrorModal(__("Something went wrong. Please try again."));
			})
			.always(() => setLoading(submitBtn, false, __("Checking..."), __("Submit")));
	});

	// ---- Step 2: institute + opening -------------------------------------

	const instituteSelect = document.getElementById("spot_institute");
	const openingSelect = document.getElementById("spot_opening");
	const pickBtn = document.getElementById("spot-pick-btn");
	const pickError = document.getElementById("spot-pick-error");

	function startSpotRegistration() {
		hideModal();
		setStep("pick");
		setHeading(__("Spot Registration"), __("Loading this drive's institutes and openings..."));
		setLoading(pickBtn, true, __("Loading..."), __("Continue"));

		callApi("recruitment.api.channels.campus_drive_spot.get_drive_registration_options", {
			drive: driveId,
		})
			.then((data) => {
				fillSelect(instituteSelect, __("Select your institute"),
					data.institutes.map((i) => ({ value: i.institute, label: i.institute_name })));
				fillSelect(openingSelect, __("Select an opening"),
					data.openings.map((o) => ({ value: o.job_opening, label: o.job_title })));
				setHeading(
					data.form_title || __("Spot Registration"),
					__("Select your institute and the opening you want to apply for.")
				);
			})
			.catch((err) => {
				setStep("verify");
				showErrorModal(err.message);
			})
			.finally(() => setLoading(pickBtn, false, __("Loading..."), __("Continue")));
	}

	pickForm.addEventListener("submit", function (e) {
		e.preventDefault();
		hide(pickError);

		const institute = instituteSelect.value;
		const opening = openingSelect.value;
		if (!institute) return showError(pickError, __("Please select your institute."));
		if (!opening) return showError(pickError, __("Please select an opening."));

		spot.institute = institute;
		spot.institute_name = instituteSelect.selectedOptions[0].textContent;
		spot.opening = opening;
		spot.opening_title = openingSelect.selectedOptions[0].textContent;

		setLoading(pickBtn, true, __("Loading form..."), __("Continue"));
		callApi("recruitment.api.channels.campus_drive_spot.get_drive_application_fields", {
			drive: driveId,
			job_opening: opening,
		})
			.then((data) => {
				spot.fields = data.fields || [];
				renderApplicationForm();
				setStep("apply");
				setHeading(spot.opening_title, __("Fill in your details to complete registration."));
			})
			.catch((err) => showError(pickError, err.message))
			.finally(() => setLoading(pickBtn, false, __("Loading form..."), __("Continue")));
	});

	// ---- Step 3: the opening's configured application form ----------------

	const fieldsHost = document.getElementById("spot-fields");
	const summaryHost = document.getElementById("spot-selection-summary");
	const applyBtn = document.getElementById("spot-apply-btn");
	const applyError = document.getElementById("spot-apply-error");
	const backBtn = document.getElementById("spot-back-btn");

	const TABLE_FIELDTYPES = ["Table", "Table MultiSelect"];

	// What the candidate already typed on step 1, keyed by Job Applicant fieldname,
	// so they don't retype it.
	const PREFILL = {
		applicant_name: () => identity.first_name,
		custom_applicant_last_name: () => identity.last_name,
		phone_number: () => identity.phone_number,
		email_id: () => identity.email,
	};

	function renderApplicationForm() {
		fieldsHost.innerHTML = "";
		summaryHost.innerHTML = "";
		applyBtn.disabled = false;

		summaryHost.appendChild(
			el("div", "spot-summary-row", `${__("Institute")}: ${spot.institute_name}`)
		);
		summaryHost.appendChild(
			el("div", "spot-summary-row", `${__("Opening")}: ${spot.opening_title}`)
		);

		// Group by section rather than emitting a header whenever the section
		// changes: an opening's field list can revisit a section further down (the
		// seeded openings put two Basic Details questions after Professional
		// Details), which would otherwise print that heading twice. Sections keep
		// first-seen order.
		const sections = new Map();
		spot.fields.forEach((f) => {
			const section = f.section || __("General");
			if (!sections.has(section)) sections.set(section, []);
			sections.get(section).push(f);
		});

		sections.forEach((fields, section) => {
			fieldsHost.appendChild(el("div", "spot-section", section));
			fields.forEach((f) => fieldsHost.appendChild(buildField(f)));
		});
	}

	function buildField(f) {
		if (TABLE_FIELDTYPES.includes(f.fieldtype)) return buildTableField(f);

		const wrap = el("div", "verify-field");
		wrap.appendChild(buildLabel(f.display_name, f.reqd, `spot_f_${f.reference_name}`));
		wrap.appendChild(
			buildControl({
				id: `spot_f_${f.reference_name}`,
				fieldtype: f.fieldtype,
				options: f.options,
				readOnly: f.editability === "Read Only",
				prefill: PREFILL[f.reference_name] ? PREFILL[f.reference_name]() : "",
				link: { fieldname: f.reference_name },
			})
		);
		return wrap;
	}

	// ---- Child tables (education history, previous employment, ...) -------
	// Rendered as repeatable stacked rows. Which columns appear is HR's call: the
	// server sends `table_fields` already filtered by the field's child_field_config,
	// so narrowing the grid is a config change, not a code change.

	function buildTableField(f) {
		const wrap = el("div", "spot-table-field");
		wrap.appendChild(buildLabel(f.display_name, f.reqd));

		const rows = el("div", "spot-table-rows");
		rows.id = `spot_t_${f.reference_name}`;
		wrap.appendChild(rows);

		const add = el("button", "spot-add-row", `+ ${__("Add")} ${f.display_name}`);
		add.type = "button";
		add.addEventListener("click", () => addTableRow(f, rows));
		wrap.appendChild(add);

		// Education Stages this channel demands (Job Applicant Profile Settings ->
		// Required Education Stages) get a row each, with the stage already chosen
		// and locked, so the candidate fills THEIR 10th / 12th / Graduation rather
		// than guessing which rows to add. Anything beyond them they add themselves.
		const demanded = requiredStages(f);
		if (demanded.length) {
			demanded.forEach((stage) => addTableRow(f, rows, stage));
		} else if (f.reqd) {
			// A required table needs at least one row to fill in; an optional one
			// starts empty so nobody is nudged into entering data they don't have.
			addTableRow(f, rows);
		}
		return wrap;
	}

	function requiredStages(f) {
		return (f.stage_requirement && f.stage_requirement.required_stages) || [];
	}

	// `lockedStage` seeds a demanded Education Stage: that column is preselected and
	// cannot be changed or the row removed, so the row the candidate is being asked
	// for cannot turn into a different one.
	function addTableRow(f, rows, lockedStage) {
		const columns = f.table_fields || [];
		const stageField = f.stage_requirement && f.stage_requirement.fieldname;
		const row = el("div", "spot-table-row");

		const head = el("div", "spot-table-row-head");
		head.appendChild(el("span", "spot-table-row-title", ""));
		if (!lockedStage) {
			const remove = el("button", "spot-row-remove", "×");
			remove.type = "button";
			remove.setAttribute("aria-label", __("Remove"));
			remove.addEventListener("click", () => {
				row.remove();
				renumberRows(rows, f);
			});
			head.appendChild(remove);
		}
		row.appendChild(head);

		columns.forEach((col) => {
			if (col.read_only) return;
			const locked = Boolean(lockedStage) && col.fieldname === stageField;
			const field = el("div", "verify-field");
			// A demanded stage is mandatory whatever the column config says — it is
			// the reason this row exists.
			field.appendChild(buildLabel(col.label, col.reqd_channel || locked));
			const control = buildControl({
				fieldtype: col.fieldtype,
				options: col.options,
				prefill: col.default || "",
				preselect: locked ? lockedStage : "",
				readOnly: locked,
				link: { fieldname: f.reference_name, child_fieldname: col.fieldname },
			});
			control.dataset.childFieldname = col.fieldname;
			field.appendChild(control);
			row.appendChild(field);
		});

		rows.appendChild(row);
		renumberRows(rows, f);
	}

	function renumberRows(rows, f) {
		const demanded = requiredStages(f);
		Array.from(rows.children).forEach((row, index) => {
			const title = row.querySelector(".spot-table-row-title");
			// A seeded row is named for its stage ("Education — 10th"); the rows the
			// candidate added themselves keep the running number.
			if (title) {
				title.textContent = index < demanded.length
					? `${f.display_name} — ${demanded[index]}`
					: `${f.display_name} ${index + 1}`;
			}
		});
	}

	function buildLabel(text, required, forId) {
		const label = el("label", null, text);
		if (forId) label.setAttribute("for", forId);
		if (required) label.appendChild(el("span", "req", " *"));
		return label;
	}

	function buildControl(spec) {
		let input;

		if (spec.fieldtype === "Select") {
			input = document.createElement("select");
			fillSelect(
				input,
				__("Select"),
				(spec.options || "")
					.split("\n")
					.map((o) => o.trim())
					.filter(Boolean)
					.map((o) => ({ value: o, label: o }))
			);
		} else if (spec.fieldtype === "Link") {
			input = document.createElement("select");
			fillSelect(input, __("Loading..."), []);
			loadLinkOptions(spec.link, input, spec.preselect);
		} else if (spec.fieldtype === "Check") {
			input = document.createElement("input");
			input.type = "checkbox";
			input.className = "spot-check";
		} else if (["Attach", "Attach Image"].includes(spec.fieldtype)) {
			input = document.createElement("input");
			input.type = "file";
			input.className = "spot-file";
			input.addEventListener("change", () => uploadAttachment(spec.link, input));
		} else if (["Small Text", "Text", "Long Text", "Text Editor"].includes(spec.fieldtype)) {
			input = document.createElement("textarea");
			input.rows = 3;
		} else {
			input = document.createElement("input");
			input.type = inputTypeFor(spec.fieldtype);
		}

		if (spec.id) input.id = spec.id;
		input.dataset.fieldtype = spec.fieldtype;
		if (spec.prefill && input.tagName !== "SELECT" && input.type !== "file") {
			input.value = spec.prefill;
		}
		// A Select's options may not have arrived yet — loadLinkOptions applies the
		// preselection when they do.
		if (spec.preselect && input.tagName === "SELECT") input.value = spec.preselect;
		// Disabled, not readonly: a <select> ignores readonly. `readValue` still reads
		// a disabled control, so a locked stage is submitted like any other value.
		if (spec.readOnly) input.disabled = true;
		return input;
	}

	function inputTypeFor(fieldtype) {
		if (["Int", "Float", "Percent", "Currency"].includes(fieldtype)) return "number";
		if (fieldtype === "Date") return "date";
		if (fieldtype === "Datetime") return "datetime-local";
		if (fieldtype === "Time") return "time";
		if (fieldtype === "Phone") return "tel";
		return "text";
	}

	function loadLinkOptions(link, select, preselect) {
		callApi("recruitment.api.channels.campus_drive_spot.get_drive_field_options", {
			drive: driveId,
			job_opening: spot.opening,
			fieldname: link.fieldname,
			child_fieldname: link.child_fieldname || "",
		})
			.then((data) => {
				fillSelect(select, __("Select"), data.options || []);
				if (preselect) select.value = preselect;
			})
			.catch(() => {
				fillSelect(select, __("Select"), preselect
					? [{ value: preselect, label: preselect }]
					: []);
				if (preselect) select.value = preselect;
			});
	}

	// Attach controls upload as soon as a file is picked; the returned file_url is
	// what gets submitted as that control's value.
	function uploadAttachment(link, input) {
		const file = input.files && input.files[0];
		input.dataset.fileUrl = "";
		if (!file) return;

		const body = new FormData();
		body.append("file", file);
		body.append("drive", driveId);
		body.append("job_opening", spot.opening);
		body.append("fieldname", link.fieldname);
		if (link.child_fieldname) body.append("child_fieldname", link.child_fieldname);

		input.disabled = true;
		fetch("/api/method/recruitment.api.channels.campus_drive_spot.upload_drive_attachment", {
			method: "POST",
			headers: { "X-Frappe-CSRF-Token": frappe.csrf_token || "" },
			body: body,
		})
			.then((res) => res.json())
			.then((res) => {
				const payload = res.message || {};
				if (!payload.success) throw new Error(payload.message || __("Upload failed."));
				input.dataset.fileUrl = payload.data.file_url;
			})
			.catch((err) => {
				input.value = "";
				showError(applyError, err.message || __("Upload failed."));
			})
			.finally(() => {
				input.disabled = false;
			});
	}

	applyForm.addEventListener("submit", function (e) {
		e.preventDefault();
		hide(applyError);

		const form_data = {};
		const missing = [];
		const problems = [];

		// Walk the config rather than the DOM, so a child table's inputs are only
		// ever read as part of their own row.
		spot.fields.forEach((config) => {
			const isTable = TABLE_FIELDTYPES.includes(config.fieldtype);
			const value = isTable
				? readTableValue(config, missing)
				: readValue(document.getElementById(`spot_f_${config.reference_name}`));
			if (isTable) problems.push(...stageOrderProblems(config, value));

			const empty = value === "" || value === null ||
				(Array.isArray(value) && !value.length);
			if (config.reqd && empty) missing.push(config.display_name);
			// Skip empties so optional fields don't overwrite doctype defaults.
			if (!empty) form_data[config.reference_name] = value;
		});

		if (missing.length) {
			problems.unshift(
				__("Please fill in: {0}").replace("{0}", missing.join(", "))
			);
		}
		if (problems.length) {
			return showError(applyError, problems.join(" "));
		}

		setLoading(applyBtn, true, __("Registering..."), __("Register"));
		callApi("recruitment.api.channels.campus_drive_spot.submit_drive_application", {
			drive: driveId,
			institute: spot.institute,
			job_opening: spot.opening,
			email: identity.email,
			form_data: JSON.stringify(form_data),
		})
			.then((data) => showRegistered(data))
			.catch((err) => showError(applyError, err.message))
			.finally(() => setLoading(applyBtn, false, __("Registering..."), __("Register")));
	});

	backBtn.addEventListener("click", function () {
		hide(applyError);
		setStep("pick");
		setHeading(__("Spot Registration"), __("Select your institute and the opening you want to apply for."));
	});

	/** Rows of a child table as an array of {childFieldname: value} objects.
	 *  Rows the candidate left entirely blank are dropped rather than submitted as
	 *  empty children; a row with some values but a missing required column is
	 *  reported through `missing`. */
	function readTableValue(config, missing) {
		const host = document.getElementById(`spot_t_${config.reference_name}`);
		if (!host) return [];

		const rows = [];
		Array.from(host.children).forEach((rowEl, index) => {
			const row = {};
			let filled = false;
			rowEl.querySelectorAll("[data-child-fieldname]").forEach((input) => {
				const value = readValue(input);
				if (value === "" || value === null) return;
				row[input.dataset.childFieldname] = value;
				filled = true;
			});
			if (!filled) return;

			(config.table_fields || []).forEach((col) => {
				if (col.reqd_channel && (row[col.fieldname] === undefined)) {
					missing.push(`${config.display_name} ${index + 1} → ${col.label}`);
				}
			});
			rows.push(row);
		});

		// Every Education Stage this channel demands needs a row of its own. Seeded
		// rows the candidate left entirely blank were dropped above, so this is also
		// what catches "they never filled in their 12th".
		if (config.stage_requirement) {
			const supplied = new Set(
				rows.map((r) => r[config.stage_requirement.fieldname]).filter(Boolean)
			);
			config.stage_requirement.required_stages.forEach((stage) => {
				if (!supplied.has(stage)) missing.push(`${config.display_name} → ${stage}`);
			});
		}
		return rows;
	}

	/** Sentences for any demanded stage whose year does not follow the one before it.
	 *  The stages are configured in the order they are sat (10th, then 12th, then
	 *  Graduation), so 2015 against the 10th and 2013 against the 12th has them the
	 *  wrong way round. Only the demanded stages take part — a row the candidate added
	 *  themselves has no place in that sequence — and blank years are left alone. */
	function stageOrderProblems(config, rows) {
		const rule = config.stage_requirement;
		if (!rule || !rule.year_fieldname) return [];
		const yearLabel = rule.year_label || rule.year_fieldname;

		const sat = [];
		rule.required_stages.forEach((stage, position) => {
			const row = rows.find((r) => r[rule.fieldname] === stage);
			const year = row && parseInt(row[rule.year_fieldname], 10);
			if (Number.isFinite(year)) sat.push({ position, stage, year });
		});

		const problems = [];
		for (let i = 1; i < sat.length; i++) {
			const earlier = sat[i - 1];
			const later = sat[i];
			if (later.year <= earlier.year) {
				problems.push(
					__("{0}: {1} is sat after {2}, so its {3} ({4}) must be later than {2}'s ({5}).")
						.replace("{0}", config.display_name)
						.replace(/\{1\}/g, later.stage)
						.replace(/\{2\}/g, earlier.stage)
						.replace("{3}", yearLabel)
						.replace("{4}", later.year)
						.replace("{5}", earlier.year)
				);
			}
		}
		return problems;
	}

	function readValue(input) {
		if (!input) return "";
		if (input.type === "checkbox") return input.checked ? 1 : 0;
		if (input.type === "file") return input.dataset.fileUrl || "";
		const raw = (input.value || "").trim();
		if (raw === "") return "";
		if (["Int"].includes(input.dataset.fieldtype)) return parseInt(raw, 10);
		if (["Float", "Percent", "Currency"].includes(input.dataset.fieldtype)) {
			return parseFloat(raw);
		}
		return raw;
	}

	// ---- Outcome popups -------------------------------------------------

	function showVerified(message) {
		openModal({
			type: "success",
			title: __("Email Verified"),
			message: message || __("Your email is verified. You can leave this page."),
			actions: [{ label: __("OK"), kind: "primary", onClick: closeTab }],
		});
	}

	function showNotVerified(message, canRegister) {
		const actions = [];
		// Spot registration needs a drive that's actually open for it — otherwise the
		// only honest option is the HR desk.
		if (canRegister && driveId) {
			actions.push({
				label: __("Immediate Registration"),
				kind: "primary",
				onClick: startSpotRegistration,
			});
		}
		actions.push({ label: __("Close"), kind: "ghost", onClick: closeTab });

		openModal({
			type: "warning",
			title: __("Application Not Found"),
			message: message || __("We could not find your email in our system yet."),
			actions: actions,
		});
	}

	function showRegistered(data) {
		openModal({
			type: "success",
			title: __("Registration Complete"),
			message: __("You're registered for {0}. Please wait at the venue for your name to be called.")
				.replace("{0}", data.job_title || spot.opening_title),
			actions: [{ label: __("OK"), kind: "primary", onClick: closeTab }],
		});
	}

	function showMismatch(message) {
		openModal({
			type: "warning",
			title: __("Details Don't Match"),
			message:
				message ||
				__("The details you entered do not match our records. Please check and try again."),
			actions: [{ label: __("Try Again"), kind: "primary", onClick: hideModal }],
		});
	}

	function showErrorModal(message) {
		openModal({
			type: "error",
			title: __("Oops!"),
			message: message,
			actions: [{ label: __("Try Again"), kind: "ghost", onClick: hideModal }],
		});
	}

	// ---- Modal plumbing -------------------------------------------------

	function openModal({ type, title, message, actions }) {
		const overlay = document.getElementById("verify-modal");
		const iconEl = document.getElementById("vm-icon");
		const titleEl = document.getElementById("vm-title");
		const msgEl = document.getElementById("vm-message");
		const actionsEl = document.getElementById("vm-actions");

		iconEl.className = "vm-icon " + type;
		iconEl.innerHTML = ICONS[type] || "";
		titleEl.textContent = title;
		msgEl.textContent = message;

		actionsEl.innerHTML = "";
		(actions || []).forEach((a) => {
			let node;
			if (a.href) {
				node = document.createElement("a");
				node.href = a.href;
			} else {
				node = document.createElement("button");
				node.type = "button";
				node.addEventListener("click", a.onClick || hideModal);
			}
			node.className = "vm-action " + (a.kind || "ghost");
			node.textContent = a.label;
			actionsEl.appendChild(node);
		});

		overlay.style.display = "flex";
		overlay.setAttribute("aria-hidden", "false");
	}

	function hideModal() {
		const overlay = document.getElementById("verify-modal");
		overlay.style.display = "none";
		overlay.setAttribute("aria-hidden", "true");
	}

	// Try to close the tab. Browsers only allow this for script-opened tabs,
	// so fall back to a friendly "you can close this tab" message.
	function closeTab() {
		try {
			window.open("", "_self");
			window.close();
		} catch (e) {
			/* ignore */
		}
		setTimeout(function () {
			hideModal();
			renderClosedFallback();
		}, 250);
	}

	function renderClosedFallback() {
		const card = document.querySelector(".verify-card");
		if (!card) return;
		card.innerHTML =
			'<div class="verify-badge">' +
			ICONS.success +
			'</div><h2 class="verify-title">' +
			__("All Done") +
			'</h2><p class="verify-subtitle">' +
			__("You can now safely close this tab.") +
			"</p>";
	}

	// ---- Small helpers --------------------------------------------------

	/** Call a campus_drive_spot endpoint, which answers {success, message, data}.
	 *  Resolves with `data`, rejects with an Error carrying the server's message.
	 *  frappe.call hands back a jQuery promise (no .finally), so it's wrapped in a
	 *  native one — the callers below rely on .catch/.finally. */
	function callApi(method, args) {
		return Promise.resolve(frappe.call({ method: method, args: args })).then((r) => {
			const payload = r.message || {};
			if (!payload.success) {
				throw new Error(payload.message || __("Something went wrong. Please try again."));
			}
			return payload.data;
		});
	}

	function setStep(step) {
		form.style.display = step === "verify" ? "" : "none";
		pickForm.style.display = step === "pick" ? "" : "none";
		applyForm.style.display = step === "apply" ? "" : "none";
	}

	function setHeading(title, subtitle) {
		document.getElementById("verify-heading").textContent = title;
		document.getElementById("verify-subheading").textContent = subtitle;
	}

	function fillSelect(select, placeholder, options) {
		select.innerHTML = "";
		const blank = document.createElement("option");
		blank.value = "";
		blank.textContent = placeholder;
		select.appendChild(blank);
		(options || []).forEach((o) => {
			const opt = document.createElement("option");
			opt.value = o.value;
			opt.textContent = o.label;
			select.appendChild(opt);
		});
	}

	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined && text !== null) node.textContent = text;
		return node;
	}

	function setLoading(button, on, loadingLabel, idleLabel) {
		button.disabled = on;
		button.classList.toggle("loading", on);
		button.querySelector(".btn-label").textContent = on ? loadingLabel : idleLabel;
	}

	function show(node, message) {
		node.textContent = message;
		node.style.display = "block";
	}

	function hide(node) {
		node.style.display = "none";
	}

	function showError(node, message) {
		show(node, message || __("Something went wrong. Please try again."));
	}

	function showInlineError(message) {
		show(inlineError, message);
	}

	function hideInlineError() {
		hide(inlineError);
	}
});

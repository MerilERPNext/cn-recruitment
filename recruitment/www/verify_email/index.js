frappe.ready(function () {
	const form = document.getElementById("verify-email-form");
	const submitBtn = document.getElementById("verify-submit-btn");
	const inlineError = document.getElementById("verify-inline-error");

	// Campus Drive this QR/link came from (e.g. /verify_email?drive=DRV-2026-0001).
	const driveId = new URLSearchParams(window.location.search).get("drive") || "";

	const ICONS = {
		success:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>',
		warning:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>',
		error:
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M15 9l-6 6"></path><path d="M9 9l6 6"></path></svg>',
	};

	if (!form) return;

	form.addEventListener("submit", function (e) {
		e.preventDefault();
		hideInlineError();

		const email = (document.getElementById("email").value || "").trim();
		const first_name = (document.getElementById("first_name").value || "").trim();
		const last_name = (document.getElementById("last_name").value || "").trim();

		if (!email) {
			showInlineError(__("Please enter your email address."));
			return;
		}

		setLoading(true);

		frappe
			.call({
				method: "recruitment.api.candidate_verification.verify_applicant_email",
				args: { email, first_name, last_name, drive: driveId },
			})
			.then((r) => {
				const data = r.message || {};
				if (data.verified) {
					showVerified(data.message);
				} else {
					showNotVerified(data.message, data.registration_link);
				}
			})
			.catch(() => {
				showErrorModal(__("Something went wrong. Please try again."));
			})
			.always(() => setLoading(false));
	});

	// ---- Outcome popups -------------------------------------------------

	function showVerified(message) {
		openModal({
			type: "success",
			title: __("Email Verified"),
			message: message || __("Your email is verified. You can leave this page."),
			actions: [{ label: __("OK"), kind: "primary", onClick: closeTab }],
		});
	}

	function showNotVerified(message, registrationLink) {
		openModal({
			type: "warning",
			title: __("Application Not Found"),
			message:
				message || __("We could not find your email in our system yet."),
			actions: [
				{
					label: __("Immediate Registration"),
					kind: "primary",
					href: registrationLink || "#",
				},
				{ label: __("Close"), kind: "ghost", onClick: closeTab },
			],
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
			let el;
			if (a.href) {
				el = document.createElement("a");
				el.href = a.href;
			} else {
				el = document.createElement("button");
				el.type = "button";
				el.addEventListener("click", a.onClick || hideModal);
			}
			el.className = "vm-action " + (a.kind || "ghost");
			el.textContent = a.label;
			actionsEl.appendChild(el);
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

	function setLoading(on) {
		submitBtn.disabled = on;
		submitBtn.classList.toggle("loading", on);
		submitBtn.querySelector(".btn-label").textContent = on
			? __("Checking...")
			: __("Submit");
	}

	function showInlineError(message) {
		inlineError.textContent = message;
		inlineError.style.display = "block";
	}

	function hideInlineError() {
		inlineError.style.display = "none";
	}
});

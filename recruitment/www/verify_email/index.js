frappe.ready(function () {
	const form = document.getElementById("verify-email-form");
	const resultEl = document.getElementById("verify-result");
	const submitBtn = document.getElementById("verify-submit-btn");

	// Campus Drive this QR/link came from (e.g. /verify_email?drive=DRV-2026-0001).
	const driveId = new URLSearchParams(window.location.search).get("drive") || "";

	if (!form) return;

	form.addEventListener("submit", function (e) {
		e.preventDefault();

		const email = (document.getElementById("email").value || "").trim();
		const first_name = (document.getElementById("first_name").value || "").trim();
		const last_name = (document.getElementById("last_name").value || "").trim();

		if (!email) {
			showError(__("Please enter your email address."));
			return;
		}

		submitBtn.disabled = true;
		submitBtn.textContent = __("Checking...");
		resultEl.style.display = "none";

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
				showError(__("Something went wrong. Please try again."));
			})
			.always(() => {
				submitBtn.disabled = false;
				submitBtn.textContent = __("Submit");
			});
	});

	function showVerified(message) {
		resultEl.className = "verify-result mt-4 alert alert-success";
		resultEl.innerHTML = `
			<strong>${frappe.utils.escape_html(message || __("Your email is verified."))}</strong>
		`;
		resultEl.style.display = "block";
	}

	function showNotVerified(message, registrationLink) {
		const link = registrationLink || "#";
		resultEl.className = "verify-result mt-4 alert alert-warning";
		resultEl.innerHTML = `
			<div>${frappe.utils.escape_html(message || __("We could not find your email in our system."))}</div>
			<div class="mt-2">
				<a href="${frappe.utils.escape_html(link)}" class="btn btn-sm btn-primary">
					${__("Immediate Registration")}
				</a>
			</div>
		`;
		resultEl.style.display = "block";
	}

	function showError(message) {
		resultEl.className = "verify-result mt-4 alert alert-danger";
		resultEl.textContent = message;
		resultEl.style.display = "block";
	}
});

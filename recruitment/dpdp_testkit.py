"""Print everything needed to exercise the external DPDP consent flow by hand.

Usage:
    bench --site <site> execute recruitment.dpdp_testkit.show --kwargs "{'appl':'<job applicant id>'}"
"""
import frappe


def show(appl=None):
    from recruitment.recruitment.link_token import offer_token
    from recruitment.dpdp_external_consent import callback_url, is_external_consent_mode
    from recruitment.api.candidate_portal import _dpdp_consent_pending

    s = frappe.get_doc("DPDP Act Settings")
    print("\n--- MODE ---")
    print("enabled           :", s.enabled)
    print("consent_mode      :", s.consent_mode)
    print("external mode on  :", is_external_consent_mode())
    print("enforced          :", s.enforce_before_onboarding)

    print("\n--- CALLBACK (give these to the portal team) ---")
    print("url    :", callback_url())
    print("header :", s.callback_header_name)
    print("secret :", s.get_password("callback_secret", raise_exception=False))

    if not appl:
        print("\nPass appl=<Job Applicant id> for candidate-specific values.")
        return

    row = frappe.db.get_value(
        "Job Applicant", appl, ["applicant_name", "email_id", "phone_number", "status"], as_dict=True
    )
    print("\n--- CANDIDATE", appl, "---")
    print("record            :", row)
    print("consent pending?  :", _dpdp_consent_pending(appl))
    token = offer_token(appl)
    print("offer token       :", token)

    base = frappe.utils.get_url()
    print("\n--- CALLS ---")
    print("start session:")
    print(f"  curl -s -X POST '{base}/api/method/recruitment.dpdp_external_consent.start_consent_session' \\")
    print(f"    -d 'appl={appl}&token={token}'")
    print("\npoll status:")
    print(f"  curl -s '{base}/api/method/recruitment.dpdp_external_consent.get_consent_session_status?appl={appl}&token={token}'")

    print("\n--- SESSIONS ---")
    for r in frappe.get_all("DPDP Consent Session", filters={"job_applicant": appl},
                            fields=["name", "session_id", "status", "short_url", "expires_at"],
                            order_by="creation desc"):
        print(" ", r)

    print("\n--- CONSENT LOGS ---")
    for r in frappe.get_all("Job Applicant DPDP Consent Log", filters={"job_applicant": appl},
                            fields=["name", "consent_source", "external_status", "consent_given",
                                    "status", "docstatus"], order_by="creation desc"):
        print(" ", r)
    print()

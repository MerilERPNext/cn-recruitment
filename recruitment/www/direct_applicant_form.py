"""/direct-applicant-form?t=<token> — the form a direct applicant fills (no login).

The page is a static shell; everything it shows comes from the token-guarded
endpoints in recruitment.api.direct_applicant_portal.
"""

no_cache = 1
allow_guest = True


def get_context(context):
	context.no_breadcrumbs = True
	context.show_sidebar = False
	context.title = "Complete Your Details"

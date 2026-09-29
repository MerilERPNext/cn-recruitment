"""/ctc-proposal?t=<token> — a direct applicant's CTC proposal (no login).

A static shell; the data and the response go through the token-guarded
endpoints in recruitment.api.ctc_proposal_portal.
"""

no_cache = 1
allow_guest = True


def get_context(context):
	context.no_breadcrumbs = True
	context.show_sidebar = False
	context.title = "Your CTC Proposal"

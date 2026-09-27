app_name = "recruitment"
app_title = "Recruitment"
app_publisher = "Prathamesh Jadhav"
app_description = "Recruitment"
app_email = "prathamesh.jadhav@hybrowlabs.com"
app_license = "mit"
# required_apps = []

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/recruitment/css/job_applicant.css"
app_include_js = [
	"/assets/recruitment/js/teams_utils.js",
	# Shared Application Fields grid (styles + renderers + toolbar) used by both
	# Job Applicant Profile Settings and the Job Opening's Job application tab.
	# Included globally rather than per-doctype because a doctype's own JS is
	# evaluated BEFORE any doctype_js hook, which would be too late for it.
	#
	# ?v= is a cache buster. This path carries no content hash (Frappe only
	# fingerprints *.bundle.js), so browsers hold the old copy indefinitely and a
	# change here silently doesn't reach anyone. Bump the number whenever this file
	# changes — the new URL defeats the browser cache and any service worker.
	"/assets/recruitment/js/applicant_fields_ui.js?v=14",
	# Column registry behind the designed Job Applicant / Job Opening / Job
	# Requisition list views — which columns show, in what order, alignment and
	# width, plus the "Configure Columns" dialog. Global rather than per-doctype
	# because a doctype's *_list.js is evaluated after doctype_list_js resolves,
	# which is too late for the lists that build on it. Bump ?v= when it changes.
	"/assets/recruitment/js/list_column_engine.js?v=3",
	# Multi-value list filters: two "Institute Equals …" rows are ANDed by Frappe
	# and can never both match, so a second value empties the list. This folds
	# repeated `=` on one field into a single `in`. Global for the same reason as
	# the column engine — the *_list.js files build on it. Bump ?v= when it changes.
	"/assets/recruitment/js/list_filter_multi.js?v=1",
	# The Group Discussion board — the group cards, the marking table and their CSS.
	# Shared verbatim by the Campus Drive (HR's whole hall) and the Group Discussion
	# doctype (one panel's own group), so the two can never drift into looking or
	# behaving differently. Global rather than per-doctype because both of those load it
	# and a doctype's own JS is evaluated before any doctype_js hook. Bump ?v= when it
	# changes.
	"/assets/recruitment/js/campus_gd_board.js?v=1",
]

add_to_apps_screen = [
	{
		"name": "recruitment",
		"logo": "/assets/recruitment/image/logo.svg",
		"title": "Employee Self Service",
		"route": "/webapp",
		"has_permission": "recruitment.recruitment.utils.check_app_permission",
	}
]

# Home page by Role.
#
# Frappe reads this hook from frappe.website.utils.get_home_page_via_hooks, which
# is reached for the *website root* only -- "/" resolves through resolve_path ->
# get_home_page(). It does NOT drive the post-login redirect: auth.py consults
# get_home_page() on the Website User branch alone and hardcodes the Desk for
# everyone else. The login leg is handled by
# recruitment/recruitment/login_redirect.py, which reads the entries below so the
# two agree -- notably keeping External Recruiters out of the ESS portal.
role_home_page = {
	"System User": "/webapp",
	# External recruiters land on their (scoped) Job Opening list in Desk.
	"External Recruiter": "/app/job-opening",
}
# include js, css files in header of web template
# web_include_css = "/assets/recruitment/css/recruitment.css"
# web_include_js = "/assets/recruitment/js/recruitment.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "recruitment/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [
            ["Custom Field", "module", "=", "Recruitment"],
        ],
    },
    # Property Setters for Job Opening — capture all reorder / hide / label
    # / collapsible changes we made via Customize Form so they ship as fixtures.
    {
        "doctype": "Property Setter",
        "filters": [
            ["Property Setter", "doc_type", "in", [
                "Job Opening",
                "Job Applicant",
                "Job Offer",
                "Job Requisition",
            ]],
        ],
    },
]
# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    # The wizard view reads the tabs job_offer.js renders into, so it loads after it.
    "Job Offer": ["public/js/job_offer.js", "public/js/job_offer_wizard.js"],
    "Job Applicant": [
        "public/js/job_applicant.js",
        "public/js/hiring_workflow_flow.js",
        # View / Download for attachments in the approval panel below.
        "public/js/approval_file_cells.js",
        "public/js/pre_offer_field_approval.js",
        "public/js/job_applicant_banner.js",
        # "Previous Applications" tab — has this candidate applied to us before?
        "public/js/job_applicant_other_applications.js",
        # "Employee Record" tab — is this candidate already/formerly an employee?
        "public/js/job_applicant_employee_record.js",
        "public/js/job_applicant_section_nav.js",
    ],
    "Job Opening": [
        "public/js/job_opening.js",
        "public/js/interview_round_link.js",
        "public/js/hiring_round_counts.js",
        "public/js/job_opening_hiring_workflow.js",
        "public/js/job_opening_attach_resumes.js",
        "public/js/applicant_field_picker.js",
        "public/js/job_opening_eligibility_ui.js",
    ],
    # Same eligibility builder as the Job Opening, editing the campus defaults.
    "Campus Eligibility Settings": ["public/js/job_opening_eligibility_ui.js"],
    "TA Interview Strategy Template": [
        "public/js/interview_round_link.js",
        "public/js/hiring_round_counts.js",
    ],
    "TA Duplicity Check Settings": ["public/js/applicant_field_picker.js"],
    "TA Rehire Check Settings": ["public/js/applicant_field_picker.js"],
    "Job Description": ["public/js/job_description.js"],
    "Job Requisition": ["public/js/job_requisition.js"],
    # Cascading Company -> Department -> Designation pickers on the scope form.
    "Raise Requisition Scope": ["public/js/raise_requisition_scope.js"],
    "Campus Drive": ["public/js/campus_drive.js"],
    "Interview": [
        "public/js/interview.js",
        # Trims the form down to what a panel member needs (panel-only users).
        "public/js/interview_panel_view.js",
        # "Submit Feedback" opens the Interview Feedback FORM instead of HRMS's
        # dialog — the dialog skips the Region Recommendation / Work Location
        # sections, which only exist on the form. Must load AFTER hrms's own
        # interview.js (it is, being a hooks entry) so the override sticks.
        "public/js/interview_feedback_route.js",
    ],
    "Interview Feedback": [
        "public/js/interview_feedback.js",
        # Draws the evaluation form the recruiter picked on the Interview, when
        # there is one. Kept separate from interview_feedback.js, which owns the
        # campus region/work-location sections — the two share no state.
        "public/js/interview_feedback_form.js",
    ],
    "User": ["public/js/user.js"],
    "Employee Onboarding": [
        "public/js/employee_onboarding.js",
        "public/js/employee_onboarding_portal_field_inspector.js",
        "public/js/emp_OB_verification_table.js",
        "public/js/approval_file_cells.js",
        "public/js/emp_OB_field_level_approval.js",
        "public/js/employee_onboarding_statutory.js",
    ],
    "New Hire Form": ["public/js/new_hire_form_builder.js"],
    "Employee Referral": ["public/js/employee_referral_referral_reward.js"],
    "Employee Separation": ["public/js/employee_separation.js"],
    "Employee Promotion": ["public/js/employee_promotion.js"],
    "Employee": ["public/js/employee.js"],
    "Custom Doctype Fields": ["public/js/custom_doctype_fields.js"],
    "Candidate Portal User": ["public/js/candidate_portal_user.js"],
    "Exit Interview": ["public/js/exit_interview.js"],
    "Training Event": ["public/js/training_event.js"],
    "Task": ["public/js/task_onboarding_form.js"],
}

doctype_list_js = {
    "Job Applicant": "public/js/job_applicant_list.js",
    "Job Offer": "public/js/job_offer_list.js",
    "Task": "public/js/task_onboarding_listview.js",
    "Job Opening": "public/js/job_opening_list.js",
    "Job Requisition": "public/js/job_requisition_list.js",
    "Employee Onboarding": "public/js/employee_onboarding_list.js",
}

# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "recruitment/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
website_generators = ["Web Page"]

website_context = {"job_offer": "recruitment.www.get_context"}

permission_query_conditions = {
    "Interview": "recruitment.permissions.doc_type_permissions.interview_query",
    "Job Applicant": "recruitment.permissions.doc_type_permissions.ja_query",
    "Job Opening": "recruitment.permissions.doc_type_permissions.job_opening_query",
    "Campus Invite": "recruitment.permissions.doc_type_permissions.campus_invite_query",
    "Candidate Registration": "recruitment.permissions.doc_type_permissions.candidate_registration_query",
    # A panel member's GD list holds their own groups only.
    "Group Discussion": "recruitment.permissions.doc_type_permissions.group_discussion_query",
}

# A TPO may only read/act on the Candidate Registrations they own (mirrors the
# query condition above at the document level). Everyone else defers to defaults.
has_permission = {
    "Candidate Registration": "recruitment.permissions.doc_type_permissions.candidate_registration_has_permission",
    # Same rule as the query above, applied to a single document — the query only
    # scopes lists, and a GD opened straight by URL never goes through one.
    "Group Discussion": "recruitment.permissions.doc_type_permissions.group_discussion_has_permission",
}

# Jinja
# ----------

# add methods and filters to jinja environment
jinja = {
	"methods": [
		# Build a signed offer-page link in any email template / notification:
		#   {{ job_offer_link(doc.job_applicant) }}
		"recruitment.recruitment.link_token.job_offer_link",
		# Just the token, if you build the URL yourself:
		#   ...?appl={{ doc.job_applicant }}&token={{ offer_token(doc.job_applicant) }}
		"recruitment.recruitment.link_token.offer_token",
		# Campus registration email: build the candidate's apply link (the invite id
		# is carried in the link, never chosen by the candidate):
		#   {{ campus_registration_link(email_id, campus_invite) }}
		"recruitment.recruitment.link_token.campus_registration_link",
	],
}

# Boot
# ------------
# Site-wide column layouts for the designed list views, so the first paint of a
# Job Applicant / Job Opening / Job Requisition list already knows its columns.
extend_bootinfo = "recruitment.api.list_columns.extend_bootinfo"

# Installation
# ------------

# before_install = "recruitment.install.before_install"
after_install = "recruitment.recruitment.install.after_install"
after_migrate = [
    "recruitment.recruitment.install.after_migrate",
    # Configured employee search fields are cached; a migrate can add, rename or
    # drop the columns they point at, so drop the cache rather than let it go stale.
    "recruitment.api.employee_search.clear_cache",
]

# Uninstallation
# ------------

# before_uninstall = "recruitment.uninstall.before_uninstall"
# after_uninstall = "recruitment.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "recruitment.utils.before_app_install"
# after_app_install = "recruitment.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "recruitment.utils.before_app_uninstall"
# after_app_uninstall = "recruitment.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "recruitment.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways


#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# nextai row approval stamps Vacancy Details rows with raw SQL (no doc_events),
# so the requisition's Approved / Rejected Positions counts are updated here, at
# the moment a row's status is written.
on_row_status_update = [
    "recruitment.api.requisition_pipeline.refresh_position_approvals",
]

# Interview feedback via the approval matrix (recruitment.api.interview_feedback_approval).
approval_form_schema = [
    "recruitment.api.interview_feedback_approval.add_result_question",
]
on_approval_form_submit = [
    "recruitment.api.interview_feedback_approval.create_feedback_from_approval",
]

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    # No approval moves on an archived requisition — every Approve / Reject /
    # Send Back from a ToDo saves the tracker, so this catches them all.
    "Approval Tracker": {
        "validate": "recruitment.api.requisition_status.block_approval_on_archived",
        # nextai hands interviewers their feedback tasks after the Interview has
        # committed; settle those tasks against what is already known when they
        # land (per-interviewer forms, feedback already in, a cancelled interview).
        "on_update": "recruitment.api.interview_feedback_approval.reconcile_interview_approval",
    },
    # Custom Doctype Fields (nextai) decides where a managed field sits on the
    # Job Applicant form. Job Applicant Profile Settings groups fields into its
    # own curated sections and never re-groups an existing row, so a managed
    # field moved on the form kept its old settings section — and one deleted and
    # re-added could stay suppressed for good. Re-place them on every config save.
    "Custom Doctype Fields": {
        "on_update": "recruitment.recruitment.managed_field_profile_sync.sync_managed_field_placement",
    },
    "Custom Field": {
        # Forget the field in synced_field_refs the moment it is deleted, so one
        # created later under the same name reads as new instead of "already seen".
        "on_trash": "recruitment.recruitment.managed_field_profile_sync.forget_deleted_field",
    },
    "Job Applicant Profile Settings": {
        # A field Mandatory for any source (Careers, IJP, Refer, Campus,
        # Pre-offer) is put on every New Hire Form as Required — a direct hire
        # skips those forms and must not skip the data.
        "on_update": "recruitment.recruitment.new_hire_source_fields.sync_all_forms",
    },
    # "Salary Structure Assignment": {
    # 	"on_submit": "recruitment.customizations.salary_structure_assignment.salary_structure_assignment.on_submit",
    # },
    "Employee Promotion": {
        "on_submit": "recruitment.customizations.employee_promotion.employee_promotion.on_submit",
    },
    "Institute": {
        # Welcome the Primary TPO — on creation, and on any later edit that adds
        # one. Sent once per contact (Institute TPO Contact.welcome_sent), and only
        # while Campus Settings says so.
        "after_insert": "recruitment.recruitment.tpo_mailers.send_tpo_welcome",
        "on_update": "recruitment.recruitment.tpo_mailers.send_tpo_welcome",
    },
    # An edited evaluation form must not leave interviewers filling the old
    # questions. The schema cache also revalidates itself against `modified`, so
    # this is the fast path rather than the only protection.
    "Microapp Form Widget": {
        "on_update": "recruitment.api.interview_feedback_form.clear_form_cache",
    },
    "Interview": {
        "before_save": "recruitment.customizations.interview.interview.check_feedback_of_previous_interview",
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
        # Mirror the candidate's resume onto the interview, so the panel can open it
        # without permission on the Job Applicant it is attached to.
        "on_update": [
            "recruitment.api.interview_resume.pull_resume_from_applicant",
            # Roll "Interview Scheduled / Done" up to the requisition behind this
            # candidate's opening. Never raises — see requisition_pipeline.
            "recruitment.api.requisition_pipeline.refresh_from_interview",
            # A decided or cancelled interview owes nobody feedback: close the
            # panel's feedback tasks (recruitment.api.stage_interview).
            "recruitment.api.stage_interview.close_tasks_when_decided",
            # Feedback forms picked or changed after the interviewers' approval
            # tasks went out reach those tasks (recruitment.api.interview_feedback_approval).
            "recruitment.api.interview_feedback_approval.sync_forms_on_interview_update",
        ],
        "on_submit": "recruitment.api.requisition_pipeline.refresh_from_interview",
        "on_cancel": "recruitment.api.requisition_pipeline.refresh_from_interview",
        "on_trash": "recruitment.api.requisition_pipeline.refresh_from_interview",
    },
    "Interview Feedback": {
        "validate": [
            # Stamp the candidate's region on the feedback and check the work
            # location the panel picked is one of that region's locations.
            "recruitment.api.interview_work_location.validate_work_location",
            # When the interview has an evaluation form configured, enforce its
            # required answers and freeze what the answers meant. On validate, not
            # on_submit: the submit chain below already re-saves the Interview, and
            # a missing answer should be flagged while the panel is still writing.
            "recruitment.api.interview_feedback_form.validate_form_response",
            # Each skill row carries its description — the round's Expected Skill
            # Set text, else the Skill master's.
            "recruitment.customizations.interview_feedback.interview_feedback.fill_skill_descriptions",
            # Nothing is filed against an interview the hiring workflow cancelled.
            "recruitment.api.stage_interview.block_feedback_on_cancelled",
        ],
        "on_submit": [
            "recruitment.customizations.interview_feedback.interview_feedback.on_submit_feedback",
            # The interviewer's feedback task in their Tasks list is done.
            "recruitment.api.stage_interview.close_task_on_feedback",
            # Feedback given straight on the Interview settles that interviewer's
            # approval task too, so it doesn't linger in their Tasks list.
            "recruitment.api.interview_feedback_approval.close_approval_task_on_feedback",
            # The work location the panel chose becomes the candidate's final
            # location (Job Applicant.custom_location).
            "recruitment.api.interview_work_location.apply_work_location",
            # An interviewer may suggest the candidate suits another region. This only
            # records it and flags HR — the candidate is not moved until HR accepts.
            "recruitment.customizations.interview_feedback.interview_feedback.record_region_suggestion",
            # After the verdict is set on the Interview, advance/reject the
            # candidate's hiring stage (only for stages flagged "auto").
            "recruitment.customizations.interview_feedback.interview_feedback.auto_advance_stage",
            # A campus additional round decides the round it was added to: cleared
            # hands the candidate to the next round, rejected rejects them. Anchors
            # on the round, so it completes what the generic advance above cannot.
            "recruitment.recruitment.doctype.campus_drive.campus_drive.advance_after_extra_round",
        ]
    },
    "Job Offer": {
        # Nothing here touches a DRAFT. An offer is negotiated over several saves and
        # the joining date is often the last thing agreed, so saving is never blocked
        # or rewritten — everything below happens at the moment the offer is SENT.
        #
        # Order matters: fill Employee Type first, then check what is still missing,
        # so the check never rejects an offer for a value it could have derived.
        "before_submit": [
            "recruitment.customizations.job_offer.set_employment_type",
            "recruitment.customizations.job_offer.validate_offer_is_complete",
            # Last of the three: it matches the offer against the Document
            # Template assignments, and Employee Type is one of the attributes
            # templates are commonly scoped by — so it has to run after the stamp
            # above, never before it.
            "recruitment.recruitment.offer_document_template.validate_offer_document_template",
        ],
        # An amended offer starts unsent, so the send rules in Recruitment Settings
        # (Action Center item, Send lock, Withdraw) treat it as the new letter it is.
        "before_insert": "recruitment.recruitment.offer_send_rules.reset_send_status_on_amend",
        "validate": [
            "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
            # Hiring Lead Permission Settings (change designation at offer stage).
            "recruitment.customizations.hiring_lead_permissions.validate_job_offer_hiring_lead_edits",
            # Active offer / missing requisition / no headcount left. Runs on
            # insert only, so every creation path is gated, not just the
            # hiring workflow button.
            "recruitment.api.offer_validation.validate_job_offer",
            # Record the requisition this offer draws on and pull its agreed
            # Fixed / Variable Pay across. Only fills empty fields.
            "recruitment.customizations.job_offer.set_requisition_and_pay",
            # Region: the field's own fetch_from covers the candidate's interview
            # region; this reaches the region applied under and the opening's.
            # On save, not at submit — HR is meant to see and change it while
            # drafting. Only fills when empty.
            "recruitment.customizations.job_offer.set_offer_region",
            # The position this offer consumes must belong to the offer's
            # requisition and still be free. Runs before save so a stale pick is
            # rejected rather than silently claiming the wrong row.
            "recruitment.api.offer_position.validate_position_choice",
            # Every salary figure's "(In Words)" field follows the figure.
            "recruitment.customizations.job_offer.set_salary_in_words",
            # Offer-time duplicity rules from TA Duplicity Check Settings: an
            # active offer held by the same person under another application, and
            # the employee-pool outcomes (block / exceptional approval / allow).
            "recruitment.customizations.ta_duplicity_job_offer.check_job_offer_duplicity",
        ],
        "before_save": [
            "recruitment.customizations.job_offer.calculate_salary_structure",
            # Again after CTC (Total) is computed above.
            "recruitment.customizations.job_offer.set_salary_in_words",
        ],
        # The Action Center item is synced from on_update below, which Frappe also
        # runs on insert and on submit — listing it here too ran it twice.
        "after_insert": [
            "recruitment.api.requisition_pipeline.refresh_from_job_offer",
            # Claim the position (Filled + candidate) while the offer is live,
            # release it the moment it is withdrawn / rejected / cancelled, then
            # roll the result up to the requisition. Wired to every lifecycle
            # event so no path can leave offer and position disagreeing.
            "recruitment.api.offer_position.sync_offer_position",
        ],
        "on_submit": [
            "recruitment.api.offer_position.sync_offer_position",
            # "Offer Generated" on the requisition's TAT block.
            "recruitment.api.requisition_pipeline.refresh_from_job_offer",
        ],
        # Reflect Accepted/Rejected offer outcome on the candidate's hiring stage.
        "on_update": [
            # A draft whose Status is set to Withdrawn / Expired by hand must drop
            # its Action Center item too — before, only submitted offers did.
            "recruitment.api.action_center.sync_job_offer_action_item",
            "recruitment.api.hiring_stage.advance_on_job_offer_outcome",
            "recruitment.api.offer_position.sync_offer_position",
            # Stamp the day the candidate accepted. Both update events, because
            # `status` is allow_on_submit — an offer accepted after submit never
            # reaches validate. Writes once, then never again.
            "recruitment.customizations.job_offer.stamp_offer_accepted_on",
        ],
        "on_update_after_submit": [
            "recruitment.api.action_center.sync_job_offer_action_item",
            "recruitment.api.hiring_stage.advance_on_job_offer_outcome",
            "recruitment.api.offer_position.sync_offer_position",
            "recruitment.customizations.job_offer.stamp_offer_accepted_on",
        ],
        "on_cancel": [
            "recruitment.api.offer_position.sync_offer_position",
            # Drop the cancelled offer's Action Center card; the amended offer raises its own.
            "recruitment.api.action_center.sync_job_offer_action_item",
            # "Offer Cancelled" on the candidate's hiring workflow (newest version only).
            "recruitment.api.offer_lifecycle.on_offer_cancel",
            "recruitment.api.requisition_pipeline.refresh_from_job_offer",
            "recruitment.recruitment.hr_ops_offer_review.close_hr_ops_todos",
        ],
        # "Send Job Offer" stamps email_status with db_set, which raises only
        # on_change — so that is where the HR Ops "verify & release" ToDos close.
        "on_change": "recruitment.recruitment.hr_ops_offer_review.close_hr_ops_todos",
        # Deleting an offer has to hand the position back too. sync_offer_position
        # cannot cover this one: it decides claim-vs-release from the offer's
        # status, and a deleted offer has none.
        "on_trash": "recruitment.api.offer_position.release_offer_position",
    },
    "Job Requisition": {
        "before_insert": [
            # Gate: only the roles/employees configured under Raise Requisition
            # Scope may raise requisitions — deny by default, with the built-in
            # "Default - System Managers" record as the always-present grant.
            # Authoritative block across Desk, React/ESS API and scripted inserts.
            "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.enforce_can_raise",
        ],
        "validate": [
            # While a row-level approval stage is running, every position row has
            # its own approval task. Adding a row would let an unapproved position
            # through and removing one would strand a live task, so the table is
            # frozen until the approval completes or is revoked.
            "nextai.funnel.doctype.funnel_task.utils.row_approval.guard_row_table_edits",
            # Keep no_of_positions in sync with the actual custom_position_details
            # row count on every save (Desk UI edits, scripted updates, etc.).
            "recruitment.api.job_requisition.sync_no_of_positions",
            # Enforce Recruitment Settings -> Job Requisition Settings
            # (max positions, replacement-employee restriction & uniqueness).
            "recruitment.api.job_requisition.validate_requisition_settings",
            # Status set to Archived by hand: same role / state checks as the
            # Archive button (the on_update cleanup below revokes approvals).
            "recruitment.api.requisition_status.guard_manual_archive",
            # Recruitment Settings -> "Enable AOP Budget Check": refuse a
            # requisition whose Salary Range (Max) x positions is more than its
            # Department / Cost Center budget has left. Runs after
            # sync_no_of_positions so the position count is current.
            "recruitment.api.requisition_budget.enforce_budget",
            # Capture the Regions child table's region on the parent
            # `custom_region` so it is filterable/reportable from the
            # requisition itself — same mirror as on the Job Opening.
            "recruitment.customizations.job_requisition_region.set_region_from_regions_table",
            # The Lateral counterpart: the Position Details table's location on
            # `custom_position_location`, and onto the empty `custom_location`.
            "recruitment.customizations.job_requisition_region.set_location_from_position_details",
            # A Fresher requisition may not be approved until every region row
            # names its recruiter and its pay — each region's Job Opening is built
            # from that row, and an opening with no recruiter belongs to nobody.
            # Fires on the transition into an approved status only.
            "recruitment.api.job_requisition.enforce_fresher_region_readiness",
            # Days between posting_date and expected_by, kept on the requisition
            # so the requested wait is visible and reportable.
            "recruitment.customizations.job_requisition.set_days_to_expected_by",
        ],
        "on_update": [
            # A Fresher requisition hires across several regions at once. Reaching
            # "Approved Active" is what turns each region row into its own fully
            # populated Job Opening (headcount, recruiter, pay, Campus posting,
            # campus hiring workflow). Idempotent — a region already carrying an
            # opening is skipped. Lateral requisitions are untouched.
            "recruitment.customizations.fresher_openings.create_openings_for_regions",
            # Once a requisition is approved its positions "start appearing in the
            # position master": materialise the per-position tracking rows
            # (custom_position_summary) from the headcount rows
            # (custom_position_details). Idempotent, so it is safe on every update.
            "recruitment.api.requisition_status.materialise_positions_on_approval",
            # Status changed to Archived by hand: cancel every open ToDo and revoke
            # the approval in flight, exactly as the Archive button does.
            "recruitment.api.requisition_status.close_tasks_when_archived",
            # Store "how many of this designation do we already have in this region"
            # and "how much are we already hiring there". Runs here rather than in
            # validate because these are derived columns: written during validate
            # they would look like a business edit to the edit-after-approval guard
            # and every save of an approved requisition would be refused.
            "recruitment.api.requisition_headcount.store_headcount",
            # The "TAT Information" block: how many candidates the requisition's
            # openings collected and how far they got, plus its own position
            # approvals. Same on_update reasoning as store_headcount above.
            "recruitment.api.requisition_pipeline.store_pipeline",
            # Over Budget flag for the form banner — derived, so written here with
            # db.set_value for the same reason as store_headcount above.
            "recruitment.api.requisition_budget.store_budget_flag",
        ],
    },
    # Accounts edit the AOP budget / utilization by hand on these masters; an edit
    # re-flags live requisitions right away instead of at the nightly run.
    "Cost Center": {
        "on_update": "recruitment.api.requisition_budget.on_budget_master_update",
    },
    "Department": {
        "on_update": "recruitment.api.requisition_budget.on_budget_master_update",
    },
    "Job Opening": {
        # Job Title from the requisition's Job Description (else the Designation's
        # name, never its id) and Experience from the requisition's range. Before
        # validate so HRMS builds the web route from the right title.
        "before_validate": "recruitment.customizations.job_opening_from_requisition.set_fields_from_requisition",
        "validate": [
            # An opening raised from a requisition inherits its recruiter — without
            # one the opening belongs to nobody. Creation only, and on every path
            # (the Desk mapper, the web app's Resource API call, an import).
            "recruitment.customizations.job_requisition.require_recruiter_on_new_opening",
            # Enforce Recruitment Settings -> Job Posting Settings
            # (mandatory Job Description, no posting without linked positions).
            "recruitment.customizations.job_opening_settings.validate_job_posting_settings",
            # Hiring Lead Permission Settings (external recruiter / application fields).
            "recruitment.customizations.hiring_lead_permissions.validate_job_opening_hiring_lead_edits",
            # Recruitment Settings can make Screening / Shortlist compulsory stages.
            "recruitment.api.hiring_stage.validate_job_opening_compulsory_stages",
            # "No. of Shortlisting / Screening / Interview Rounds" mirror the stage rows.
            "recruitment.api.hiring_stage.set_job_opening_round_counts",
            # Compute each External Recruiter row's read-only posting status from its
            # Display From/To window so the grid reflects live availability.
            "recruitment.permissions.doc_type_permissions.set_external_recruiter_posting_status",
            # Capture the Regions child table's region on the parent `custom_region`
            # so it is searchable/filterable from the Job Opening (search_fields).
            "recruitment.customizations.job_opening_region.set_region_from_regions_table",
            # A Fresher opening advertises ITS region's headcount. `vacancies` is
            # fetched from the requisition's total, which is the sum across every
            # region — right for Lateral, wrong here, and re-applied on every save.
            "recruitment.customizations.fresher_openings.sync_vacancies_from_region",
            # Guarantee a collision-free web route — sibling requisitions (same
            # company + designation) would otherwise generate an identical route
            # and fail with "Route must be unique". Runs last so it de-duplicates
            # whatever route HRMS / earlier hooks settled on.
            "recruitment.customizations.job_opening_settings.ensure_unique_route",
            # First save on which the opening is posted to Campus: copy the default
            # eligibility conditions from Campus Eligibility Settings onto it.
            "recruitment.recruitment.eligibility_engine.apply_default_eligibility_rules",
            # A field locked in Job Applicant Profile Settings is frozen for every
            # opening: discard any per-opening override for it. The tab renders
            # those rows disabled, but a disabled control is not a rule — the
            # override table is ordinary child data the API can write.
            "recruitment.recruitment.doctype.job_applicant_profile_settings.job_applicant_profile_settings.enforce_locked_fields",
        ],
        # Tell an external recruiter the opening is theirs to work on. Both events
        # so a recruiter added to an existing opening is mailed too; sent once per
        # recruiter per posting row (Job Opening Posting Channel.notified_recruiters),
        # and only while Recruitment Settings says so.
        "after_insert": "recruitment.recruitment.external_recruiter_mailers.notify_assigned_recruiters",
        "on_update": [
            "recruitment.recruitment.external_recruiter_mailers.notify_assigned_recruiters",
            # Saving an opening against an Approved Draft requisition is what
            # activates it: the requisition becomes Approved Active and its
            # positions open, so an offer can be raised against them. Same step
            # the "Activate" action performs, applied to the create path too.
            "recruitment.api.requisition_status.activate_requisition_on_opening",
        ],
    },
    "Employee": {
        "before_insert": "recruitment.customizations.job_applicant.validate_blacklist_employee",
        "after_insert": [
            "recruitment.auto_fetch_fields.link_employee_to_onboarding",
            # On hire of a referred candidate, generate the Referral Reward + payout schedule.
            "recruitment.recruitment.referral_reward_engine.generate_referral_reward_on_employee",
        ],
        # New Hire: a pending hire's company email is asked at activation, so
        # its Employee-level `reqd` is deferred until then (every other
        # mandatory field is still checked, in before_save).
        "before_validate": "recruitment.api.new_hire.defer_activation_fields",
        "before_save": [
            "recruitment.recruitment.employee_confirmation_hooks.calculate_final_confirmation_date",
            "recruitment.api.new_hire.check_deferred_mandatory",
        ],
        "validate": [
            # Auto-fill Relieving Date ("Last Working Day") with today on the
            # real transition to Left/Inactive, if HR left it blank.
            "recruitment.recruitment.alumni_user_switch.auto_set_relieving_date",
            # Validate Personal Email when alumni checkbox is being enabled.
            "recruitment.recruitment.alumni_checkbox_handler.validate_alumni_personal_email_for_checkbox",
        ],
        "on_update": [
            # Company-email login follows Employee.status: disabled while the
            # employee is Left / Inactive. Never touches the alumni account.
            "recruitment.recruitment.employee_user_state.disable_company_user_on_exit",
            # Keep the User's "Is Alumni Employee" flag in sync with Employee's checkbox
            # (only sets that flag on the User; never touches Employee.status or User.enabled).
            "recruitment.recruitment.alumni_portal.sync_alumni_flag",
            # Alumni (personal-email) User follows the checkbox:
            # checkbox 0→1: create/reuse Alumni User from Personal Email
            # checkbox 1→0: disable the Alumni User
            # Never touches the company-email User (that is status-driven, above).
            "recruitment.recruitment.alumni_checkbox_handler.handle_alumni_checkbox_change",
            # New Hire: hand a pending Employee to onboarding the moment the
            # approval matrix clears it — but only when its New Hire Form ticks
            # "Initiate Onboarding on Approval". A no-op for every real employee
            # (it returns immediately unless status is Pending).
            "recruitment.api.new_hire.auto_initiate_on_approval",
        ],
    },
    "Job Applicant": {
        "before_insert": [
            # Duplicity check: match keys mandatory, rejection cooldown, and the
            # multi-position rules — for candidates and for IJP. The employee-pool
            # rules from the same settings record are decided at the Job Offer
            # instead (see ta_duplicity_job_offer); ta_rehire_check now only
            # DETECTS, feeding the Job Applicant's Employee Record tab.
            "recruitment.customizations.ta_duplicity_check.check_duplicity",
        ],
        "before_save": [
            "recruitment.customizations.job_applicant.validate_blacklist",
            # Campus candidates arrive carrying their Campus Invite; resolve the
            # Campus Drive that selected that invite so the drive link is filled
            # for applications created after the drive was set up.
            "recruitment.recruitment.campus_helpers.set_applicant_drive_from_invite",
        ],
        "validate": [
            # Hiring Lead Permission Settings (update candidate source).
            "recruitment.customizations.hiring_lead_permissions.validate_job_applicant_hiring_lead_edits",
            # Rebuild custom_full_name from the name parts. The parts are what the
            # candidate typed (first / middle / surname, each in its own field); the
            # full name is derived here and is the doctype's title, so nothing else
            # ever has to join them — which is what produced "Neha Iyer Iyer".
            "recruitment.api.applicant_name.set_full_name",
            # A region change unsettles where the candidate would be posted: the
            # branch on them belongs to the region they are leaving, so it is
            # cleared and the next panel picks one in the new region.
            "recruitment.api.interview_work_location.clear_location_on_region_change",
            # Uppercase / de-space the PAN and check its shape. PAN is a match key
            # for the rehire check, and a mistyped one silently matches nothing.
            "recruitment.api.applicant_pan.normalize_pan",
        ],
        # Place a new applicant on the linked opening's first hiring stage
        # (no-op unless the Hiring Workflow feature is enabled).
        "after_insert": [
            "recruitment.api.hiring_stage.seed_first_stage",
            # A new candidate changes "Candidates Applied" on the requisition
            # behind their opening.
            "recruitment.api.requisition_pipeline.refresh_from_applicant",
        ],
        # A resume uploaded after the interviews were scheduled still has to reach
        # the panel — see recruitment.api.interview_resume.
        "on_update": [
            "recruitment.api.interview_resume.push_resume_to_interviews",
            # Stage moves change Screened / Shortlisted on the requisition's TAT
            # block. Never raises — see requisition_pipeline.
            "recruitment.api.requisition_pipeline.refresh_from_applicant",
        ],
        "on_trash": "recruitment.api.requisition_pipeline.refresh_from_applicant",
    },
    "Appointment Letter": {
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes"
    },
    # Alumni Employee Request: when the approval Workflow reaches "Approved",
    # flag the linked Employee as an alumnus (once). See
    # recruitment.recruitment.alumni_employee_request_service.handle_workflow_transition.
    "Alumni Employee Request": {
        "on_update": "recruitment.recruitment.alumni_employee_request_service.handle_workflow_transition",
    },
    "Employee Onboarding": {
        # Mark an onboarding raised from a New Hire form. Must run before the
        # mandatory check, because the flag is what makes `job_offer` optional
        # for a direct hire — and only for a direct hire.
        "validate": [
            "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
            # Server-side half of the direct-hire exemption: `job_offer` is no
            # longer `reqd` on the meta (so a direct hire can save), and Frappe
            # does not enforce `mandatory_depends_on` outside the desk form — so
            # the requirement is kept here for everyone else.
            "recruitment.api.new_hire.require_job_offer_unless_direct_hire",
        ],
        # "before_save": "recruitment.customizations.employee_onboarding.document_verification.update_verification_documents",
        "before_save": [
            "recruitment.recruitment.onboarding_extras.auto_map_manager",
            # HRMS copies template activities without the custom Email Template
            # field; this fills it on new rows from the onboarding template.
            "recruitment.recruitment.onboarding_extras.copy_activity_email_templates",
        ],
        # Tasks are no longer created on submit (see overide_class.on_submit) —
        # they're created via the "Create Onboarding Tasks" button, which stamps
        # task metadata itself. This hook only keeps metadata fresh on post-submit
        # edits (e.g. DOJ / Postponed changes).
        "on_update_after_submit": [
            "recruitment.recruitment.onboarding_extras.populate_onboarding_task_meta",
            # The DOJ outcome is decided AFTER the onboarding is submitted — an
            # Employee cannot be created from a draft (see overide_class), and the
            # manager answers on their joining-day task, by which time the
            # onboarding is long submitted. Registered on on_update alone, this
            # handler could never run for that: a post-submit save fires
            # on_update_after_submit and nothing else. Joined / Not Joined /
            # Postponed were therefore all inert in practice.
            "recruitment.recruitment.onboarding_extras.handle_doj_outcome",
            # Same reason: the portal-field approvals that decide boarding_status
            # continue after submit.
            "recruitment.api.field_level_approval.refresh_boarding_status",
        ],
        "on_update": [
            "recruitment.auto_fetch_fields.update_employee_fields",
            "recruitment.recruitment.onboarding_extras.handle_doj_outcome",
            # New Hire: mark the pending Employee ready once field-level
            # approval has cleared every portal field. Activation stays a
            # deliberate act. No-op for a recruitment onboarding.
            "recruitment.api.new_hire.stage_from_onboarding",
            # Keep boarding_status a function of the candidate portal field
            # approvals, whatever route changed them. No-op when the onboarding
            # has no portal fields. See field_level_approval.refresh_boarding_status.
            "recruitment.api.field_level_approval.refresh_boarding_status",
        ],
    },
    "Project": {
        # HRMS rewrites Employee Onboarding.boarding_status from task completion on
        # every Project save. Only relevant while Onboarding Settings -> "Complete
        # Onboarding on Form Approval" is on, where the candidate's form owns that
        # status instead; this puts the form's answer back. No-op otherwise.
        "on_update": "recruitment.api.field_level_approval.protect_boarding_status_from_task_sync",
    },
    "Employee Separation": {
        "before_insert": [
            "recruitment.customizations.employee_separation.employee_separation.calculate_lwd_from_notice_period",
            "recruitment.customizations.employee_separation.employee_separation.add_unpaid_expense_claims",
            "recruitment.customizations.employee_separation.employee_separation.add_absent_days",
            "recruitment.customizations.employee_separation.employee_separation.populate_relationship_reassignments",
            "recruitment.customizations.employee_separation.employee_separation.add_pending_leave_attendance",
        ],
        "on_submit": [
            "recruitment.customizations.employee_separation.employee_separation.update_employee_relieving_date",
            "recruitment.customizations.employee_separation.employee_separation.create_attendance_regularize_todo",
            # Mirror "Mark Do Not Rehire?" onto the Employee, so the flag the
            # rehire check reads is visible on the employee's own record. Never
            # clears it — see ta_rehire_check.mirror_do_not_rehire_to_employee.
            "recruitment.customizations.ta_rehire_check.mirror_do_not_rehire_to_employee",
        ],
        "on_trash": [
            "recruitment.customizations.employee_separation.funnel_cleanup.cleanup_separation_funnel_artifacts",
        ],
    },
}

# apps/recruitment/recruitment/recruitment/hooks.py
# Scheduled Tasks
# ---------------

scheduler_events = {
    "cron": {
        # A requisition archived by a raw backend write fires no hook: close its
        # open ToDos / approval on the next pass.
        "*/10 * * * *": [
            "recruitment.api.requisition_status.sweep_archived_requisitions",
        ],
        "59 23 * * *": [
            "recruitment.customizations.employee_separation.task_reassignment.reassign_employee_separation_tasks",
            "recruitment.customizations.employee_onboarding.overide_class.reassign_tasks",
        ],
        "0 6 * * *": [
            "recruitment.recruitment.scheduled_jobs.trigger_confirmation_todos",
            "recruitment.recruitment.scheduled_jobs.create_extension_confirmations",
            # Move Campus Drives through Draft -> Live -> Completed by their window.
            "recruitment.recruitment.doctype.campus_drive.campus_drive.update_drive_statuses",
        ],
        "0 7 * * *": [
            "recruitment.recruitment.scheduled_jobs.create_pending_confirmation_separations",
            "recruitment.recruitment.scheduled_jobs.reassign_employee_relationships_on_relieving",
            "recruitment.recruitment.scheduled_jobs.process_separation_leave_attendance_requests",
            "recruitment.recruitment.scheduled_jobs.auto_confirm_employees_without_policy",
        ],
        "0 1 * * *": [
            # Offers whose Expiry Date passed with no answer from the candidate
            # become "Expired" and hand their position back. Runs before the
            # auto-withdraw sweep below, so a lapsed letter is reported as
            # expired rather than withdrawn.
            "recruitment.api.offer_expiry.expire_overdue_offers",
            "recruitment.recruitment.onboarding_extras.refresh_onboarding_task_days_to_join",
            "recruitment.recruitment.scheduled_jobs.mark_relieved_employees_as_left",
            "recruitment.recruitment.scheduled_jobs.auto_separate_employees_on_lwd",
            # AOP budget: re-flag live requisitions their Department / Cost Center
            # budget left no longer covers. No-op (clears flags) when disabled.
            "recruitment.api.requisition_budget.refresh_over_budget_flags",
            # Recruitment Settings -> "Auto-withdraw Offer if Candidate Not
            # Activated by DOJ": withdraw offers past DOJ + grace days whose
            # candidate has no Employee. No-op while the setting is off.
            "recruitment.api.offer_auto_withdraw.auto_withdraw_unjoined_offers",
        ],
        "30 1 * * *": [
            # Pay every referral reward installment that is due and still eligible.
            "recruitment.recruitment.referral_reward_engine.process_due_referral_payouts",
        ],
        "0 2 * * *": [
            # TA SLA Settings engine — no-op unless "Enable SLA & TAT Tracking" is
            # on. Flags candidates overdue in their current stage, then archives
            # its own stale breach ToDos. See recruitment.recruitment.sla_tat_engine.
            "recruitment.recruitment.sla_tat_engine.scan_sla_breaches",
            "recruitment.recruitment.sla_tat_engine.archive_sla_breach_todos",
        ],
    }
}


# Testing
# -------

# before_tests = "recruitment.install.before_tests"

# Overriding Methods
# ------------------------------
#
override_whitelisted_methods = {
    "hrms.hr.doctype.employee_onboarding.employee_onboarding.make_employee": "recruitment.customizations.employee_onboarding.employee_onboarding.make_employee",
    # Gate "Create Employee" from a Job Offer behind the Hiring Lead Permission
    # Setting 'Allow Hiring lead to Add Employee From Offer'.
    "hrms.hr.doctype.job_offer.job_offer.make_employee": "recruitment.customizations.job_offer.make_employee",
    # "Create Job Opening" on Job Requisition: redirect HRMS's mapper to ours,
    # which maps every shared field (incl. recruitment custom fields) and fixes
    # HRMS's misplaced field_map. No JS/HRMS change — the existing button routes
    # through frappe.override_whitelisted_method during make_mapped_doc.
    "hrms.hr.doctype.job_requisition.job_requisition.make_job_opening": "recruitment.customizations.job_requisition.make_job_opening",
    # HRMS's version filters on the retired status "Filled" -> card always 0.
    "hrms.hr.doctype.job_requisition.job_requisition.get_avg_time_to_fill": "recruitment.customizations.job_requisition.get_avg_time_to_fill",
}
override_doctype_class = {
    "Employee Onboarding": "recruitment.customizations.employee_onboarding.overide_class.CustomEmployeeOnboarding",
    "Job Offer": "recruitment.customizations.job_offer.CustomJobOffer",
    # Disable HRMS's (designation, department, requested_by) duplicate check —
    # our flow raises one requisition per location, so those siblings are valid.
    # See recruitment.customizations.job_requisition.CustomJobRequisition.
    "Job Requisition": "recruitment.customizations.job_requisition.CustomJobRequisition",
    "Employee Separation": "recruitment.customizations.employee_separation.override_class.CustomEmployeeSeparation",
    # Offer letter placeholders: link titles, every Job Offer link as
    # {{link.field}}, formatted currency. See the module docstring.
    "Document Template": "recruitment.customizations.document_template.RecruitmentDocumentTemplate",
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "recruitment.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
before_request = [
	# Override ERPNext's automatic User disable on Employee Inactive status.
	# User state is controlled EXCLUSIVELY by the custom_is_alumni_employee
	# checkbox via the alumni_checkbox_handler, not by Employee.status changes.
	"recruitment.recruitment.employee_user_state_override.apply_patch",
	# Hides Todo Type rows opted out of the ESS Portal (Alumni Portal on, ESS
	# off) from cn_todo_manager's own get_todo_list -- every caller (the ESS
	# dashboard widget, the embedded task-manager app, plain Desk access)
	# funnels through the same query builder, so this is patched there rather
	# than duplicated per caller. Alumni Portal sessions are exempted; see
	# overrides/todo_ess_visibility.py for the full rationale.
	"recruitment.recruitment.overrides.todo_ess_visibility.apply_patch",
	# Send an already-signed-in System User who opens /login to /webapp rather
	# than frappe's Desk default. Only this one leg of the portal redirect is a
	# before_request hook -- the login itself is redirected by a patch installed
	# from recruitment/__init__.py, because init_request runs LoginManager
	# before it runs these hooks. See recruitment/recruitment/login_redirect.py.
	"recruitment.recruitment.login_redirect.redirect_signed_in_login_page",
]
# after_request = ["recruitment.utils.after_request"]

# Job Events
# ----------
# before_job = ["recruitment.utils.before_job"]
# after_job = ["recruitment.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# Centralized Alumni Portal isolation: runs after the session user is resolved,
# on every request. Confines alumni sessions to the alumni_portal namespace and
# leaves every other user (ESS) completely unaffected. See alumni_guard.py.
auth_hooks = [
    "recruitment.recruitment.alumni_guard.enforce_alumni_isolation"
]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

website_route_rules = [
    {"from_route": "/webapp/<path:app_path>", "to_route": "/webapp"},
]

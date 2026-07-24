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

# on_session_creation = [
#      "recruitment.www.custom_login.role_based_home_page"
# ]
# website user home page (by Role)
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
    "Job Offer": ["public/js/job_offer.js"],
    "Job Applicant": [
        "public/js/job_applicant.js",
        "public/js/hiring_workflow_flow.js",
        "public/js/pre_offer_field_approval.js",
    ],
    "Job Opening": [
        "public/js/job_opening.js",
        "public/js/job_opening_hiring_workflow.js",
        "public/js/job_opening_attach_resumes.js",
        "public/js/applicant_field_picker.js",
    ],
    "TA Duplicity Check Settings": ["public/js/applicant_field_picker.js"],
    "TA Rehire Check Settings": ["public/js/applicant_field_picker.js"],
    "Job Description": ["public/js/job_description.js"],
    "Job Requisition": ["public/js/job_requisition.js"],
    "Campus Drive": ["public/js/campus_drive.js"],
    "Interview": ["public/js/interview.js"],
    "User": ["public/js/user.js"],
    "Employee Onboarding": [
        "public/js/employee_onboarding.js",
        "public/js/employee_onboarding_portal_field_inspector.js",
        "public/js/emp_OB_verification_table.js",
        "public/js/emp_OB_field_level_approval.js",
        "public/js/employee_onboarding_statutory.js",
    ],
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
}

# A TPO may only read/act on the Candidate Registrations they own (mirrors the
# query condition above at the document level). Everyone else defers to defaults.
has_permission = {
    "Candidate Registration": "recruitment.permissions.doc_type_permissions.candidate_registration_has_permission",
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

# Installation
# ------------

# before_install = "recruitment.install.before_install"
after_install = "recruitment.recruitment.install.after_install"
after_migrate = [
    "recruitment.recruitment.install.after_migrate",
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

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    # "Salary Structure Assignment": {
    # 	"on_submit": "recruitment.customizations.salary_structure_assignment.salary_structure_assignment.on_submit",
    # },
    "Employee Promotion": {
        "on_submit": "recruitment.customizations.employee_promotion.employee_promotion.on_submit",
    },
    "Interview": {
        "before_save": "recruitment.customizations.interview.interview.check_feedback_of_previous_interview",
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
    },
    "Interview Feedback": {
        "on_submit": [
            "recruitment.customizations.interview_feedback.interview_feedback.on_submit_feedback",
            # After the verdict is set on the Interview, advance/reject the
            # candidate's hiring stage (only for stages flagged "auto").
            "recruitment.customizations.interview_feedback.interview_feedback.auto_advance_stage",
        ]
    },
    "Job Offer": {
        "validate": [
            "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
            # Hiring Lead Permission Settings (change designation at offer stage).
            "recruitment.customizations.hiring_lead_permissions.validate_job_offer_hiring_lead_edits",
        ],
        "before_save": "recruitment.customizations.job_offer.calculate_salary_structure",
        "after_insert": "recruitment.api.action_center.sync_job_offer_action_item",
        "on_submit": "recruitment.api.action_center.sync_job_offer_action_item",
        # Reflect Accepted/Rejected offer outcome on the candidate's hiring stage.
        "on_update": "recruitment.api.hiring_stage.advance_on_job_offer_outcome",
        "on_update_after_submit": [
            "recruitment.api.action_center.sync_job_offer_action_item",
            "recruitment.api.hiring_stage.advance_on_job_offer_outcome",
        ],
    },
    "Job Requisition": {
        "before_insert": [
            # Gate: only employees configured under Raise Requisition Scope may
            # raise requisitions (empty config ⇒ everyone allowed). Authoritative
            # block across Desk, React/ESS API and scripted inserts.
            "recruitment.recruitment.doctype.raise_requisition_scope.raise_requisition_scope.enforce_can_raise",
        ],
        "validate": [
            # Keep no_of_positions in sync with the actual custom_position_details
            # row count on every save (Desk UI edits, scripted updates, etc.).
            "recruitment.api.job_requisition.sync_no_of_positions",
            # Enforce Recruitment Settings -> Job Requisition Settings
            # (max positions, replacement-employee restriction & uniqueness).
            "recruitment.api.job_requisition.validate_requisition_settings",
        ],
    },
    "Job Opening": {
        "validate": [
            # Enforce Recruitment Settings -> Job Posting Settings
            # (mandatory Job Description, no posting without linked positions).
            "recruitment.customizations.job_opening_settings.validate_job_posting_settings",
            # Hiring Lead Permission Settings (external recruiter / application fields).
            "recruitment.customizations.hiring_lead_permissions.validate_job_opening_hiring_lead_edits",
            # Compute each External Recruiter row's read-only posting status from its
            # Display From/To window so the grid reflects live availability.
            "recruitment.permissions.doc_type_permissions.set_external_recruiter_posting_status",
            # Capture the Regions child table's region on the parent `custom_region`
            # so it is searchable/filterable from the Job Opening (search_fields).
            "recruitment.customizations.job_opening_region.set_region_from_regions_table",
            # Guarantee a collision-free web route — sibling requisitions (same
            # company + designation) would otherwise generate an identical route
            # and fail with "Route must be unique". Runs last so it de-duplicates
            # whatever route HRMS / earlier hooks settled on.
            "recruitment.customizations.job_opening_settings.ensure_unique_route",
        ],
    },
    "Employee": {
        "before_insert": "recruitment.customizations.job_applicant.validate_blacklist_employee",
        "after_insert": [
            "recruitment.auto_fetch_fields.link_employee_to_onboarding",
            # On hire of a referred candidate, generate the Referral Reward + payout schedule.
            "recruitment.recruitment.referral_reward_engine.generate_referral_reward_on_employee",
        ],
        "before_save": "recruitment.recruitment.employee_confirmation_hooks.calculate_final_confirmation_date",
        # Keep the User's "Is Alumni Employee" flag in sync with status == "Left"
        # (only sets that checkbox; never touches Employee.status or User.enabled).
        "on_update": "recruitment.recruitment.alumni_portal.sync_alumni_flag",
    },
    "Job Applicant": {
        "before_insert": "recruitment.customizations.ta_duplicity_check.check_duplicity",
        "before_save": "recruitment.customizations.job_applicant.validate_blacklist",
        # Hiring Lead Permission Settings (update candidate source).
        "validate": "recruitment.customizations.hiring_lead_permissions.validate_job_applicant_hiring_lead_edits",
        # Place a new applicant on the linked opening's first hiring stage
        # (no-op unless the Hiring Workflow feature is enabled).
        "after_insert": "recruitment.api.hiring_stage.seed_first_stage",
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
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
        # "before_save": "recruitment.customizations.employee_onboarding.document_verification.update_verification_documents",
        "before_save": "recruitment.recruitment.onboarding_extras.auto_map_manager",
        # Tasks are no longer created on submit (see overide_class.on_submit) —
        # they're created via the "Create Onboarding Tasks" button, which stamps
        # task metadata itself. This hook only keeps metadata fresh on post-submit
        # edits (e.g. DOJ / Postponed changes).
        "on_update_after_submit": "recruitment.recruitment.onboarding_extras.populate_onboarding_task_meta",
        "on_update": [
            "recruitment.auto_fetch_fields.update_employee_fields",
            "recruitment.recruitment.onboarding_extras.handle_doj_outcome",
        ],
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
        "59 23 * * *": [
            "recruitment.customizations.employee_separation.task_reassignment.reassign_employee_separation_tasks",
            "recruitment.customizations.employee_onboarding.overide_class.reassign_tasks",
        ],
        "0 6 * * *": [
            "recruitment.recruitment.scheduled_jobs.trigger_confirmation_todos",
            "recruitment.recruitment.scheduled_jobs.create_extension_confirmations",
        ],
        "0 7 * * *": [
            "recruitment.recruitment.scheduled_jobs.auto_separate_employees_on_lwd",
            "recruitment.recruitment.scheduled_jobs.create_pending_confirmation_separations",
            "recruitment.recruitment.scheduled_jobs.mark_relieved_employees_as_left",
            "recruitment.recruitment.scheduled_jobs.reassign_employee_relationships_on_relieving",
            "recruitment.recruitment.scheduled_jobs.process_separation_leave_attendance_requests",
            "recruitment.recruitment.scheduled_jobs.auto_confirm_employees_without_policy",
        ],
        "0 1 * * *": [
            "recruitment.recruitment.onboarding_extras.refresh_onboarding_task_days_to_join",
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
}
override_doctype_class = {
    "Employee Onboarding": "recruitment.customizations.employee_onboarding.overide_class.CustomEmployeeOnboarding",
    "Job Offer": "recruitment.customizations.job_offer.CustomJobOffer",
    # Disable HRMS's (designation, department, requested_by) duplicate check —
    # our flow raises one requisition per location, so those siblings are valid.
    # See recruitment.customizations.job_requisition.CustomJobRequisition.
    "Job Requisition": "recruitment.customizations.job_requisition.CustomJobRequisition",
    "Employee Separation": "recruitment.customizations.employee_separation.override_class.CustomEmployeeSeparation",
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
# before_request = ["recruitment.utils.before_request"]
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

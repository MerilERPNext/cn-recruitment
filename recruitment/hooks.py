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
app_include_js = ["/assets/recruitment/js/teams_utils.js"]

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
            ["module", "=", "Recruitment"]
        ]
    }
]
# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Job Offer": ["public/js/job_offer.js"],
    "Job Requisition": ["public/js/job_requisition.js"],
    "Job Opening": ["public/js/job_opening.js"],
    "Job Applicant": ["public/js/job_applicant.js"],
    "Interview": ["public/js/interview.js"],
    "User": ["public/js/user.js"],
    "Employee Onboarding": [
        "public/js/employee_onboarding.js",
        "public/js/emp_OB_verification_table.js",
    ],
    "Employee Separation": ["public/js/employee_separation.js"],
    "Employee Promotion": ["public/js/employee_promotion.js"],
    "Employee": ["public/js/employee.js"],
    "Exit Interview": ["public/js/exit_interview.js"],
    "Training Event": ["public/js/training_event.js"],
}


doctype_list_js = {
    "Job Applicant": "public/js/job_applicant_list.js",
    "Job Offer": "public/js/job_offer_list.js"
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
    "Job Requisition": "recruitment.permissions.doc_type_permissions.jr_query",
    "Job Opening": "recruitment.permissions.doc_type_permissions.jo_query",
    "Interview": "recruitment.permissions.doc_type_permissions.interview_query",
    "Job Applicant": "recruitment.permissions.doc_type_permissions.ja_query",
}
# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "recruitment.utils.jinja_methods",
# 	"filters": "recruitment.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "recruitment.install.before_install"
# after_install = "recruitment.install.after_install"

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
        "on_submit": "recruitment.customizations.interview_feedback.interview_feedback.on_submit_feedback"
    },
    "Job Offer": {
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
        "before_save": "recruitment.customizations.job_offer.calculate_salary_structure",
    },
    "Employee": {
        "before_insert": "recruitment.customizations.job_applicant.validate_blacklist_employee",
        "after_insert": "recruitment.auto_fetch_fields.link_employee_to_onboarding",
    },
    "Job Applicant": {
        "before_save": "recruitment.customizations.job_applicant.validate_blacklist"
    },
    "Appointment Letter": {
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes"
    },
    "Employee Onboarding": {
        "validate": "recruitment.customizations.job_applicant.validation_blacklist_on_doctypes",
        "before_save": "recruitment.customizations.employee_onboarding.document_verification.update_verification_documents",
        "on_update": "recruitment.auto_fetch_fields.update_employee_fields",
    },
    "Employee Separation": {
        "on_submit": "recruitment.customizations.employee_separation.employee_separation.update_employee_relieving_date"
    },
    "Job Offer": {
        "on_update_after_submit": "recruitment.api.bulk_job_offer.sync_applicant_status"
    }
}

# apps/recruitment/recruitment/recruitment/hooks.py
# Scheduled Tasks
# ---------------

scheduler_events = {
    "cron": {
        "59 23 * * *": [
            "recruitment.customizations.employee_separation.task_reassignment.reassign_employee_separation_tasks",
            "recruitment.customizations.employee_onboarding.overide_class.reassign_tasks",
        ]
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
    "hrms.hr.doctype.job_requisition.job_requisition.make_job_opening": "recruitment.customizations.job_requisition.job_requisition.make_job_opening",
}
override_doctype_class = {
    "Employee Onboarding": "recruitment.customizations.employee_onboarding.overide_class.CustomEmployeeOnboarding",
    "Job Opening": "recruitment.customizations.job_opening.class_override.CustomJobOpening",
    "Job Offer": "recruitment.customizations.job_offer.CustomJobOffer",
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

# auth_hooks = [
# 	"recruitment.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

website_route_rules = [
    {"from_route": "/webapp/<path:app_path>", "to_route": "/webapp"},
]

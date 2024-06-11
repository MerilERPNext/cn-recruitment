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
# app_include_css = "/assets/recruitment/css/recruitment.css"
# app_include_js = "/assets/recruitment/js/recruitment.js"

# include js, css files in header of web template
# web_include_css = "/assets/recruitment/css/recruitment.css"
# web_include_js = "/assets/recruitment/js/recruitment.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "recruitment/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}
fixtures = [
    {"doctype": "Email Template", "filters": [["name", "IN", ["Job Offer"]]]},
    {"doctype": "Purpose of Travel", "filters": [["name", "IN", ["Interview"]]]},
	{
        "doctype": "Custom Field",
        "filters": [["Custom Field", "module", "=", "Recruitment"]],
    }
]
# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Job Offer": ["public/js/job_offer.js"],
    "Job Requisition": ["public/js/job_requisition.js"],
    "Job Applicant": ["public/js/job_applicant.js"],
    "Interview": ["public/js/interview.js"],
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

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"recruitment.tasks.all"
# 	],
# 	"daily": [
# 		"recruitment.tasks.daily"
# 	],
# 	"hourly": [
# 		"recruitment.tasks.hourly"
# 	],
# 	"weekly": [
# 		"recruitment.tasks.weekly"
# 	],
# 	"monthly": [
# 		"recruitment.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "recruitment.install.before_tests"

# Overriding Methods
# ------------------------------
#
override_whitelisted_methods = {
    "hrms.hr.doctype.employee_onboarding.employee_onboarding.make_employee": "recruitment.customizations.employee_onboarding.employee_onboarding.make_employee"
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

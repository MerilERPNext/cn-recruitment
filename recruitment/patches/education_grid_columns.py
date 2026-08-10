"""Pin the Employee Education grid to the four columns that matter.

The child table ships eight fields flagged `in_list_view` and a Frappe grid only
has ten column units to spend, so the ones declared first won and the Education
Stage, percentage and passing year dropped off the end.

The rules live in `recruitment.recruitment.education_presentation`, which also
runs from `after_migrate` — other apps customise this doctype too, and their
customisation sync happens after patches, so a patch alone cannot hold it.
"""

from recruitment.recruitment.education_presentation import apply_education_presentation


def execute():
	apply_education_presentation()

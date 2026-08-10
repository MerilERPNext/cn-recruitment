"""Call the education stage field what it is: "Education Stage".

`Employee Education.qualification` is a Link to the Education Stage master — 10th,
12th, Diploma, Graduation — but it was labelled "Highest Qualification", which
reads as "the highest one the candidate holds" rather than "which stage this row
is about". Every row has one, so the old label described the wrong thing in the
grid, in the eligibility builder's column list, and in the reason logged on a
rejected applicant.

See `recruitment.recruitment.education_presentation` for why this is re-asserted
from `after_migrate` rather than left to this patch.
"""

from recruitment.recruitment.education_presentation import apply_education_presentation


def execute():
	apply_education_presentation()

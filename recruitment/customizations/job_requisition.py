import frappe

from hrms.hr.doctype.job_requisition.job_requisition import JobRequisition


class CustomJobRequisition(JobRequisition):
    """Override of HRMS Job Requisition for the recruitment flow.

    HRMS's ``validate_duplicates`` rejects more than one *open* Job Requisition
    per (designation, department, requested_by). Our flow deliberately raises
    ONE requisition per location — all of which legitimately share the same
    designation / department / requested_by — so HRMS (wrongly, for us) flags
    those siblings as duplicates and blocks the save with, e.g.:

        A Job Requisition for President requested by 37001 already exists: HR-HIREQ-00017

    The React API already bypassed this per-instance (see
    ``recruitment.api.job_requisition._bypass_hrms_duplicate_check``), but the
    Desk form save path (Save after a status change, etc.) never goes through
    that API, so the check still fired there.

    Overriding the method on the class disables it uniformly across *every*
    save path — Desk UI, API, scripted writes and imports — which is why this
    is registered via ``override_doctype_class`` rather than a per-call patch.

    Everything else (validate → set_time_to_fill, associate_job_opening,
    make_job_opening, get_avg_time_to_fill, …) is inherited from the HRMS class
    unchanged. The existing ``validate`` doc_event (sync_no_of_positions) also
    keeps running, since doc_events fire in addition to the class methods.
    """

    def validate_duplicates(self):
        # Intentional no-op: location-level requisitions legitimately share the
        # (designation, department, requested_by) triple. See class docstring.
        pass

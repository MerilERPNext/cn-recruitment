"""Campus Drive spot registration — walk-in candidates who aren't on file yet.

A candidate scans the drive's QR code, lands on /verify_email?drive=<drive>, and
enters their email. If that email is already a Job Applicant they're simply marked
verified (see recruitment.api.candidate_verification). If it ISN'T, they register
on the spot through the endpoints here — no TPO pre-registration, no portal login.

Endpoints (all guest-accessible, all scoped to the drive in the QR)
------------------------------------------------------------------
get_drive_registration_options(drive)                            → institute + opening choices
get_drive_application_fields(drive, job_opening)                 → the form to render
get_drive_field_options(drive, job_opening, fieldname, child_fieldname=None)
upload_drive_attachment(drive, job_opening, fieldname, child_fieldname=None)
submit_drive_application(drive, institute, job_opening, email, form_data)

Each answers ``{"success", "message", "data"}`` with HTTP 200 regardless of outcome —
see the _ok/_err note below. `child_fieldname` addresses a column inside a child table
(the education grid's Institute / Education Stage pickers).

The drive id is the only thing carried from the URL, and every call re-validates
against it: the institute must be on the drive's `participating_institutes` and the
opening on its `linked_job_openings`. A guest can therefore only ever create a
candidate for a drive whose QR they physically scanned, on an institute/opening that
drive actually runs.

The form itself is NOT defined here. It is the same campus field set the Campus
Invite flow renders — the opening's `custom_application_fields` rows with
view_campus = 1 (mandatory_campus = 1 for required), falling back to Job Applicant
Profile Settings. HR configures it on the Job Opening; this module just serves it.

Submitted candidates land as a normal campus Job Applicant, stamped with
custom_campus_drive / custom_institute / custom_email_verified, and are scored by
the eligibility engine exactly like invite candidates.
"""

import frappe
from frappe.utils import getdate, nowdate

from . import _common
from .campus import DRAFT_STATUS, SUBMIT_STATUS, _apply_form_data, _coerce_form_data


# The campus channel's _ok/_err stamp an HTTP status because their consumer is an
# external REST frontend. These endpoints are called from /verify_email via
# frappe.call, which treats any non-2xx as a transport failure — a 404 pops Frappe's
# own "Not found" dialog and rejects before the page can read the message. So the
# outcome lives in the body only.

def _ok(message, data):
    return {"success": True, "message": message, "data": data}


def _err(message):
    return {"success": False, "message": message, "data": None}


CHANNEL = "campus"
APPLICANT_DOCTYPE = "Job Applicant"

# Guest uploads are drive-gated and deliberately narrow: a walk-in only ever needs
# to hand over a resume or a photo.
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

# A drive stops accepting spot registrations once it's over. Draft drives haven't
# been published yet, so their QR must not create candidates either.
OPEN_DRIVE_STATUSES = {"Live", "In Progress"}

# Only openings a candidate can still be hired into are offered on the form. This is
# matched against the Job Opening's own `status` (Open / In-Progress / Closed), the
# same gate the other channels use in _common.get_openings_active_on_channel.
OPEN_OPENING_STATUSES = {"Open"}


def _get_open_drive(drive):
    """Return the Campus Drive if it is accepting spot registrations, else None.

    Requires the drive to exist, to have its registration form enabled (the same
    flag that generates the QR), and to be in a live status. `registration_open_from`
    gates the start when set; `drive_end_date` gates the end.
    """
    drive = (drive or "").strip()
    if not drive:
        return None

    row = frappe.db.get_value(
        "Campus Drive",
        drive,
        [
            "name",
            "drive_name",
            "drive_status",
            "registration_form_enabled",
            "registration_form_title",
            "registration_open_from",
            "drive_end_date",
        ],
        as_dict=True,
    )
    if not row or not row.registration_form_enabled:
        return None
    if row.drive_status not in OPEN_DRIVE_STATUSES:
        return None

    today = getdate(nowdate())
    if row.registration_open_from and getdate(row.registration_open_from) > today:
        return None
    if row.drive_end_date and getdate(row.drive_end_date) < today:
        return None
    return row


def _drive_institutes(drive):
    """Institutes participating in this drive — the only ones a walk-in may pick."""
    rows = frappe.get_all(
        "Campus Drive Institute",
        filters={
            "parenttype": "Campus Drive",
            "parentfield": "participating_institutes",
            "parent": drive,
        },
        fields=["institute", "institute_name"],
        order_by="idx asc",
    )
    return [
        {"institute": r.institute, "institute_name": r.institute_name or r.institute}
        for r in rows
        if r.institute
    ]


def _drive_openings(drive, only_open=True):
    """Job Openings linked to this drive, in table order.

    Status comes from the Job Opening itself, never from the child row's
    `opening_status` — that column is a denormalized snapshot HR fills in by hand and
    is frequently NULL, which would silently hide every opening on the drive.

    `only_open` keeps the candidate-facing list to openings still taking applicants;
    pass False when validating a submit (so a mid-form status change gives a clear
    "no longer open" error instead of a confusing "not part of this drive").
    """
    link = frappe.qb.DocType("Campus Drive Job Opening")
    opening = frappe.qb.DocType("Job Opening")
    query = (
        frappe.qb.from_(link)
        .inner_join(opening)
        .on(opening.name == link.job_opening)
        .select(
            opening.name.as_("job_opening"),
            link.job_title.as_("linked_title"),
            opening.status.as_("opening_status"),
            opening.designation,
            opening.department,
            opening.location,
        )
        .where(
            (link.parenttype == "Campus Drive")
            & (link.parentfield == "linked_job_openings")
            & (link.parent == drive)
        )
        .orderby(link.idx)
    )
    if only_open:
        query = query.where(opening.status.isin(list(OPEN_OPENING_STATUSES)))

    return [
        {
            "job_opening": r.job_opening,
            "job_title": r.linked_title or r.designation or r.job_opening,
            "opening_status": r.opening_status,
            "designation": r.designation,
            "department": r.department,
            "location": r.location,
        }
        for r in query.run(as_dict=True)
    ]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@frappe.whitelist(allow_guest=True)
def get_drive_registration_options(drive):
    """Institute + Job Opening choices for the drive whose QR the candidate scanned.

    Returns ``{"drive", "drive_name", "form_title", "institutes": [...],
    "openings": [...]}``. Both lists are drive-scoped: the candidate can only ever
    pick an institute participating in this drive and an opening linked to it.
    """
    row = _get_open_drive(drive)
    if not row:
        return _err("Registration is not open for this campus drive.")

    institutes = _drive_institutes(row.name)
    openings = _drive_openings(row.name)
    if not institutes or not openings:
        return _err(
            "This campus drive has no institutes or openings set up for registration yet. "
            "Please contact the HR desk.",
        )

    return _ok(
        f"Fetched {len(institutes)} institute(s) and {len(openings)} opening(s).",
        {
            "drive": row.name,
            "drive_name": row.drive_name,
            "form_title": row.registration_form_title or row.drive_name,
            "institutes": institutes,
            "openings": openings,
        },
    )


@frappe.whitelist(allow_guest=True)
def get_drive_application_fields(drive, job_opening):
    """The campus application form for `job_opening`, as configured by HR.

    Same field set the Campus Invite flow renders: the opening's campus-enabled
    (view_campus) rows, with `reqd` set from mandatory_campus. The opening must be
    linked to `drive` — this is the guest-safe counterpart of the portal-only
    campus.get_application_fields, which requires a candidate session.
    """
    row = _get_open_drive(drive)
    if not row:
        return _err("Registration is not open for this campus drive.")

    opening = (job_opening or "").strip()
    if not opening:
        return _err("job_opening is required.")
    if opening not in {o["job_opening"] for o in _drive_openings(row.name)}:
        return _err("This opening is not open on this campus drive.")

    fields = _common.get_application_fields_for_channel(opening, CHANNEL)
    if not fields:
        return _err(
            "No application form is configured for this opening. Please contact the HR desk.",
        )

    return _ok(f"Fetched {len(fields)} field(s).", {
        "drive": row.name,
        "job_opening": opening,
        "fields": fields,
    })


def _campus_field(drive_name, job_opening, fieldname):
    """The campus field config row for `fieldname` on `job_opening`, or None.

    Every guest helper below resolves the field through this, so a caller can only
    ever reach a field HR actually put on this drive's opening — never an arbitrary
    Job Applicant field or doctype.
    """
    opening = (job_opening or "").strip()
    if not opening or opening not in {o["job_opening"] for o in _drive_openings(drive_name)}:
        return None
    fields = _common.get_application_fields_for_channel(opening, CHANNEL)
    return next((f for f in fields if f["reference_name"] == (fieldname or "").strip()), None)


def _resolve_form_field(drive_name, job_opening, fieldname, child_fieldname=None):
    """Resolve one control on the form to its field definition.

    Without `child_fieldname` that's a top-level campus field. With it, it's a column
    inside that field's child table — the education / experience grids — resolved
    through the parent's `table_fields`, which already honours HR's
    `child_field_config`. Either way the control must exist on this drive's opening,
    so the helpers below can't be pointed at arbitrary fields.
    """
    df = _campus_field(drive_name, job_opening, fieldname)
    if not df:
        return None
    if not child_fieldname:
        return df
    if df["fieldtype"] not in ("Table", "Table MultiSelect"):
        return None
    target = (child_fieldname or "").strip()
    return next(
        (c for c in (df.get("table_fields") or []) if c["fieldname"] == target), None
    )


@frappe.whitelist(allow_guest=True)
def get_drive_field_options(drive, job_opening, fieldname, child_fieldname=None, search_term=None):
    """Options for a Link control on the spot-registration form.

    Scoped twice over: the control must be on this drive's opening AND be a Link, so
    this can't be used to read a doctype the form doesn't already expose. Pass
    `child_fieldname` for a Link column inside a child table (e.g. the education
    grid's Institute / Education Stage pickers).
    """
    row = _get_open_drive(drive)
    if not row:
        return _err("Registration is not open for this campus drive.")

    df = _resolve_form_field(row.name, job_opening, fieldname, child_fieldname)
    if not df or df["fieldtype"] != "Link" or not df["options"]:
        return _err("This field does not take a lookup value.")

    target = df["options"]
    filters = {}
    term = (search_term or "").strip()
    if term:
        filters["name"] = ["like", f"%{term}%"]

    meta = frappe.get_meta(target)
    title_field = meta.get_title_field()
    fields = ["name"]
    if title_field and title_field != "name" and meta.has_field(title_field):
        fields.append(title_field)

    rows = frappe.get_all(
        target, filters=filters, fields=fields, limit=50, order_by="name asc",
        ignore_permissions=True,
    )
    options = [
        {"value": r["name"], "label": (r.get(title_field) if title_field else None) or r["name"]}
        for r in rows
    ]
    return _ok(f"Fetched {len(options)} option(s).", {
        "fieldname": fieldname,
        "child_fieldname": child_fieldname,
        "options": options,
    })


@frappe.whitelist(allow_guest=True, methods=["POST"])
def upload_drive_attachment(drive, job_opening, fieldname, child_fieldname=None):
    """Accept one file for an Attach control on the spot-registration form.

    Core's `upload_file` only serves guests when the site-wide
    `allow_guests_to_upload_files` setting is on, which would open uploads for every
    guest page. This is the narrow alternative: the drive must be open for
    registration, the control must be an Attach field on that drive's opening (or an
    Attach column inside one of its child tables, via `child_fieldname`), and the file
    must clear an extension allowlist and a size cap. Returns the file_url the caller
    then sends back as that control's value in `submit_drive_application`.
    """
    import os

    row = _get_open_drive(drive)
    if not row:
        return _err("Registration is not open for this campus drive.")

    df = _resolve_form_field(row.name, job_opening, fieldname, child_fieldname)
    if not df or df["fieldtype"] not in ("Attach", "Attach Image"):
        return _err("This field does not accept a file.")

    upload = (frappe.request.files or {}).get("file")
    if not upload or not upload.filename:
        return _err("No file was uploaded.")

    extension = os.path.splitext(upload.filename)[1].lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        return _err(
            "Unsupported file type. Allowed: {}.".format(
                ", ".join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
            ),
        )

    content = upload.stream.read()
    if not content:
        return _err("The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        return _err(
            f"File is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
        )

    try:
        # Private and unattached — submit_drive_application re-points it at the Job
        # Applicant once that record exists.
        saved = frappe.get_doc({
            "doctype": "File",
            "file_name": upload.filename,
            "content": content,
            "is_private": 1,
        }).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "campus_drive_spot.upload_drive_attachment failed")
        return _err(f"Unable to upload file: {type(e).__name__}: {e}")

    return _ok("File uploaded.", {
        "fieldname": fieldname,
        "file_url": saved.file_url,
        "file_name": saved.file_name,
    })


def _attach_uploaded_files(doc, payload, fields):
    """Point the Files uploaded before the record existed at the new Job Applicant.

    Best-effort — a failure here leaves an orphaned private File, never a failed
    registration.
    """
    attach_fields = [
        f["reference_name"] for f in fields if f["fieldtype"] in ("Attach", "Attach Image")
    ]
    for fieldname in attach_fields:
        file_url = payload.get(fieldname)
        if not file_url:
            continue
        try:
            name = frappe.db.get_value("File", {"file_url": file_url}, "name")
            if not name:
                continue
            frappe.db.set_value(
                "File",
                name,
                {
                    "attached_to_doctype": doc.doctype,
                    "attached_to_name": doc.name,
                    "attached_to_field": fieldname,
                },
                update_modified=False,
            )
        except Exception:
            frappe.log_error(
                frappe.get_traceback(), "campus_drive_spot: attaching uploaded file failed"
            )


@frappe.whitelist(allow_guest=True)
def submit_drive_application(drive, institute, job_opening, email, form_data=None):
    """Create the walk-in candidate's Job Applicant for this drive.

    Validates the drive is open, the institute is on the drive, the opening is on the
    drive and still Open, and that this email hasn't already registered on the drive.
    Mandatory campus fields are enforced by assert_field_set_for_channel, which also
    strips anything not configured for the channel.
    """
    row = _get_open_drive(drive)
    if not row:
        return _err("Registration is not open for this campus drive.")

    candidate_email = (email or "").strip().lower()
    if not candidate_email:
        return _err("email is required.")

    picked_institute = (institute or "").strip()
    if not picked_institute:
        return _err("institute is required.")
    if picked_institute not in {i["institute"] for i in _drive_institutes(row.name)}:
        return _err("This institute is not participating in this campus drive.")

    opening = (job_opening or "").strip()
    if not opening:
        return _err("job_opening is required.")
    all_openings = {o["job_opening"]: o for o in _drive_openings(row.name, only_open=False)}
    if opening not in all_openings:
        return _err("This opening is not part of this campus drive.")
    if all_openings[opening]["opening_status"] not in OPEN_OPENING_STATUSES:
        return _err("This opening is no longer accepting applications.")

    # One registration per candidate per drive: a walk-in picks a single opening.
    existing = frappe.db.get_value(
        APPLICANT_DOCTYPE,
        {
            "email_id": candidate_email,
            "custom_campus_drive": row.name,
            "status": ["!=", DRAFT_STATUS],
        },
        ["name", "job_title"],
        as_dict=True,
    )
    if existing:
        return _err(
            f"You have already registered for this drive ({existing.name}). "
            "Please see the HR desk if you need to change your opening.",
        )

    # Guard the other direction too — an application to this opening from some other
    # route still counts as already applied.
    duplicate = frappe.db.get_value(
        APPLICANT_DOCTYPE,
        {"email_id": candidate_email, "job_title": opening, "status": ["!=", DRAFT_STATUS]},
        "name",
    )
    if duplicate:
        return _err(f"You have already applied to this opening ({duplicate}).")

    # Built once and reused for validation and for re-attaching uploaded files.
    channel_fields = _common.get_application_fields_for_channel(opening, CHANNEL)
    try:
        payload = _common.assert_field_set_for_channel(
            opening, CHANNEL, _coerce_form_data(form_data), fields=channel_fields
        )
    except frappe.ValidationError as e:
        # Surface missing/unknown-field errors in this module's JSON shape rather than
        # as a raw Frappe error dialog — the walk-in form renders them inline.
        frappe.clear_messages()
        return _err(str(e))

    try:
        doc = frappe.new_doc(APPLICANT_DOCTYPE)
        _apply_form_data(doc, payload)
        doc.email_id = candidate_email
        doc.job_title = opening
        doc.status = SUBMIT_STATUS

        # The campus form captures first name in applicant_name and surname in
        # custom_applicant_last_name — store the FULL name in applicant_name so the
        # candidate shows with their complete name everywhere (same as the invite flow).
        last = doc.get("custom_applicant_last_name")
        if last and last.strip() and last.strip().lower() not in (doc.applicant_name or "").lower():
            doc.applicant_name = f"{(doc.applicant_name or '').strip()} {last.strip()}".strip()

        source = _common.source_value_for(CHANNEL)
        if source and not doc.get("source"):
            doc.source = source

        # Campus provenance, so HR can filter these walk-ins by drive / institute.
        doc.custom_campus_drive = row.name
        if doc.meta.has_field("custom_institute"):
            doc.custom_institute = picked_institute
        # Marks them as a walk-in rather than a TPO-registered candidate. The drive
        # link alone can't say that — invite candidates carry it too — so this is what
        # HR filters on to see who registered at the venue.
        if doc.meta.has_field("custom_spot_registered"):
            doc.custom_spot_registered = 1
        # They registered from the drive's QR page with this exact address — the same
        # thing the verification step stamps for candidates already on file.
        if doc.meta.has_field("custom_email_verified"):
            doc.custom_email_verified = 1

        doc.insert(ignore_permissions=True)
        _attach_uploaded_files(doc, payload, channel_fields)
        frappe.db.commit()
    except frappe.ValidationError as e:
        frappe.db.rollback()
        frappe.clear_messages()
        return _err(str(e))
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "campus_drive_spot.submit_drive_application failed")
        return _err(f"Unable to submit registration: {type(e).__name__}: {e}")

    # Score against the opening's eligibility rules → Shortlisted (pass) or
    # Hold + "Eligibility Not Met" (knock-out fail), same as every campus candidate.
    from recruitment.recruitment.eligibility_engine import evaluate_eligibility

    evaluate_eligibility(doc)

    return _ok(
        "Registration submitted.",
        {
            "name": doc.name,
            "drive": row.name,
            "institute": picked_institute,
            "job_opening": opening,
            "job_title": all_openings[opening]["job_title"],
            "status": doc.status,
        },
    )

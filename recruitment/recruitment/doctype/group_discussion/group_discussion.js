/* global frappe, $, __, cdInjectStyles, gdbDetail, gdbInstituteColors */
/**
 * Group Discussion — the panel's own copy of one group.
 *
 * The board below is the SAME renderer the Campus Drive uses (campus_gd_board.js), so
 * an interviewer marking their group sees exactly the card HR sees, with the same
 * buttons in the same places. What it does not carry is anything that belongs to
 * running the hall: no other groups, no panel picker, no moving candidates between
 * groups, and no link into the Job Applicant a panel member has no permission on.
 *
 * Nothing here writes this document. Every button calls the server, the server writes
 * the CAMPUS DRIVE row, and the drive mirrors the change back onto this document —
 * which is why a mark made here and a mark made by HR can never disagree. See
 * group_discussion.py.
 */

frappe.ui.form.on("Group Discussion", {
	refresh(frm) {
		gdRenderBoard(frm);
		gdSetIndicator(frm);

		// HR gets a way back to the hall; a panel member has no permission on the
		// drive, so offering them the link would only produce an error page.
		if (frm.doc.campus_drive && frappe.model.can_read("Campus Drive")) {
			frm.add_custom_button(__("Open Campus Drive"), () =>
				frappe.set_route("Form", "Campus Drive", frm.doc.campus_drive)
			);
		}
	},
});

function gdSetIndicator(frm) {
	if (frm.doc.results_pushed) {
		frm.page.set_indicator(__("Completed"), "green");
	} else if (frm.doc.status === "In Progress") {
		frm.page.set_indicator(__("In Progress"), "orange");
	}
}

// --- the board --------------------------------------------------------------

function gdRenderBoard(frm) {
	const field = frm.fields_dict.gd_board_html;
	if (!field) return;
	cdInjectStyles();

	const $wrap = $(field.wrapper).empty();
	const $root = $('<div class="campus-dash"></div>').appendTo($wrap);
	if (frm.is_new()) return;

	gdBind($root, frm);
	gdDraw($root, frm);
}

// The shape the shared board expects of a group. This document IS one group, so it
// stands in for the Campus Drive's `gd_groups` row.
function gdGroup(frm) {
	return {
		round_code: frm.doc.round_code,
		group_name: frm.doc.group_name,
		group_status: frm.doc.status,
		job_opening: frm.doc.job_opening,
		job_title: frm.doc.job_title,
		institute: frm.doc.institute,
		panel_name: frm.doc.panel_name,
	};
}

// Readable names come off the rows themselves — snapshotted when the group was
// created, so the panel never needs read permission on Institute or Job Opening.
function gdCtx(frm) {
	const institutes = {};
	const roles = {};
	(frm.doc.candidates || []).forEach((c) => {
		if (c.institute) institutes[c.institute] = c.institute_name || c.institute;
		if (c.job_opening) roles[c.job_opening] = c.job_title || c.job_opening;
	});
	return {
		esc: (v) => frappe.utils.escape_html(String(v == null ? "" : v)),
		roleTitle: (opening) => (opening ? roles[opening] || opening : __("Unassigned")),
		instituteName: (institute) => (institute ? institutes[institute] || institute : ""),
		panelWho: () => (frm.doc.interviewers || []).map((r) => r.full_name || r.interviewer),
	};
}

function gdDraw($root, frm) {
	const ctx = gdCtx(frm);
	const esc = ctx.esc;
	const members = frm.doc.candidates || [];
	const done = frm.doc.results_pushed;

	const header = `<div class="cd-toolbar">
		<div class="cd-toolbar-title">${esc(frm.doc.round_name || __("Group Discussion"))}
			<span class="cd-hint text-muted">${esc(
				[frm.doc.drive_name, frm.doc.group_name].filter(Boolean).join(" · ")
			)}</span>
		</div>
	</div>`;

	// The one instruction a panel member needs, and the one thing that is irreversible.
	const note = done
		? `<div class="cd-rd-warn">${__(
				"This group is finished — its results have been pushed and its candidates have moved on. The marks below are the record of what happened and can no longer be changed."
		  )}</div>`
		: `<div class="cd-empty text-muted" style="padding:6px 0">${__(
				"Mark each candidate Present/Absent and Pass/Fail, then press Finish. Passing candidates go straight into the next round and failing ones are rejected — Finish cannot be undone."
		  )}</div>`;

	// Planned/Scheduled/In Progress only: a GD is finished by pushing it, never by
	// picking a status (group_discussion.PANEL_STATUSES says the same on the server).
	const statusControl = done
		? ""
		: `<select class="cd-input" data-gd-status title="${__("Where this GD has got to")}">${[
				"Planned",
				"Scheduled",
				"In Progress",
		  ]
				.map(
					(st) =>
						`<option value="${esc(st)}" ${frm.doc.status === st ? "selected" : ""}>${esc(
							st
						)}</option>`
				)
				.join("")}</select>`;

	$root.html(
		header +
			gdbDetail(ctx, gdGroup(frm), members, {
				instColor: gdbInstituteColors(members),
				statusControl,
				canMark: !done,
				applicantLinks: false,
				back: false,
				note,
				pushLabel: done ? "" : __("Finish & send results →"),
				pushTitle: __(
					"Ends this GD: everyone marked Pass goes into the next round, everyone marked Fail is rejected. This cannot be undone."
				),
			})
	);
}

// --- server calls -----------------------------------------------------------

function gdCall(method, args) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method: `recruitment.recruitment.doctype.group_discussion.group_discussion.${method}`,
			args,
			callback: (r) => resolve(r.message),
			error: reject,
		});
	});
}

function gdBind($root, frm) {
	const gd = frm.doc.name;

	// per-candidate attendance / result
	$root.on("click", "[data-gd-set]", function () {
		const el = $(this);
		const rowName = el.attr("data-gd-row");
		const field = el.attr("data-gd-set");
		let value = el.attr("data-gd-value");
		const row = (frm.doc.candidates || []).find((c) => c.name === rowName);
		if (!row) return;
		// Clicking the chip that is already on clears it back to Pending, so a
		// mistaken Pass/Fail can be undone before the group is finished.
		if (row[field] === value) value = "Pending";
		gdCall("set_candidate_field", { group_discussion: gd, row_name: rowName, field, value }).then(
			(m) => {
				row[field] = value;
				if (m && m.status) frm.doc.status = m.status;
				gdDraw($root, frm);
			}
		);
	});

	$root.on("click", "[data-gd-bulk]", function () {
		const value = $(this).attr("data-gd-bulk");
		gdCall("bulk_attendance", { group_discussion: gd, value }).then((m) => {
			(frm.doc.candidates || []).forEach((c) => (c.attendance = value));
			if (m && m.status) frm.doc.status = m.status;
			gdDraw($root, frm);
		});
	});

	$root.on("change", "[data-gd-status]", function () {
		const status = $(this).val();
		gdCall("set_status", { group_discussion: gd, status }).then(() => {
			frm.doc.status = status;
			frm.refresh_field("status");
			gdDraw($root, frm);
		});
	});

	// Finish: passers into the next round, fails rejected, group closed.
	$root.on("click", "[data-gd-push-group]", function () {
		const members = frm.doc.candidates || [];
		const open = members.filter((m) => m.result !== "Pass" && m.result !== "Fail");
		if (open.length) {
			frappe.msgprint({
				title: __("Not everyone is marked"),
				indicator: "orange",
				message: __(
					"{0} candidate(s) still have no result. Mark every one of them Pass or Fail, then finish the group.",
					[open.length]
				),
			});
			return;
		}
		const pass = members.filter((m) => m.result === "Pass").length;
		frappe.confirm(
			__(
				"Finish {0}? {1} candidate(s) go into the next round and {2} are rejected. This cannot be undone.",
				[frm.doc.group_name, pass, members.length - pass]
			),
			() => {
				frappe.dom.freeze(__("Updating candidates…"));
				gdCall("push_results", { group_discussion: gd })
					.then((m) => {
						frappe.dom.unfreeze();
						if (!m) return;
						frappe.msgprint({
							title: __("Group Discussion finished"),
							indicator: "green",
							message:
								__("Advanced: {0} &nbsp;·&nbsp; Rejected: {1}", [m.advanced, m.rejected]) +
								(m.gd_stage
									? "<br>" + __("Passers moved to the stage after “{0}”.", [m.gd_stage])
									: ""),
						});
						frm.reload_doc();
					})
					.catch(() => frappe.dom.unfreeze());
			}
		);
	});
}

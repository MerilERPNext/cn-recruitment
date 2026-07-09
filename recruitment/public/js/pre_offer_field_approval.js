/**
 * pre_offer_field_approval.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Field-Level / Section-Level Approval panel for the Pre Offer form, shown on the
 * Job Applicant form (tab "Pre Offer Field Approvals", HTML field
 * custom_pre_offer_approval_html).
 *
 * Data source: custom_pre_offer_field_approvals child table (via API). Rows are
 * created when the candidate submits the pre-offer form
 * (recruitment.api.channels.pre_offer.submit_application).
 *
 * Status lifecycle per field:
 *   Pending  → candidate has not yet filled this field
 *   Filled   → candidate submitted; awaiting HR review (HR can Approve / Reject)
 *   Approved → HR approved; locked
 *   Rejected → HR rejected with comment; candidate can re-fill from the portal
 * ─────────────────────────────────────────────────────────────────────────────
 */

const POA = {
    get:       "recruitment.api.pre_offer_field_approval.get_pre_offer_fields_for_approval",
    update:    "recruitment.api.pre_offer_field_approval.update_field_approval_status",
    updateSec: "recruitment.api.pre_offer_field_approval.update_section_approval_status",
    bulk:      "recruitment.api.pre_offer_field_approval.bulk_update_approval_status",
};

const POA_ST = {
    Pending:  { cls: "secondary", icon: "⏳", label: "Pending"  },
    Filled:   { cls: "info",      icon: "📝", label: "Filled"   },
    Approved: { cls: "success",   icon: "✅", label: "Approved" },
    Rejected: { cls: "danger",    icon: "❌", label: "Rejected" },
};

function poa_parseList(frm) {
    return frm._poa_list || [];
}
function poa_patchDoc(frm, newList) {
    frm._poa_list = newList || [];
}
function poa_skey(str) {
    return (str || "general").replace(/[^a-z0-9]/gi, "_").toLowerCase();
}


// ── Child-table expandable rows ────────────────────────────────────────────
function poa_buildChildParts(entry) {
    const rows        = Array.isArray(entry.current_value) ? entry.current_value : [];
    const childFields = Array.isArray(entry.child_fields)  ? entry.child_fields  : [];
    const eid         = "poa-exp-" + poa_skey(entry.fieldname);

    if (!rows.length) {
        return {
            toggleHTML: `<span class="text-muted" style="font-size:0.8rem;font-style:italic;">No records</span>`,
            expandHTML: "",
        };
    }

    const thCells = childFields.map(f =>
        `<th style="white-space:nowrap;font-size:0.73rem;padding:5px 8px;background:#eef2f7;">
             ${frappe.utils.escape_html(f.label || f.fieldname)}
         </th>`
    ).join("");

    const tbRows = rows.map((row, ri) => {
        const cells = childFields.map(f => {
            const v = row[f.fieldname] != null ? String(row[f.fieldname]) : "";
            return `<td style="font-size:0.73rem;padding:4px 8px;white-space:nowrap;">${frappe.utils.escape_html(v)}</td>`;
        }).join("");
        return `<tr style="${ri % 2 !== 0 ? "background:#f9fafb;" : ""}">${cells}</tr>`;
    }).join("");

    const toggleHTML = `
        <a class="poa-toggle-child"
           data-expand-id="${eid}" data-count="${rows.length}"
           style="cursor:pointer;font-size:0.81rem;color:#1a73e8;
                  display:inline-flex;align-items:center;gap:5px;text-decoration:none;user-select:none;">
            <span class="poa-ct-arrow" style="font-size:0.66rem;">▶</span>
            📋 ${rows.length} row${rows.length > 1 ? "s" : ""}&nbsp;—&nbsp;click to expand
        </a>`;

    const expandHTML = `
        <tr id="${eid}" class="poa-expand-row" style="display:none;background:#f5f8ff;">
            <td colspan="5" style="padding:12px 16px;border-top:2px solid #c5d8f0;">
                <div style="overflow-x:auto;max-height:280px;overflow-y:auto;
                            border:1px solid #ccd8eb;border-radius:4px;">
                    <table class="table table-bordered"
                           style="margin:0;font-size:0.73rem;border-collapse:collapse;min-width:100%;">
                        <thead><tr>${thCells}</tr></thead>
                        <tbody>${tbRows}</tbody>
                    </table>
                </div>
            </td>
        </tr>`;

    return { toggleHTML, expandHTML };
}


// Frappe hides "empty" tabs during the initial refresh before this HTML field's
// content lands; force the Pre Offer Approval tab visible after we render.
function poa_keepTabVisible(frm) {
    try {
        (frm.layout && frm.layout.tabs || []).forEach((t) => {
            if (t.df && t.df.fieldname === "custom_pre_offer_approval_tab") t.toggle(true);
        });
        const field = frm.fields_dict["custom_pre_offer_approval_html"];
        if (field && field.$wrapper) {
            field.df.hidden = 0;
            field.$wrapper.removeClass("hide-control").show();
            field.$wrapper.closest(".form-section")
                .removeClass("empty-section").addClass("visible-section");
        }
    } catch (e) { /* non-fatal */ }
}

// ── MAIN RENDER ─────────────────────────────────────────────────────────────
function poa_render(frm, filterStatus, filterText) {
    const $wrapper = frm.fields_dict["custom_pre_offer_approval_html"]?.$wrapper;
    if (!$wrapper || !$wrapper.length) return;
    poa_keepTabVisible(frm);

    const list = poa_parseList(frm);

    if (!list.length) {
        $wrapper.html(`
            <div style="padding:32px;text-align:center;color:#888;">
                <div style="font-size:3rem;">📋</div>
                <p style="margin-top:8px;">No pre-offer fields submitted yet.</p>
                <p>Fields appear here once the candidate submits the Pre Offer form.</p>
            </div>`);
        return;
    }

    filterStatus = filterStatus || "All";
    filterText   = (filterText  || "").toLowerCase().trim();

    const totalCounts = { All: list.length, Pending: 0, Filled: 0, Approved: 0, Rejected: 0 };
    list.forEach(e => { totalCounts[e.status] = (totalCounts[e.status] || 0) + 1; });

    const sectionOrder = [];
    const sectionMap   = {};
    list.forEach(entry => {
        const sec = entry.section || "General";
        if (!sectionMap[sec]) { sectionMap[sec] = { name: sec, entries: [] }; sectionOrder.push(sec); }
        sectionMap[sec].entries.push(entry);
    });

    const isEditable = frm.doc.docstatus === 0;

    const tabClsMap = { All: "secondary", Pending: "secondary", Filled: "info", Approved: "success", Rejected: "danger" };
    const tabs = ["All", "Pending", "Filled", "Approved", "Rejected"].map(st => {
        const active = filterStatus === st;
        return `<button class="btn btn-xs btn-${tabClsMap[st]} poa-tab-btn" data-status="${st}"
                        style="margin:0 3px 4px 0;${active ? "font-weight:700;box-shadow:0 0 0 2px rgba(0,0,0,.18);" : "opacity:.7"}">
                    ${st}&nbsp;(${totalCounts[st] || 0})
                </button>`;
    }).join("");

    let rowsHTML     = "";
    let visibleTotal = 0;

    sectionOrder.forEach(secName => {
        const section    = sectionMap[secName];
        const secKey     = poa_skey(secName);
        const secBodyCls = "poa-sbody-" + secKey;

        const visibleEntries = section.entries.filter(e => {
            const stOk  = filterStatus === "All" || e.status === filterStatus;
            const txtOk = !filterText
                || (e.label     || "").toLowerCase().includes(filterText)
                || (e.fieldname || "").toLowerCase().includes(filterText);
            return stOk && txtOk;
        });

        if ((filterStatus !== "All" || filterText) && !visibleEntries.length) return;
        visibleTotal += visibleEntries.length;

        const sc = { Pending: 0, Filled: 0, Approved: 0, Rejected: 0 };
        section.entries.forEach(e => { sc[e.status] = (sc[e.status] || 0) + 1; });
        const allApproved = sc.Approved === section.entries.length;
        const anyRejected = sc.Rejected > 0;
        const summaryBadgeCls = allApproved ? "success" : (anyRejected ? "danger" : (sc.Filled > 0 ? "info" : "warning"));

        const summaryText =
            `<span class="badge badge-${summaryBadgeCls}" style="font-size:0.72rem;margin-left:8px;padding:3px 7px;">
                ${sc.Pending}P / ${sc.Filled}F / ${sc.Approved}A / ${sc.Rejected}R
             </span>`;

        const secActions = isEditable ? `
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <button class="btn btn-xs btn-success poa-sec-approve"
                        data-section="${frappe.utils.escape_html(secName)}">✓ Approve Section</button>
                <button class="btn btn-xs btn-danger poa-sec-reject"
                        data-section="${frappe.utils.escape_html(secName)}">✗ Reject Section</button>
            </div>` : "";

        rowsHTML += `
            <tr class="poa-section-hdr" data-secbody="${secBodyCls}"
                style="background:#e8eef8;cursor:pointer;user-select:none;">
                <td colspan="3" style="padding:9px 12px;vertical-align:middle;">
                    <span class="poa-sec-arrow" style="font-size:0.7rem;margin-right:6px;display:inline-block;">▼</span>
                    <strong style="font-size:0.88rem;color:#1a3a6b;">
                        📂 ${frappe.utils.escape_html(secName)}
                    </strong>
                    ${summaryText}
                    <small class="text-muted" style="margin-left:8px;font-size:0.75rem;">
                        (${section.entries.length} field${section.entries.length > 1 ? "s" : ""})
                    </small>
                </td>
                <td style="padding:9px 12px;text-align:right;vertical-align:middle;white-space:nowrap;">
                    ${secActions}
                </td>
            </tr>`;

        visibleEntries.forEach(entry => {
            const st      = entry.status || "Pending";
            const cfg     = POA_ST[st] || POA_ST.Pending;
            const fn      = entry.fieldname || "";
            const fnEsc   = frappe.utils.escape_html(fn);
            const lbl     = frappe.utils.escape_html(entry.label || fn);
            const isTable = entry.fieldtype === "Table" || entry.fieldtype === "Table MultiSelect";

            const tableBadge = isTable
                ? `<span class="badge badge-info" style="font-size:0.62rem;vertical-align:middle;margin-left:4px;">Table</span>`
                : "";

            const reviewed = entry.reviewed_by
                ? `<small class="text-muted" style="display:block;margin-top:3px;line-height:1.4;">
                       by <strong>${frappe.utils.escape_html(entry.reviewed_by)}</strong><br>
                       ${frappe.datetime.str_to_user(entry.reviewed_on)}
                   </small>`
                : "";

            const commentBlock = (st === "Rejected" && entry.hr_comment)
                ? `<div style="margin-top:6px;padding:5px 8px;background:#fff3cd;border-left:3px solid #e0a800;
                               border-radius:3px;font-size:0.78rem;color:#856404;">
                       💬 <strong>HR Comment:</strong> ${frappe.utils.escape_html(entry.hr_comment)}
                   </div>`
                : "";

            const canAct   = isEditable && st === "Filled";
            const approveDisabled = !canAct ? "disabled" : "";
            const rejectDisabled  = !canAct ? "disabled" : "";

            const actionCell = isEditable
                ? `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                       <button class="btn btn-xs btn-success poa-approve-btn"
                               data-fn="${fnEsc}" ${approveDisabled}>✓ Approve</button>
                       <button class="btn btn-xs btn-danger poa-reject-btn"
                               data-fn="${fnEsc}" ${rejectDisabled}>✗ Reject</button>
                   </div>`
                : `<span class="text-muted" style="font-size:0.78rem;">Read-only</span>`;

            let valueCell = "";
            let expandRow = "";

            if (isTable) {
                const parts = poa_buildChildParts(entry);
                valueCell   = parts.toggleHTML;
                expandRow   = parts.expandHTML;
                if (expandRow) {
                    expandRow = expandRow.replace(
                        'class="poa-expand-row"',
                        `class="poa-expand-row ${secBodyCls}"`
                    );
                }
            } else {
                const raw  = entry.current_value != null ? String(entry.current_value) : "";
                valueCell  = raw.trim()
                    ? `<span style="font-size:0.83rem;word-break:break-word;">${frappe.utils.escape_html(raw)}</span>`
                    : `<span class="text-muted" style="font-style:italic;font-size:0.81rem;">—</span>`;
            }

            rowsHTML += `
                <tr class="poa-field-row ${secBodyCls}" data-fieldname="${fnEsc}">
                    <td style="vertical-align:top;padding:7px 10px;">
                        <strong style="font-size:0.83rem;">${lbl}</strong>${tableBadge}
                        <div><small class="text-muted">${fnEsc}</small></div>
                    </td>
                    <td style="vertical-align:top;padding:7px 10px;overflow:hidden;">
                        ${valueCell}
                        ${commentBlock}
                    </td>
                    <td style="vertical-align:top;padding:7px 10px;">
                        <span class="badge badge-${cfg.cls}" style="font-size:0.77rem;padding:3px 7px;">
                            ${cfg.icon} ${st}
                        </span>
                        ${reviewed}
                    </td>
                    <td style="vertical-align:middle;padding:7px 12px;text-align:right;">
                        ${actionCell}
                    </td>
                </tr>
                ${expandRow}`;
        });
    });

    if (!rowsHTML) {
        rowsHTML = `<tr><td colspan="4" class="text-muted"
                        style="text-align:center;padding:28px;font-style:italic;">
                        No fields match the current filters.
                    </td></tr>`;
    }

    const filledCount = totalCounts.Filled || 0;
    const bulkBar = (isEditable && filledCount > 0) ? `
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-success poa-approve-all">✓ Approve All Filled (${filledCount})</button>
            <button class="btn btn-sm btn-danger  poa-reject-all" >✗ Reject All Filled (${filledCount})</button>
        </div>` : "";

    $wrapper.html(`
        <div class="poa-panel">
            <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                <span class="badge badge-secondary" style="padding:5px 10px;">Total: ${list.length}</span>
                <span class="badge badge-secondary" style="padding:5px 10px;">⏳ Pending: ${totalCounts.Pending  || 0}</span>
                <span class="badge badge-info"      style="padding:5px 10px;">📝 Filled: ${totalCounts.Filled   || 0}</span>
                <span class="badge badge-success"   style="padding:5px 10px;">✅ Approved: ${totalCounts.Approved || 0}</span>
                <span class="badge badge-danger"    style="padding:5px 10px;">❌ Rejected: ${totalCounts.Rejected || 0}</span>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;">
                <div>${tabs}</div>
                <input type="text" class="form-control poa-search"
                       placeholder="🔍 Search field name or label…"
                       value="${frappe.utils.escape_html(filterText)}"
                       style="max-width:260px;height:30px;font-size:0.83rem;padding:2px 8px;" />
            </div>

            ${bulkBar}

            <table class="table table-bordered poa-table"
                   style="font-size:0.83rem;margin-bottom:0;table-layout:fixed;width:100%;">
                <colgroup>
                    <col style="width:22%;">
                    <col style="width:34%;">
                    <col style="width:18%;">
                    <col style="width:26%;">
                </colgroup>
                <thead style="background:#f4f6f9;">
                    <tr>
                        <th>Field</th>
                        <th>Submitted Value</th>
                        <th>Status</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>
            <div class="text-muted" style="font-size:0.75rem;margin-top:6px;text-align:right;">
                Showing ${visibleTotal} of ${list.length} fields
            </div>
        </div>
    `);

    // ── Event wiring ───────────────────────────────────────────────────────
    $wrapper.find(".poa-section-hdr").on("click", function (e) {
        if ($(e.target).closest("button").length) return;
        const secBodyCls = $(this).data("secbody");
        const $rows      = $wrapper.find("." + secBodyCls);
        const $arrow     = $(this).find(".poa-sec-arrow");
        const isVisible  = $rows.filter(":visible").length > 0;
        if (isVisible) {
            $rows.hide();
            $arrow.text("▶");
        } else {
            $rows.not(".poa-expand-row").show();
            $arrow.text("▼");
        }
    });

    $wrapper.find(".poa-sec-approve").on("click", function () {
        poa_updateSection(frm, $(this).data("section"), "Approved");
    });
    $wrapper.find(".poa-sec-reject").on("click", function () {
        const sec = $(this).data("section");
        poa_promptComment(comment => poa_updateSection(frm, sec, "Rejected", comment));
    });

    $wrapper.find(".poa-approve-btn").on("click", function () {
        poa_updateOne(frm, $(this).data("fn"), "Approved");
    });
    $wrapper.find(".poa-reject-btn").on("click", function () {
        const fn = $(this).data("fn");
        poa_promptComment(comment => poa_updateOne(frm, fn, "Rejected", comment));
    });

    $wrapper.find(".poa-approve-all").on("click", () => poa_bulkUpdate(frm, "Approved"));
    $wrapper.find(".poa-reject-all").on("click",  () => {
        poa_promptComment(comment => poa_bulkUpdate(frm, "Rejected", comment));
    });

    $wrapper.find(".poa-toggle-child").on("click", function () {
        const eid     = $(this).data("expand-id");
        const $expRow = $("#" + eid);
        const $arrow  = $(this).find(".poa-ct-arrow");
        const count   = $(this).data("count");
        $expRow.toggle();
        const open = $expRow.is(":visible");
        $arrow.text(open ? "▼" : "▶");
        const tn = Array.from(this.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (tn) tn.textContent = ` 📋 ${count} row${count > 1 ? "s" : ""} — click to ${open ? "collapse" : "expand"}`;
    });

    $wrapper.find(".poa-tab-btn").on("click", function () {
        const st  = $(this).data("status");
        const txt = $wrapper.find(".poa-search").val() || "";
        poa_render(frm, st, txt);
    });

    let _debounce;
    $wrapper.find(".poa-search").on("input", function () {
        const txt = $(this).val();
        clearTimeout(_debounce);
        _debounce = setTimeout(() => poa_render(frm, filterStatus, txt), 260);
    });
}


// ── Comment dialog (before reject) ──────────────────────────────────────────
function poa_promptComment(onConfirm) {
    const d = new frappe.ui.Dialog({
        title: __("Rejection Comment"),
        fields: [{
            fieldname: "comment",
            fieldtype: "Small Text",
            label: __("Comment (required — will be shown to candidate)"),
            reqd: 1,
        }],
        primary_action_label: __("Reject"),
        primary_action({ comment }) {
            if (!comment || !comment.trim()) {
                frappe.msgprint(__("Please enter a rejection comment."));
                return;
            }
            d.hide();
            onConfirm(comment.trim());
        },
    });
    d.show();
}


// ── Server calls ────────────────────────────────────────────────────────────
function poa_load(frm) {
    if (frm.is_new()) return;
    frappe.call({
        method: POA.get,
        args: { job_applicant: frm.doc.name },
        callback(r) {
            if (r.message?.status === "success") {
                poa_patchDoc(frm, r.message.data);
                poa_render(frm);
            }
        },
    });
}

function poa_rerender(frm) {
    const $p  = frm.fields_dict["custom_pre_offer_approval_html"]?.$wrapper;
    const st  = $p?.find(".poa-tab-btn[style*='font-weight']").data("status") || "All";
    const txt = $p?.find(".poa-search").val() || "";
    poa_render(frm, st, txt);
}

function poa_updateOne(frm, fieldname, newStatus, comment) {
    frappe.call({
        method: POA.update, freeze: true, freeze_message: __("Saving…"),
        args: { job_applicant: frm.doc.name, fieldname, new_status: newStatus, comment: comment || null },
        callback(r) {
            if (r.message?.status === "success") {
                poa_patchDoc(frm, r.message.data);
                poa_rerender(frm);
                frappe.show_alert({
                    message: __(fieldname + " → " + newStatus),
                    indicator: newStatus === "Approved" ? "green" : "red",
                });
            }
        },
    });
}

function poa_updateSection(frm, sectionName, newStatus, comment) {
    frappe.call({
        method: POA.updateSec, freeze: true, freeze_message: __("Updating section…"),
        args: { job_applicant: frm.doc.name, section_name: sectionName, new_status: newStatus, comment: comment || null },
        callback(r) {
            if (r.message?.status === "success") {
                frappe.show_alert({
                    message: __(r.message.message),
                    indicator: newStatus === "Approved" ? "green" : "red",
                });
                poa_load(frm);
            }
        },
    });
}

function poa_bulkUpdate(frm, newStatus, comment) {
    frappe.confirm(
        __(`Set <strong>all Filled fields</strong> to <strong>${newStatus}</strong>?`),
        () => {
            frappe.call({
                method: POA.bulk, freeze: true, freeze_message: __("Updating…"),
                args: { job_applicant: frm.doc.name, new_status: newStatus, comment: comment || null },
                callback(r) {
                    if (r.message?.status === "success") {
                        poa_patchDoc(frm, r.message.data);
                        poa_render(frm);
                        frappe.show_alert({
                            message: __("All filled → " + newStatus),
                            indicator: newStatus === "Approved" ? "green" : "red",
                        });
                    }
                },
            });
        }
    );
}


// ── Frappe form hooks ─────────────────────────────────────────────────────
frappe.ui.form.on("Job Applicant", {
    refresh(frm) {
        frm._poa_list = null;
        if (!frm.is_new()) {
            setTimeout(() => poa_load(frm), 200);
        }
    },
});

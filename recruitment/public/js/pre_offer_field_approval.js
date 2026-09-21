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


// ── Attachments ────────────────────────────────────────────────────────────
// A submitted Attach field stores a file path ("/private/files/dummy.pdf"),
// which the panel used to print as plain text — the recruiter could see that a
// document was sent but not open it. These render it as a link instead, with an
// inline preview for the two types a browser can show on the spot.
const POA_IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i;
const POA_PDF_RE   = /\.pdf(\?|#|$)/i;
const POA_FILE_RE  = /^(https?:\/\/|\/files\/|\/private\/files\/)/i;

// Attach fields always; anything else only when the value really is a file path,
// so a plain Data field that happens to hold text is never turned into a link.
function poa_isFileValue(entry, raw) {
    const ft = entry.fieldtype || "";
    if (ft === "Attach" || ft === "Attach Image") return true;
    return POA_FILE_RE.test(raw);
}

function poa_fileName(url) {
    try {
        const path = String(url).split(/[?#]/)[0];
        return decodeURIComponent(path.split("/").filter(Boolean).pop() || url);
    } catch (e) {
        return url;
    }
}

function poa_fileCellHTML(raw) {
    const url  = frappe.utils.escape_html(raw);
    const name = frappe.utils.escape_html(poa_fileName(raw));
    return `<a class="poa-file-link" href="${url}" data-file="${url}" title="${url}"
               style="font-size:0.83rem;word-break:break-all;">📎 ${name}</a>
            <a href="${url}" target="_blank" rel="noopener" class="text-muted"
               title="${__("Open in a new tab")}" style="margin-left:6px;font-size:0.78rem;">↗</a>`;
}

// Preview in place for PDFs and images; every other type is handed to the
// browser in a new tab, which is what the ↗ link does anyway.
function poa_previewFile(url) {
    const isPdf = POA_PDF_RE.test(url);
    const isImg = POA_IMAGE_RE.test(url);
    if (!isPdf && !isImg) {
        window.open(url, "_blank", "noopener");
        return;
    }
    const safe = frappe.utils.escape_html(url);
    const d = new frappe.ui.Dialog({
        title: poa_fileName(url),
        size: "large",
        fields: [{ fieldtype: "HTML", fieldname: "body" }],
        primary_action_label: __("Open in a new tab"),
        primary_action: () => window.open(url, "_blank", "noopener"),
    });
    d.fields_dict.body.$wrapper.html(
        isPdf
            ? `<iframe src="${safe}" style="width:100%;height:70vh;border:1px solid var(--border-color);border-radius:4px;"></iframe>`
            : `<div style="text-align:center;"><img src="${safe}" style="max-width:100%;max-height:70vh;"></div>`
    );
    d.show();
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


// ── Pre Offer Approval tab visibility ──────────────────────────────────────
// The tab is hidden by default (`hidden: 1` on the Custom Field) and only
// appears once the pre-offer is actually in play — either it has been triggered
// for this candidate (a form was sent, or approval rows exist), or the user
// clicked "View Pre Offer Form" on the Pre Offer stage of the hiring workflow.
const POA_TAB  = "custom_pre_offer_approval_tab";
const POA_HTML = "custom_pre_offer_approval_html";

function poa_isTriggered(frm) {
    return !!(
        (frm.doc.custom_pre_offer_forms || []).length ||
        (frm.doc.custom_pre_offer_field_approvals || []).length
    );
}

// Frappe caches ONE form object per doctype and reuses it across docnames, so
// the "user asked to see it" flag has to be keyed by the applicant it was set
// for — otherwise revealing it for one candidate reveals it for the next.
function poa_isRevealed(frm) {
    return frm._poa_tab_revealed_for === frm.doc.name;
}

function poa_setTabVisible(frm, show) {
    try {
        (frm.layout && frm.layout.tabs || []).forEach((t) => {
            if (t.df && t.df.fieldname === POA_TAB) {
                // Set df.hidden too, so Frappe's own refresh_tabs() agrees with
                // us instead of undoing this on the next section refresh.
                t.df.hidden = show ? 0 : 1;
                t.toggle(show);
            }
        });
        const field = frm.fields_dict[POA_HTML];
        if (field && field.$wrapper) {
            field.df.hidden = show ? 0 : 1;
            if (show) {
                // Frappe marks the HTML field's section `empty-section` during the
                // initial refresh — before our content lands — and never re-checks.
                field.$wrapper.removeClass("hide-control").show();
                field.$wrapper.closest(".form-section")
                    .removeClass("empty-section").addClass("visible-section");
            }
        }
    } catch (e) { /* non-fatal */ }
}

function poa_syncTabVisibility(frm) {
    poa_setTabVisible(frm, poa_isRevealed(frm) || poa_isTriggered(frm));
}

/** Reveal + open the Pre Offer Approval tab. Called by the "View Pre Offer Form"
 *  action on the hiring workflow's Pre Offer stage (hiring_workflow_flow.js). */
function poa_reveal_pre_offer_tab(frm) {
    frm._poa_tab_revealed_for = frm.doc.name;
    poa_setTabVisible(frm, true);
    const tab = (frm.layout && frm.layout.tabs || []).find(
        (t) => t.df && t.df.fieldname === POA_TAB
    );
    if (tab && tab.set_active) tab.set_active();
    else if (frm.scroll_to_field) frm.scroll_to_field(POA_HTML);
    if (!frm._poa_list) poa_load(frm);
}

// ── MAIN RENDER ─────────────────────────────────────────────────────────────
function poa_render(frm, filterStatus, filterText) {
    const $wrapper = frm.fields_dict[POA_HTML]?.$wrapper;
    if (!$wrapper || !$wrapper.length) return;
    poa_syncTabVisibility(frm);

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
                if (!raw.trim()) {
                    valueCell = `<span class="text-muted" style="font-style:italic;font-size:0.81rem;">—</span>`;
                } else if (poa_isFileValue(entry, raw.trim())) {
                    valueCell = poa_fileCellHTML(raw.trim());
                } else {
                    valueCell = `<span style="font-size:0.83rem;word-break:break-word;">${frappe.utils.escape_html(raw)}</span>`;
                }
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

    $wrapper.find(".poa-file-link").on("click", function (e) {
        // Left-click previews in place; ctrl/cmd-click and the ↗ link keep the
        // browser's own "open in a new tab" behaviour.
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return;
        e.preventDefault();
        poa_previewFile($(this).data("file"));
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
function poa_load(frm, done) {
    if (frm.is_new()) return;
    frappe.call({
        method: POA.get,
        args: { job_applicant: frm.doc.name },
        callback(r) {
            if (r.message?.status === "success") {
                poa_patchDoc(frm, r.message.data);
                poa_render(frm);
                if (done) done(r.message.data);
            }
        },
    });
}

// Approving the last field advances the hiring stage server-side
// (advance_on_pre_offer_approved), which leaves the Hiring Workflow tab showing
// the stage the candidate has just left. Reload the form so every tab re-reads
// the document — but ONLY straight after an approval, never from poa_load's
// normal path, or an already-approved candidate would reload on every refresh.
function poa_reloadIfAllApproved(frm, list) {
    const rows = Array.isArray(list) ? list : poa_parseList(frm);
    if (!rows.length) return;
    const done = rows.every(r => (r.approval_status || r.status) === "Approved");
    if (!done) return;
    frappe.show_alert({ message: __("All fields approved — refreshing…"), indicator: "green" });
    // Let the alert paint before the reload swaps the form out.
    setTimeout(() => frm.reload_doc(), 400);
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
                if (newStatus === "Approved") poa_reloadIfAllApproved(frm, r.message.data);
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
                poa_load(frm, (data) => {
                    if (newStatus === "Approved") poa_reloadIfAllApproved(frm, data);
                });
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
                        if (newStatus === "Approved") poa_reloadIfAllApproved(frm, r.message.data);
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
        // Settle the tab straight away (before the 200ms load) so it never
        // flashes into view on a candidate that has no pre-offer in play.
        poa_syncTabVisibility(frm);
        if (!frm.is_new()) {
            setTimeout(() => poa_load(frm), 200);
        }
    },
});

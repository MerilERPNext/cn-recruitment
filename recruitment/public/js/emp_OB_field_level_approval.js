/**
 * emp_OB_field_level_approval.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Section-aware Field-Level Approval panel for Employee Onboarding.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │ 📂 Section Name   3P / 1A / 1R  [✓ Sec] [✗ Sec] │  ← section header row
 *   ├────────────────┬──────────────┬────────┬─────────┤
 *   │ Field Name     │ Current Val  │ Status │ ✓  ✗   │  ← field row
 *   │  (child table) │ ▶ N rows     │ ...    │ ✓  ✗   │
 *   ├────────────────┴──────────────┴────────┴─────────┤
 *   │  [expanded child table goes here — full width]   │  ← expansion row
 *   └──────────────────────────────────────────────────┘
 *
 * Key UX:
 *   • Click section header  → collapse / expand all field rows in that section
 *   • ✓/✗ Section buttons   → approve/reject ALL fields in the section at once
 *   • ✓/✗ per-row buttons   → approve/reject a single field
 *   • ▶ child table toggle  → expand child table in a full-width row below
 *   • Status tabs + search  → filter visible sections/fields
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── API paths ─────────────────────────────────────────────────────────────────
const FLA = {
    init:        "recruitment.api.field_level_approval.initialize_approval_json",
    update:      "recruitment.api.field_level_approval.update_field_approval_status",
    updateSec:   "recruitment.api.field_level_approval.update_section_approval_status",
    bulk:        "recruitment.api.field_level_approval.bulk_update_approval_status",
    saveFull:    "recruitment.api.field_level_approval.save_full_approval_json",
};

const FLA_ST = {
    Pending:  { cls: "warning", icon: "⏳" },
    Approved: { cls: "success", icon: "✅" },
    Rejected: { cls: "danger",  icon: "❌" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fla_parseList(frm) {
    try {
        const raw = frm.doc.custom_field_approval_json;
        if (!raw) return [];
        const p = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(p) ? p : [];
    } catch (_) { return []; }
}

function fla_patchDoc(frm, newList) {
    frm.doc.custom_field_approval_json = JSON.stringify(newList, null, 2);
    frm.refresh_field("custom_field_approval_json");
}

/** Sanitise a string into a valid HTML id fragment */
function fla_skey(str) {
    return (str || "general").replace(/[^a-z0-9]/gi, "_").toLowerCase();
}


// ─────────────────────────────────────────────────────────────────────────────
// Child-table parts:
//   toggleHTML → goes in the "Current Value" cell of the main field row
//   expandHTML → a hidden <tr colspan=4> placed directly after the main row
// ─────────────────────────────────────────────────────────────────────────────
function fla_buildChildParts(entry) {
    const rows        = Array.isArray(entry.current_value) ? entry.current_value : [];
    const childFields = Array.isArray(entry.child_fields)  ? entry.child_fields  : [];
    const eid         = "fla-exp-" + fla_skey(entry.fieldname);

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
        <a class="fla-toggle-child"
           data-expand-id="${eid}" data-count="${rows.length}"
           style="cursor:pointer;font-size:0.81rem;color:#1a73e8;
                  display:inline-flex;align-items:center;gap:5px;text-decoration:none;user-select:none;">
            <span class="fla-ct-arrow" style="font-size:0.66rem;">▶</span>
            📋 ${rows.length} row${rows.length > 1 ? "s" : ""}&nbsp;—&nbsp;click to expand
        </a>`;

    const expandHTML = `
        <tr id="${eid}" class="fla-expand-row" style="display:none;background:#f5f8ff;">
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


// ─────────────────────────────────────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────────────────────────────────────
function fla_render(frm, filterStatus, filterText) {
    const $wrapper = frm.fields_dict["custom_approval_html"]?.$wrapper;
    if (!$wrapper || !$wrapper.length) return;

    const list = fla_parseList(frm);

    if (!list.length) {
        $wrapper.html(`
            <div style="padding:32px;text-align:center;color:#888;">
                <div style="font-size:3rem;">📋</div>
                <p style="margin-top:8px;">No approval data found.</p>
                <p>Click <strong>Field Approvals → Initialize Approvals</strong> in the toolbar.</p>
            </div>`);
        return;
    }

    filterStatus = filterStatus || "All";
    filterText   = (filterText  || "").toLowerCase().trim();

    // ── Overall counts (full list, not filtered) ──────────────────────────────
    const totalCounts = { All: list.length, Pending: 0, Approved: 0, Rejected: 0 };
    list.forEach(e => { totalCounts[e.status] = (totalCounts[e.status] || 0) + 1; });

    // ── Group list by section ────────────────────────────────────────────────
    // Preserve insertion order using an array + a lookup map
    const sectionOrder = [];
    const sectionMap   = {};   // section name → { name, entries[] }

    list.forEach(entry => {
        const sec = entry.section || "General";
        if (!sectionMap[sec]) {
            sectionMap[sec] = { name: sec, entries: [] };
            sectionOrder.push(sec);
        }
        sectionMap[sec].entries.push(entry);
    });

    const isEditable = frm.doc.docstatus === 0;

    // ── Status tabs ───────────────────────────────────────────────────────────
    const tabClsMap = { All: "secondary", Pending: "warning", Approved: "success", Rejected: "danger" };
    const tabs = ["All", "Pending", "Approved", "Rejected"].map(st => {
        const active = filterStatus === st;
        return `<button class="btn btn-xs btn-${tabClsMap[st]} fla-tab-btn" data-status="${st}"
                        style="margin:0 3px 4px 0;${active ? "font-weight:700;box-shadow:0 0 0 2px rgba(0,0,0,.18);" : "opacity:.7"}">
                    ${st}&nbsp;(${totalCounts[st] || 0})
                </button>`;
    }).join("");

    // ── Build table rows ──────────────────────────────────────────────────────
    let rowsHTML     = "";
    let visibleTotal = 0;

    sectionOrder.forEach(secName => {
        const section    = sectionMap[secName];
        const secKey     = fla_skey(secName);
        const secBodyCls = "fla-sbody-" + secKey;

        // Apply filters to this section's entries
        const visibleEntries = section.entries.filter(e => {
            const stOk  = filterStatus === "All" || e.status === filterStatus;
            const txtOk = !filterText
                || (e.label     || "").toLowerCase().includes(filterText)
                || (e.fieldname || "").toLowerCase().includes(filterText);
            return stOk && txtOk;
        });

        // Skip sections with no visible entries (when filter is active)
        if ((filterStatus !== "All" || filterText) && !visibleEntries.length) return;

        visibleTotal += visibleEntries.length;

        // ── Section counts (always from full section, not filtered) ────────
        const sc = { Pending: 0, Approved: 0, Rejected: 0 };
        section.entries.forEach(e => { sc[e.status] = (sc[e.status] || 0) + 1; });
        const allApproved = sc.Approved === section.entries.length;
        const allRejected = sc.Rejected === section.entries.length;
        const summaryBadgeCls = allApproved ? "success" : (allRejected ? "danger" : "warning");

        const summaryText =
            `<span class="badge badge-${summaryBadgeCls}" style="font-size:0.72rem;margin-left:8px;padding:3px 7px;">
                ${sc.Pending}P / ${sc.Approved}A / ${sc.Rejected}R
             </span>`;

        // ── Section header row ────────────────────────────────────────────
        const secActions = isEditable ? `
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <button class="btn btn-xs btn-success fla-sec-approve"
                        data-section="${frappe.utils.escape_html(secName)}">✓ Approve Section</button>
                <button class="btn btn-xs btn-danger fla-sec-reject"
                        data-section="${frappe.utils.escape_html(secName)}">✗ Reject Section</button>
            </div>` : "";

        rowsHTML += `
            <tr class="fla-section-hdr" data-secbody="${secBodyCls}"
                style="background:#e8eef8;cursor:pointer;user-select:none;">
                <td colspan="3" style="padding:9px 12px;vertical-align:middle;">
                    <span class="fla-sec-arrow"
                          style="font-size:0.7rem;margin-right:6px;display:inline-block;">▼</span>
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

        // ── Field rows within this section ────────────────────────────────
        if (!visibleEntries.length) {
            // Show a faded "no matches" row only when filters are active
            rowsHTML += `
                <tr class="${secBodyCls}" style="display:none;">
                    <td colspan="4" class="text-muted"
                        style="text-align:center;padding:10px;font-size:0.8rem;font-style:italic;">
                        No fields match the current filter in this section.
                    </td>
                </tr>`;
        } else {
            visibleEntries.forEach(entry => {
                const st      = entry.status || "Pending";
                const cfg     = FLA_ST[st] || FLA_ST.Pending;
                const fn      = entry.fieldname || "";
                const fnEsc   = frappe.utils.escape_html(fn);
                const lbl     = frappe.utils.escape_html(entry.label || fn);
                const isTable = entry.fieldtype === "Table";

                const tableBadge = isTable
                    ? `<span class="badge badge-info"
                              style="font-size:0.62rem;vertical-align:middle;margin-left:4px;">Table</span>`
                    : "";

                const reviewed = entry.reviewed_by
                    ? `<small class="text-muted" style="display:block;margin-top:3px;line-height:1.4;">
                           by <strong>${frappe.utils.escape_html(entry.reviewed_by)}</strong><br>
                           ${frappe.datetime.str_to_user(entry.reviewed_on)}
                       </small>`
                    : "";

                const approveDisabled = (!isEditable || st === "Approved") ? "disabled" : "";
                const rejectDisabled  = (!isEditable || st === "Rejected")  ? "disabled" : "";

                const actionCell = isEditable
                    ? `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                           <button class="btn btn-xs btn-success fla-approve-btn"
                                   data-fn="${fnEsc}" ${approveDisabled}>✓ Approve</button>
                           <button class="btn btn-xs btn-danger fla-reject-btn"
                                   data-fn="${fnEsc}" ${rejectDisabled}>✗ Reject</button>
                       </div>`
                    : `<span class="text-muted" style="font-size:0.78rem;">Read-only</span>`;

                let valueCell  = "";
                let expandRow  = "";

                if (isTable) {
                    const parts = fla_buildChildParts(entry);
                    valueCell   = parts.toggleHTML;
                    expandRow   = parts.expandHTML;
                    // Make expansion row part of the section body (collapses with section)
                    if (expandRow) {
                        expandRow = expandRow.replace(
                            'class="fla-expand-row"',
                            `class="fla-expand-row ${secBodyCls}"`
                        );
                    }
                } else {
                    const raw = entry.current_value != null ? String(entry.current_value) : "";
                    valueCell  = raw.trim()
                        ? `<span style="font-size:0.83rem;word-break:break-word;">${frappe.utils.escape_html(raw)}</span>`
                        : `<span class="text-muted" style="font-style:italic;font-size:0.81rem;">—</span>`;
                }

                rowsHTML += `
                    <tr class="fla-field-row ${secBodyCls}" data-fieldname="${fnEsc}">
                        <td style="vertical-align:middle;padding:7px 10px;">
                            <strong style="font-size:0.83rem;">${lbl}</strong>${tableBadge}
                            <div><small class="text-muted">${fnEsc}</small></div>
                        </td>
                        <td style="vertical-align:middle;padding:7px 10px;overflow:hidden;">
                            ${valueCell}
                        </td>
                        <td style="vertical-align:middle;padding:7px 10px;">
                            <span class="badge badge-${cfg.cls}"
                                  style="font-size:0.77rem;padding:3px 7px;">
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
        }
    });

    if (!rowsHTML) {
        rowsHTML = `<tr><td colspan="4" class="text-muted"
                        style="text-align:center;padding:28px;font-style:italic;">
                        No fields match the current filters.
                    </td></tr>`;
    }

    // ── Bulk action bar ───────────────────────────────────────────────────────
    const bulkBar = isEditable ? `
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <button class="btn btn-sm btn-success fla-approve-all">✓ Approve All Pending</button>
            <button class="btn btn-sm btn-danger  fla-reject-all" >✗ Reject All Pending</button>
        </div>` : "";

    // ── Full panel ────────────────────────────────────────────────────────────
    $wrapper.html(`
        <div class="fla-panel">

            <!-- Summary -->
            <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                <span class="badge badge-secondary" style="padding:5px 10px;">Total: ${list.length}</span>
                <span class="badge badge-warning"   style="padding:5px 10px;">⏳ Pending: ${totalCounts.Pending  || 0}</span>
                <span class="badge badge-success"   style="padding:5px 10px;">✅ Approved: ${totalCounts.Approved || 0}</span>
                <span class="badge badge-danger"    style="padding:5px 10px;">❌ Rejected: ${totalCounts.Rejected || 0}</span>
            </div>

            <!-- Tabs + search -->
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px;">
                <div>${tabs}</div>
                <input type="text" class="form-control fla-search"
                       placeholder="🔍 Search field name or label…"
                       value="${frappe.utils.escape_html(filterText)}"
                       style="max-width:260px;height:30px;font-size:0.83rem;padding:2px 8px;" />
            </div>

            ${bulkBar}

            <!-- Table — table-layout:fixed locks column widths -->
            <table class="table table-bordered fla-table"
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
                        <th>Current Value</th>
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

    // ─── Event wiring ─────────────────────────────────────────────────────────

    // ── Section header: collapse / expand ────────────────────────────────────
    $wrapper.find(".fla-section-hdr").on("click", function (e) {
        // Don't collapse when clicking the action buttons inside the header
        if ($(e.target).closest("button").length) return;

        const secBodyCls = $(this).data("secbody");
        const $rows      = $wrapper.find("." + secBodyCls);
        const $arrow     = $(this).find(".fla-sec-arrow");
        const isVisible  = $rows.filter(":visible").length > 0;

        if (isVisible) {
            // Collapse: close any open child tables first
            $rows.filter(".fla-expand-row").hide();
            $rows.not(".fla-expand-row").hide();
            $arrow.text("▶");
        } else {
            // Expand: show only the direct field rows (not child-table expansions)
            $rows.not(".fla-expand-row").show();
            $arrow.text("▼");
        }
    });

    // ── Section approve / reject ──────────────────────────────────────────────
    $wrapper.find(".fla-sec-approve").on("click", function () {
        fla_updateSection(frm, $(this).data("section"), "Approved");
    });
    $wrapper.find(".fla-sec-reject").on("click", function () {
        fla_updateSection(frm, $(this).data("section"), "Rejected");
    });

    // ── Per-row approve / reject ──────────────────────────────────────────────
    $wrapper.find(".fla-approve-btn").on("click", function () {
        fla_updateOne(frm, $(this).data("fn"), "Approved");
    });
    $wrapper.find(".fla-reject-btn").on("click", function () {
        fla_updateOne(frm, $(this).data("fn"), "Rejected");
    });

    // ── Bulk all ──────────────────────────────────────────────────────────────
    $wrapper.find(".fla-approve-all").on("click", () => fla_bulkUpdate(frm, "Approved"));
    $wrapper.find(".fla-reject-all").on("click",  () => fla_bulkUpdate(frm, "Rejected"));

    // ── Child table toggle ────────────────────────────────────────────────────
    $wrapper.find(".fla-toggle-child").on("click", function () {
        const eid       = $(this).data("expand-id");
        const $expRow   = $("#" + eid);
        const $arrow    = $(this).find(".fla-ct-arrow");
        const count     = $(this).data("count");
        $expRow.toggle();
        const open = $expRow.is(":visible");
        $arrow.text(open ? "▼" : "▶");
        const tn = Array.from(this.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (tn) tn.textContent = ` 📋 ${count} row${count > 1 ? "s" : ""} — click to ${open ? "collapse" : "expand"}`;
    });

    // ── Status tab filter ─────────────────────────────────────────────────────
    $wrapper.find(".fla-tab-btn").on("click", function () {
        const st  = $(this).data("status");
        const txt = $wrapper.find(".fla-search").val() || "";
        fla_render(frm, st, txt);
    });

    // ── Live search ───────────────────────────────────────────────────────────
    let _debounce;
    $wrapper.find(".fla-search").on("input", function () {
        const txt = $(this).val();
        clearTimeout(_debounce);
        _debounce = setTimeout(() => fla_render(frm, filterStatus, txt), 260);
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// SERVER CALLS
// ─────────────────────────────────────────────────────────────────────────────

function fla_initIfNeeded(frm) {
    const list = fla_parseList(frm);
    if (list.length) { fla_render(frm); return; }
    frappe.call({
        method: FLA.init, args: { onboarding_name: frm.doc.name },
        callback(r) {
            if (r.message?.status === "success") {
                fla_patchDoc(frm, r.message.data);
                fla_render(frm);
            }
        },
    });
}

function fla_updateOne(frm, fieldname, newStatus) {
    frappe.call({
        method: FLA.update, freeze: true, freeze_message: __("Saving…"),
        args:   { onboarding_name: frm.doc.name, fieldname, new_status: newStatus },
        callback(r) {
            if (r.message?.status === "success") {
                fla_patchDoc(frm, r.message.data);
                const $p  = frm.fields_dict["custom_approval_html"]?.$wrapper;
                const st  = $p?.find(".fla-tab-btn[style*='font-weight']").data("status") || "All";
                const txt = $p?.find(".fla-search").val() || "";
                fla_render(frm, st, txt);
                frappe.show_alert({
                    message:   __(fieldname + " → " + newStatus),
                    indicator: newStatus === "Approved" ? "green" : "red",
                });
            }
        },
    });
}

function fla_updateSection(frm, sectionName, newStatus) {
    frappe.confirm(
        __(`Set <strong>all fields</strong> in section <strong>"${sectionName}"</strong> to <strong>${newStatus}</strong>?`),
        () => {
            frappe.call({
                method: FLA.updateSec, freeze: true, freeze_message: __("Updating section…"),
                args:   { onboarding_name: frm.doc.name, section_name: sectionName, new_status: newStatus },
                callback(r) {
                    if (r.message?.status === "success") {
                        fla_patchDoc(frm, r.message.data);
                        const $p  = frm.fields_dict["custom_approval_html"]?.$wrapper;
                        const st  = $p?.find(".fla-tab-btn[style*='font-weight']").data("status") || "All";
                        const txt = $p?.find(".fla-search").val() || "";
                        fla_render(frm, st, txt);
                        frappe.show_alert({
                            message:   __(r.message.message),
                            indicator: newStatus === "Approved" ? "green" : "red",
                        });
                    }
                },
            });
        }
    );
}

function fla_bulkUpdate(frm, newStatus) {
    frappe.confirm(
        __(`Set <strong>all Pending fields</strong> to <strong>${newStatus}</strong>?`),
        () => {
            frappe.call({
                method: FLA.bulk, freeze: true, freeze_message: __("Updating…"),
                args:   { onboarding_name: frm.doc.name, new_status: newStatus },
                callback(r) {
                    if (r.message?.status === "success") {
                        fla_patchDoc(frm, r.message.data);
                        fla_render(frm);
                        frappe.show_alert({
                            message:   __("All pending → " + newStatus),
                            indicator: newStatus === "Approved" ? "green" : "red",
                        });
                    }
                },
            });
        }
    );
}

function fla_manualInit(frm) {
    frappe.call({
        method: FLA.init, freeze: true, freeze_message: __("Re-reading fields from meta…"),
        args:   { onboarding_name: frm.doc.name },
        callback(r) {
            if (r.message?.status === "success") {
                fla_patchDoc(frm, r.message.data);
                fla_render(frm);
                frappe.show_alert({ message: __(r.message.message || "Done"), indicator: "blue" });
            }
        },
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// FRAPPE FORM HOOKS
// ─────────────────────────────────────────────────────────────────────────────
frappe.ui.form.on("Employee Onboarding", {

    refresh(frm) {
        frm.add_custom_button(
            __("Initialize Approvals"),
            () => fla_manualInit(frm),
            __("Field Approvals")
        );
        setTimeout(() => fla_initIfNeeded(frm), 200);
    },

    custom_field_approval_json(frm) {
        setTimeout(() => fla_render(frm), 80);
    },
});

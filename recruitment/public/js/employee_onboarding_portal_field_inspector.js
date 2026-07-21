// employee_onboarding_portal_settings.js
// Interactive Field Inspector — collapsible sections, Add Section, Remove, & Mandatory toggle

frappe.ui.form.on("Employee Onboarding", {

    refresh(frm) {
        frm.fields_dict["custom_available_candidate_portal_fields_html"].$wrapper.html("");
    },

    custom_onboarding_portal_form(frm) {
        if (frm.doc.docstatus !== 0) return;

        const hasRows = (frm.doc.custom_candidate_portal_fields || []).length > 0;

        // Form was cleared → offer to clear the rows that were loaded from it
        if (!frm.doc.custom_onboarding_portal_form) {
            if (!hasRows) return;
            frappe.confirm(
                __("Removing the linked form will also clear the candidate portal fields loaded from it. Continue?"),
                () => {
                    frm.clear_table("custom_candidate_portal_fields");
                    frm.refresh_field("custom_candidate_portal_fields");
                    // Wipe the inspector UI as well so stale "Added" badges don't linger
                    const $w = frm.fields_dict["custom_available_candidate_portal_fields_html"];
                    if ($w && $w.$wrapper) $w.$wrapper.html("");
                    frappe.show_alert({
                        message: __("Cleared candidate portal fields."),
                        indicator: "orange"
                    });
                }
                // If user cancels, the form field stays cleared but rows remain — they
                // can re-pick the form to reload, or remove rows manually.
            );
            return;
        }

        // Form was set → load fields from it (replacing existing, after confirm)
        const proceed = () => _load_selected_portal_form_rows(frm);

        if (hasRows) {
            frappe.confirm(
                __("Selecting a form will replace existing candidate portal fields. Continue?"),
                proceed
            );
            return;
        }

        proceed();
    },

    custom_fetch_candidate_portal_fields_btn(frm) {
        if (frm.doc.docstatus !== 0) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        frappe.call({
            method: "recruitment.api.candidate_portal.get_all_onboarding_fields_for_onboarding",
            freeze: true,
            freeze_message: __("Reading Employee Onboarding fields…"),
            callback(r) {
                if (!r.message || r.message.status !== "success") {
                    frappe.msgprint(__("Could not fetch fields."));
                    return;
                }
                _render_field_inspector(frm, r.message.fields);
            }
        });
    }
});

function _apply_form_rows(frm, rows) {
    frm.clear_table("custom_candidate_portal_fields");
    (rows || []).forEach(r => {
        const row = frm.add_child("custom_candidate_portal_fields");
        row.fieldname = r.fieldname;
        row.label = r.label;
        row.fieldtype = r.fieldtype;
        row.tab_label = r.tab_label;
        row.section_label = r.section_label;
        row.is_mandatory = r.is_mandatory;
        row.read_only = r.read_only;
        row.hidden = r.hidden;
        row.options = r.options;
        // Carry over child-field configuration from the source form template
        row.selected_child_fields  = r.selected_child_fields  || "";
        row.mandatory_child_fields = r.mandatory_child_fields || "";
    });
    frm.refresh_field("custom_candidate_portal_fields");
}

function _load_selected_portal_form_rows(frm) {
    frappe.call({
        method: "recruitment.api.candidate_portal.get_onboarding_form_fields",
        args: { form_name: frm.doc.custom_onboarding_portal_form },
        freeze: true,
        freeze_message: __("Loading selected onboarding portal form fields..."),
        callback(r) {
            if (!r.message || r.message.status !== "success") {
                frappe.msgprint(__("Could not load selected onboarding portal form."));
                return;
            }
            _apply_form_rows(frm, r.message.fields || []);
            frappe.show_alert({
                message: __("Loaded {0} fields from {1}", [r.message.total || 0, r.message.form_name || "form"]),
                indicator: "green"
            });
        }
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// Main Inspector Renderer
// ─────────────────────────────────────────────────────────────────────────────
function _render_field_inspector(frm, fields) {
    const _isDraft = () => frm.doc.docstatus === 0;

    // ── Group fields: tab → section → [fields] ─────────────────────────────
    const tabs     = {};
    const tabOrder = [];

    fields.forEach(f => {
        const tab = f.tab_label     || "General";
        const sec = f.section_label || "General";
        if (!tabs[tab])      { tabs[tab] = {}; tabOrder.push(tab); }
        if (!tabs[tab][sec]) tabs[tab][sec] = [];
        tabs[tab][sec].push(f);
    });

    // ── Get wrapper and REMOVE any previously bound delegated handlers ─────
    // This prevents double-firing when the user clicks "Fetch" more than once.
    const $w = frm.fields_dict["custom_available_candidate_portal_fields_html"].$wrapper;
    $w.off(".cps");

    // ── Helpers ────────────────────────────────────────────────────────────
    const _k      = str => (str || "general").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const _added  = () => new Set((frm.doc.custom_candidate_portal_fields || []).map(r => r.fieldname));
    const _getRow = fn  => (frm.doc.custom_candidate_portal_fields || []).find(r => r.fieldname === fn);

    function _secCounts(secFields, addedSet) {
        let added = 0;
        secFields.forEach(f => { if (addedSet.has(f.fieldname)) added++; });
        return { added, total: secFields.length };
    }

    // Returns: 'all' | 'some' | 'none'
    function _mandatoryState(secFields) {
        const addedSet = _added();
        let mandCount = 0, addedCount = 0;
        secFields.forEach(f => {
            if (!addedSet.has(f.fieldname)) return;
            addedCount++;
            const row = _getRow(f.fieldname);
            if (row && row.is_mandatory) mandCount++;
        });
        if (addedCount === 0) return 'none';
        if (mandCount === addedCount) return 'all';
        if (mandCount > 0)  return 'some';
        return 'none';
    }

    // ── Mandatory state for a given fieldname ──────────────────────────────
    function _isMandatory(fn) {
        const row = _getRow(fn);
        return row ? !!(row.is_mandatory) : false;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Child-field helpers — selected and mandatory subsets per Table field
    // ─────────────────────────────────────────────────────────────────────
    function _getSelectedChildFields(fn) {
        const row = _getRow(fn);
        if (!row || !row.selected_child_fields) return null;
        try { return JSON.parse(row.selected_child_fields); } catch(e) { return null; }
    }

    function _getMandatoryChildFields(fn) {
        const row = _getRow(fn);
        if (!row || !row.mandatory_child_fields) return [];
        try {
            const v = JSON.parse(row.mandatory_child_fields);
            return Array.isArray(v) ? v : [];
        } catch(e) { return []; }
    }

    function _childFieldBadge(fn) {
        const sel  = _getSelectedChildFields(fn);
        const mand = _getMandatoryChildFields(fn);
        const mandSuffix = mand.length
            ? ` <span style="background:rgba(255,255,255,0.25);padding:0 4px;border-radius:6px;
                              margin-left:3px;font-weight:600;">★${mand.length}</span>`
            : "";
        if (!sel) return `<span class="cps-child-badge badge badge-info"
                               data-fn="${fn}"
                               style="font-size:0.62rem;background:#0d6efd;color:#fff;white-space:nowrap;"
                               title="All child fields included${mand.length ? `, ${mand.length} mandatory` : ""}">All child fields${mandSuffix}</span>`;
        return `<span class="cps-child-badge badge badge-warning"
                      data-fn="${fn}"
                      style="font-size:0.62rem;background:#fd7e14;color:#fff;white-space:nowrap;"
                      title="${sel.length} child fields selected${mand.length ? `, ${mand.length} mandatory` : ""}">${sel.length} child fields${mandSuffix}</span>`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Action cell HTML — add / added (+remove+mandatory toggle)
    // ─────────────────────────────────────────────────────────────────────
    function _actionCell(isAdded, fn, lbl, ft, tab, sec) {
        const mandatory = isAdded ? _isMandatory(fn) : false;
        const mandCheck = `
            <label class="cps-mandatory-label"
                   title="Mark as Mandatory for candidate"
                   style="display:inline-flex;align-items:center;gap:4px;
                          margin-right:6px;font-size:0.72rem;font-weight:600;
                          color:${mandatory ? "#c0392b" : "#555"};cursor:pointer;
                          white-space:nowrap;user-select:none;">
                <input type="checkbox"
                       class="cps-mandatory-chk"
                       data-fn="${fn}"
                       ${mandatory ? "checked" : ""}
                       ${isAdded ? "" : ""}
                       style="cursor:pointer;width:13px;height:13px;" />
                Mandatory
            </label>`;

        if (isAdded) {
            const isTable = ft === "Table";
            return `
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap;">
                    ${mandCheck}
                    ${isTable ? `
                    <button class="btn btn-xs cps-child-fields-btn"
                            data-fn="${fn}"
                            title="Select which child fields to expose"
                            style="font-size:0.69rem;padding:2px 7px;
                                   background:#6610f2;color:#fff;border:none;border-radius:3px;
                                   white-space:nowrap;">
                        ⚙ Child Fields
                    </button>
                    ${_childFieldBadge(fn)}
                    ` : ""}
                    <span class="badge badge-success cps-added-badge"
                          style="font-size:0.68rem;white-space:nowrap;">✓ Added</span>
                    <button class="btn btn-xs cps-remove-btn"
                            data-fn="${fn}"
                            style="font-size:0.69rem;padding:2px 7px;
                                   background:#dc3545;color:#fff;border:none;border-radius:3px;
                                   white-space:nowrap;">
                        ✕ Remove
                    </button>
                </div>`;
        }

        return `
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap;">
                ${mandCheck}
                <button class="btn btn-xs cps-add-btn"
                        data-fn="${fn}" data-lbl="${lbl}"
                        data-ft="${ft}" data-tab="${tab}" data-sec="${sec}"
                        style="font-size:0.69rem;padding:2px 8px;
                               background:#2e6cd1;color:#fff;border:none;border-radius:3px;
                               white-space:nowrap;">
                    + Add
                </button>
            </div>`;
    }

    function _selectCell(isAdded, fn) {
        return `
            <input type="checkbox"
                   class="cps-row-select"
                   data-fn="${fn}"
                   ${isAdded ? "disabled" : ""}
                   title="${isAdded ? "Already added" : "Select for bulk add"}"
                   style="cursor:${isAdded ? "not-allowed" : "pointer"};" />`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Full HTML builder
    // ─────────────────────────────────────────────────────────────────────
    function buildHTML(addedSet) {
        const tabSuggestions = Array.from(new Set([
            ...tabOrder,
            ...(frm.doc.custom_candidate_portal_fields || []).map(r => (r.tab_label || "").trim()).filter(Boolean),
        ]));
        const secSuggestions = Array.from(new Set([
            ...tabOrder.flatMap(tab => Object.keys(tabs[tab] || {})),
            ...(frm.doc.custom_candidate_portal_fields || []).map(r => (r.section_label || "").trim()).filter(Boolean),
        ]));
        const tabOptionsHTML = tabSuggestions
            .map(v => `<option value="${frappe.utils.escape_html(v)}"></option>`)
            .join("");
        const secOptionsHTML = secSuggestions
            .map(v => `<option value="${frappe.utils.escape_html(v)}"></option>`)
            .join("");

        let html = `
        <div style="margin-top:10px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
                <input type="text" class="form-control cps-search"
                       placeholder="🔍 Search fieldname or label…"
                       style="max-width:340px;height:32px;font-size:0.83rem;" />
                <input type="text" class="form-control cps-target-tab"
                       list="cps-target-tab-list"
                       placeholder="Target Tab (optional)"
                       style="max-width:220px;height:32px;font-size:0.8rem;" />
                <input type="text" class="form-control cps-target-sec"
                       list="cps-target-sec-list"
                       placeholder="Target Section (optional)"
                       style="max-width:220px;height:32px;font-size:0.8rem;" />
                <datalist id="cps-target-tab-list">${tabOptionsHTML}</datalist>
                <datalist id="cps-target-sec-list">${secOptionsHTML}</datalist>
                <label title="When enabled, all selected fields are added as mandatory"
                       style="display:inline-flex;align-items:center;gap:6px;
                              font-size:0.76rem;color:#333;font-weight:600;
                              border:1px solid #f1c27d;border-radius:4px;
                              padding:5px 8px;background:#fff7e8;">
                    <input type="checkbox" class="cps-bulk-mandatory"
                           style="cursor:pointer;width:13px;height:13px;" />
                    Mark Selected Mandatory
                </label>
                <button class="btn btn-xs cps-select-visible-btn"
                        style="font-size:0.72rem;padding:4px 9px;background:#6c757d;color:#fff;border:none;border-radius:4px;">
                    Select Visible
                </button>
                <button class="btn btn-xs cps-clear-selected-btn"
                        style="font-size:0.72rem;padding:4px 9px;background:#adb5bd;color:#1f1f1f;border:none;border-radius:4px;">
                    Clear
                </button>
                <button class="btn btn-xs cps-add-selected-btn"
                        disabled
                        style="font-size:0.72rem;padding:4px 9px;background:#198754;color:#fff;border:none;border-radius:4px;opacity:0.7;">
                    + Add Selected
                </button>
                <span class="cps-selected-count"
                      style="font-size:0.75rem;color:#666;font-weight:600;">0 selected</span>
                <span style="font-size:0.75rem;color:#888;">
                    💡 Select fields, optionally set target Tab/Section, then bulk add. Press Enter in target boxes to add.
                </span>
            </div>`;

        tabOrder.forEach(tab => {
            const tabKey = _k(tab);
            html += `
            <div class="cps-tab-block" data-tab-key="${tabKey}">
                <div style="background:#1a3a6b;color:#fff;padding:9px 16px;border-radius:5px;
                            font-weight:600;font-size:0.88rem;margin-top:14px;margin-bottom:2px;">
                    📑 ${frappe.utils.escape_html(tab)}
                </div>`;

            Object.keys(tabs[tab]).forEach(sec => {
                const secFields = tabs[tab][sec];
                const secKey    = `${tabKey}__${_k(sec)}`;
                const counts    = _secCounts(secFields, addedSet);
                const allAdded  = counts.added === counts.total;

                html += `
                <div class="cps-sec-block" style="margin-left:10px;margin-bottom:6px;"
                     data-sec-key="${secKey}"
                     data-tab="${frappe.utils.escape_html(tab)}"
                     data-sec="${frappe.utils.escape_html(sec)}">

                    <!-- Section header: click area to collapse -->
                    <div class="cps-sec-header"
                         data-sec-key="${secKey}"
                         style="background:#e8eef8;padding:7px 12px;font-weight:600;
                                font-size:0.82rem;border-left:3px solid #4a7fd4;
                                cursor:pointer;user-select:none;
                                display:flex;align-items:center;justify-content:space-between;
                                border-radius:0 3px 3px 0;">
                        <span style="display:flex;align-items:center;gap:6px;">
                            <span class="cps-sec-arrow" data-sec-key="${secKey}"
                                  style="font-size:0.65rem;transition:transform 0.2s;display:inline-block;">▼</span>
                            📂 ${frappe.utils.escape_html(sec)}
                        </span>
                        <span style="display:flex;align-items:center;gap:8px;flex-wrap:nowrap;">
                            <span class="cps-sec-count badge badge-light"
                                  data-sec-key="${secKey}"
                                  style="font-size:0.68rem;background:#d0ddf7;color:#1a3a6b;
                                         font-weight:600;border-radius:10px;padding:1px 7px;">
                                ${counts.added}/${counts.total} added
                            </span>

                            <label class="cps-sec-select-label"
                                   data-sec-key="${secKey}"
                                   title="Select all fields in this section"
                                   style="display:inline-flex;align-items:center;gap:4px;
                                          font-size:0.71rem;font-weight:600;cursor:pointer;
                                          color:#1f4f91;white-space:nowrap;user-select:none;
                                          border:1px solid #9dc1f0;border-radius:3px;
                                          padding:2px 7px;background:#eef5ff;"
                                   onclick="event.stopPropagation()">
                                <input type="checkbox"
                                       class="cps-sec-select-chk"
                                       data-sec-key="${secKey}"
                                       style="cursor:pointer;width:12px;height:12px;" />
                                Select All
                            </label>

                            <!-- ★ Mark All Mandatory for this section -->
                            <label class="cps-sec-mand-label"
                                   data-sec-key="${secKey}"
                                   title="Toggle mandatory for all fields in this section"
                                   style="display:inline-flex;align-items:center;gap:4px;
                                          font-size:0.71rem;font-weight:600;cursor:pointer;
                                          color:#8e44ad;white-space:nowrap;user-select:none;
                                          border:1px solid #c39bd3;border-radius:3px;
                                          padding:2px 7px;background:#f9f0ff;"
                                   onclick="event.stopPropagation()">
                                <input type="checkbox"
                                       class="cps-sec-mand-chk"
                                       data-sec-key="${secKey}"
                                       style="cursor:pointer;width:12px;height:12px;" />
                                🔴 All Mandatory
                            </label>

                            <span class="cps-sec-primary-action" data-sec-key="${secKey}">
                                ${allAdded
                                    ? `<span class="cps-sec-all-badge badge badge-success"
                                              data-sec-key="${secKey}"
                                              style="font-size:0.68rem;">✓ All Added</span>`
                                    : `<button class="btn btn-xs cps-add-sec-btn"
                                               data-sec-key="${secKey}"
                                               data-tab="${frappe.utils.escape_html(tab)}"
                                               data-sec="${frappe.utils.escape_html(sec)}"
                                               style="font-size:0.7rem;padding:2px 8px;
                                                      background:#2e6cd1;color:#fff;border:none;
                                                      border-radius:3px;white-space:nowrap;">
                                           + Add All Section
                                       </button>`
                                }
                            </span>
                            <span class="cps-sec-remove-action" data-sec-key="${secKey}">
                                ${counts.added > 0
                                    ? `<button class="btn btn-xs cps-remove-sec-btn"
                                               data-sec-key="${secKey}"
                                               data-sec="${frappe.utils.escape_html(sec)}"
                                               style="font-size:0.7rem;padding:2px 8px;
                                                      background:#dc3545;color:#fff;border:none;
                                                      border-radius:3px;white-space:nowrap;">
                                           ✕ Remove Section
                                       </button>`
                                    : ""
                                }
                            </span>
                        </span>
                    </div>

                    <!-- Collapsible body -->
                    <div class="cps-sec-body" data-sec-key="${secKey}" data-open="true"
                         style="overflow:hidden;">
                        <table class="table table-bordered cps-field-table"
                               data-sec-key="${secKey}"
                               style="font-size:0.79rem;margin-bottom:0;">
                            <thead style="background:#f4f6f9;">
                                <tr>
                                    <th style="width:5%;text-align:center;">Select</th>
                                    <th style="width:22%">Fieldname</th>
                                    <th style="width:26%">Label</th>
                                    <th style="width:13%">Type</th>
                                    <th style="width:34%;text-align:right;">Action</th>
                                </tr>
                            </thead>
                            <tbody>`;

                secFields.forEach(f => {
                    const isAdded = addedSet.has(f.fieldname);
                    const fnEsc  = frappe.utils.escape_html(f.fieldname);
                    const lblEsc = frappe.utils.escape_html(f.label || f.fieldname);
                    const ftEsc  = frappe.utils.escape_html(f.fieldtype);
                    const tabEsc = frappe.utils.escape_html(tab);
                    const secEsc = frappe.utils.escape_html(sec);

                    html += `
                    <tr class="cps-field-row"
                        data-fn="${fnEsc}" data-lbl="${lblEsc}"
                        data-ft="${ftEsc}" data-tab="${tabEsc}"
                        data-sec="${secEsc}" data-sec-key="${secKey}">
                        <td class="cps-select-cell" style="text-align:center;vertical-align:middle;">
                            ${_selectCell(isAdded, fnEsc)}
                        </td>
                        <td><code style="font-size:0.72rem;color:#c0392b;">${fnEsc}</code></td>
                        <td style="font-size:0.8rem;">${lblEsc}</td>
                        <td>
                            <span class="badge badge-secondary" style="font-size:0.67rem;">
                                ${ftEsc}
                            </span>
                        </td>
                        <td class="cps-action-cell" data-fn="${fnEsc}"
                            style="text-align:right;vertical-align:middle;">
                            ${_actionCell(isAdded, fnEsc, lblEsc, ftEsc, tabEsc, secEsc)}
                        </td>
                    </tr>`;

                    if (f.fieldtype === "Table" && f.options) {
                        const childDt = frappe.utils.escape_html(f.options);
                        html += `
                    <tr class="cps-child-panel-row" data-fn="${fnEsc}" style="display:none;">
                        <td colspan="5" style="background:linear-gradient(180deg,#faf5ff 0%,#ffffff 100%);
                                              padding:0;border-top:2px solid #6610f2;">
                            <div class="cps-child-panel" data-fn="${fnEsc}" data-child-dt="${childDt}"
                                 style="padding:14px 20px 18px;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;
                                            gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                                    <div style="min-width:0;">
                                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                            <span style="background:#6610f2;color:#fff;padding:3px 9px;
                                                         border-radius:4px;font-size:0.7rem;
                                                         font-weight:700;letter-spacing:0.3px;">⚙ CHILD FIELDS</span>
                                            <code style="color:#c0392b;font-size:0.78rem;font-weight:600;">${fnEsc}</code>
                                        </div>
                                        <div style="font-size:0.74rem;color:#555;margin-top:5px;">
                                            Choose which fields of this child table to expose in the candidate portal.
                                        </div>
                                    </div>
                                    <button class="cps-child-close-btn" data-fn="${fnEsc}"
                                            title="Close panel"
                                            style="background:#fff;border:1px solid #d0c5e2;color:#6610f2;
                                                   padding:4px 11px;font-size:0.72rem;border-radius:4px;
                                                   cursor:pointer;font-weight:600;white-space:nowrap;">
                                        ✕ Close
                                    </button>
                                </div>
                                <div class="cps-child-panel-content" data-fn="${fnEsc}">
                                    <div style="color:#888;font-size:0.82rem;padding:18px;text-align:center;
                                                background:#fff;border:1px dashed #d4c5e8;border-radius:6px;">
                                        ⟳ Loading child fields…
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>`;
                    }
                });

                html += `
                            </tbody>
                        </table>
                    </div><!-- /cps-sec-body -->
                </div><!-- /cps-sec-block -->`;
            });

            html += `</div><!-- /cps-tab-block -->`;
        });

        html += `</div>`;
        return html;
    }

    // ── Initial render ─────────────────────────────────────────────────────
    $w.html(buildHTML(_added()));

    // ─────────────────────────────────────────────────────────────────────
    // Helpers: refresh a single row's action cell
    // ─────────────────────────────────────────────────────────────────────
    function _refreshRowCell(fn, isAdded) {
        const $row = $w.find(`.cps-field-row[data-fn="${fn}"]`);
        if (!$row.length) return;
        const lbl = $row.data("lbl"), ft  = $row.data("ft");
        const tab = $row.data("tab"), sec = $row.data("sec");
        $row.find(".cps-select-cell").html(_selectCell(isAdded, fn));
        $row.find(".cps-action-cell")
            .html(_actionCell(isAdded, fn, lbl, ft,
                  frappe.utils.escape_html(tab),
                  frappe.utils.escape_html(sec)));
        _bindActionCellEvents($row.find(".cps-action-cell"));
        const secKey = $row.data("sec-key");
        if (secKey) _syncSecSelectChk(secKey);
        _syncBulkAddState();

        // Hide child panel row when field is removed AND reset its content so a
        // future re-add starts from a fresh render against the new (empty) row state.
        if (!isAdded) {
            const $panelRow = $w.find(`.cps-child-panel-row[data-fn="${fn}"]`);
            $panelRow.slideUp(150, function () {
                $panelRow.find(`.cps-child-panel-content[data-fn="${fn}"]`).html(`
                    <div style="color:#888;font-size:0.82rem;padding:18px;text-align:center;
                                background:#fff;border:1px dashed #d4c5e8;border-radius:6px;">
                        ⟳ Loading child fields…
                    </div>`);
            });
        }
    }

    function _secFieldsByKey(secKey) {
        for (const tab of tabOrder) {
            for (const sec of Object.keys(tabs[tab])) {
                if (`${_k(tab)}__${_k(sec)}` === secKey) return tabs[tab][sec];
            }
        }
        return [];
    }

    function _refreshSecHeader(secKey) {
        const secFields = _secFieldsByKey(secKey);
        const addedSet  = _added();
        const counts    = _secCounts(secFields, addedSet);
        const allAdded  = counts.added === counts.total;

        $w.find(`.cps-sec-count[data-sec-key="${secKey}"]`)
          .text(`${counts.added}/${counts.total} added`);

        const $hdr = $w.find(`.cps-sec-header[data-sec-key="${secKey}"]`);
        const $blk = $w.find(`.cps-sec-block[data-sec-key="${secKey}"]`);
        const tabV = $blk.data("tab") || "";
        const secV = $blk.data("sec") || "";
        const primaryHTML = allAdded
            ? `<span class="cps-sec-all-badge badge badge-success"
                     data-sec-key="${secKey}"
                     style="font-size:0.68rem;">✓ All Added</span>`
            : `<button class="btn btn-xs cps-add-sec-btn"
                       data-sec-key="${secKey}"
                       data-tab="${frappe.utils.escape_html(tabV)}"
                       data-sec="${frappe.utils.escape_html(secV)}"
                       style="font-size:0.7rem;padding:2px 8px;
                              background:#2e6cd1;color:#fff;border:none;
                              border-radius:3px;white-space:nowrap;">
                   + Add All Section
               </button>`;
        $hdr.find(`.cps-sec-primary-action[data-sec-key="${secKey}"]`).html(primaryHTML);

        const removeHTML = counts.added > 0
            ? `<button class="btn btn-xs cps-remove-sec-btn"
                       data-sec-key="${secKey}"
                       data-sec="${frappe.utils.escape_html(secV)}"
                       style="font-size:0.7rem;padding:2px 8px;
                              background:#dc3545;color:#fff;border:none;
                              border-radius:3px;white-space:nowrap;">
                   ✕ Remove Section
               </button>`
            : "";
        $hdr.find(`.cps-sec-remove-action[data-sec-key="${secKey}"]`).html(removeHTML);
    }

    function _selectedFns() {
        return $w.find(".cps-row-select:checked").map(function () {
            return $(this).data("fn");
        }).get();
    }

    function _syncBulkAddState() {
        const selectedCount = _selectedFns().length;
        $w.find(".cps-selected-count").text(`${selectedCount} selected`);
        $w.find(".cps-add-selected-btn")
            .prop("disabled", selectedCount === 0)
            .css("opacity", selectedCount === 0 ? 0.7 : 1);
    }

    function _syncSecSelectChk(secKey) {
        const $chk = $w.find(`.cps-sec-select-chk[data-sec-key="${secKey}"]`);
        if (!$chk.length) return;

        const secFields = _secFieldsByKey(secKey);
        let selectable = 0;
        let selected = 0;

        secFields.forEach(f => {
            const $rowChk = $w.find(`.cps-field-row[data-fn="${f.fieldname}"] .cps-row-select`);
            if (!$rowChk.length || $rowChk.prop("disabled")) return;
            selectable++;
            if ($rowChk.prop("checked")) selected++;
        });

        if (!selectable) {
            $chk.prop("checked", false).prop("indeterminate", false).prop("disabled", true);
            $chk.closest(".cps-sec-select-label").css("opacity", 0.6);
            return;
        }

        $chk.prop("disabled", false);
        $chk.closest(".cps-sec-select-label").css("opacity", 1);

        if (selected === selectable) {
            $chk.prop("checked", true).prop("indeterminate", false);
        } else if (selected > 0) {
            $chk.prop("checked", false).prop("indeterminate", true);
        } else {
            $chk.prop("checked", false).prop("indeterminate", false);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Add single field
    // ─────────────────────────────────────────────────────────────────────
    function _addField(fn, lbl, ft, tab, sec, isMandatory) {
        if (!_isDraft()) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return false;
        }
        if ((frm.doc.custom_candidate_portal_fields || []).some(r => r.fieldname === fn)) return false;

        const row = frappe.model.add_child(frm.doc, "Employee Onboarding Portal Field", "custom_candidate_portal_fields");
        frappe.model.set_value(row.doctype, row.name, "fieldname",     fn);
        frappe.model.set_value(row.doctype, row.name, "label",         lbl);
        frappe.model.set_value(row.doctype, row.name, "fieldtype",     ft);
        frappe.model.set_value(row.doctype, row.name, "tab_label",     tab === "General" ? "" : tab);
        frappe.model.set_value(row.doctype, row.name, "section_label", sec === "General" ? "" : sec);
        frappe.model.set_value(row.doctype, row.name, "is_mandatory",  isMandatory ? 1 : 0);
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Remove single field
    // ─────────────────────────────────────────────────────────────────────
    function _removeField(fn) {
        if (!_isDraft()) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        const idx = (frm.doc.custom_candidate_portal_fields || []).findIndex(r => r.fieldname === fn);
        if (idx === -1) return;
        frappe.model.clear_doc("Employee Onboarding Portal Field", frm.doc.custom_candidate_portal_fields[idx].name);
        frm.doc.custom_candidate_portal_fields.splice(idx, 1);
        frm.dirty();
    }

    // ─────────────────────────────────────────────────────────────────────
    // Bind events on a cell / scope
    // ─────────────────────────────────────────────────────────────────────
    function _bindActionCellEvents($scope) {

        // ADD button
        $scope.find(".cps-add-btn").off("click").on("click", function (e) {
            const $cell = $(this).closest(".cps-action-cell");
            const fn    = $cell.data("fn");
            const $row  = $(this).closest(".cps-field-row");
            const lbl   = $row.data("lbl"), ft  = $row.data("ft");
            const tab   = $row.data("tab"), sec = $row.data("sec");
            const secKey = $row.data("sec-key");

            // Read mandatory checkbox in THIS cell
            const isMandatory = $scope.find(".cps-mandatory-chk").prop("checked");

            if (!_addField(fn, lbl, ft, tab, sec, isMandatory)) {
                frappe.show_alert({ message: __(`${fn} already added.`), indicator: "orange" });
                return;
            }
            frm.refresh_field("custom_candidate_portal_fields");
            _refreshRowCell(fn, true);
            _refreshSecHeader(secKey);
            frappe.show_alert({
                message: __(`Added: ${lbl || fn}${isMandatory ? " (Mandatory)" : ""}`),
                indicator: "green"
            });
        });

        // REMOVE button
        $scope.find(".cps-remove-btn").off("click").on("click", function () {
            const $cell  = $(this).closest(".cps-action-cell");
            const fn     = $cell.data("fn");
            const $row   = $(this).closest(".cps-field-row");
            const secKey = $row.data("sec-key");

            _removeField(fn);
            frm.refresh_field("custom_candidate_portal_fields");
            _refreshRowCell(fn, false);
            _refreshSecHeader(secKey);
            frappe.show_alert({ message: __(`Removed: ${fn}`), indicator: "orange" });
        });

        // MANDATORY checkbox — toggle live on already-added fields
        $scope.find(".cps-mandatory-chk").off("change").on("change", function () {
            if (!_isDraft()) {
                $(this).prop("checked", !$(this).prop("checked"));
                frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
                return;
            }
            const fn      = $(this).data("fn");
            const checked = $(this).prop("checked");
            const $label  = $(this).closest(".cps-mandatory-label");
            const $row    = $(this).closest(".cps-field-row");
            const secKey  = $row.data("sec-key");

            // Update visual colour
            $label.css("color", checked ? "#c0392b" : "#555");

            // If field is already in child table → update it live
            const childRow = _getRow(fn);
            if (childRow) {
                frappe.model.set_value(
                    childRow.doctype, childRow.name,
                    "is_mandatory", checked ? 1 : 0
                );
                frm.refresh_field("custom_candidate_portal_fields");
                frappe.show_alert({
                    message: __(checked
                        ? `"${fn}" marked as Mandatory`
                        : `"${fn}" marked as Optional`),
                    indicator: checked ? "red" : "blue"
                });
            }
            // Sync section-level checkbox state
            if (secKey) _syncSecMandChk(secKey);
            // If not yet added → the checkbox value is read at "Add" click time
        });
    }

    // ── Bind all action cells initially ───────────────────────────────────
    $w.find(".cps-action-cell").each(function() {
        _bindActionCellEvents($(this));
    });
    _syncBulkAddState();

    $w.on("change.cps", ".cps-row-select", function () {
        const secKey = $(this).closest(".cps-field-row").data("sec-key");
        if (secKey) _syncSecSelectChk(secKey);
        _syncBulkAddState();
    });

    $w.on("click.cps", ".cps-select-visible-btn", function () {
        $w.find(".cps-field-row:visible .cps-row-select:not(:disabled)").prop("checked", true);
        tabOrder.forEach(tab => {
            Object.keys(tabs[tab]).forEach(sec => _syncSecSelectChk(`${_k(tab)}__${_k(sec)}`));
        });
        _syncBulkAddState();
    });

    $w.on("click.cps", ".cps-clear-selected-btn", function () {
        $w.find(".cps-row-select:checked").prop("checked", false);
        tabOrder.forEach(tab => {
            Object.keys(tabs[tab]).forEach(sec => _syncSecSelectChk(`${_k(tab)}__${_k(sec)}`));
        });
        _syncBulkAddState();
    });

    $w.on("change.cps", ".cps-sec-select-chk", function (e) {
        e.stopPropagation();
        const secKey = $(this).data("sec-key");
        const checked = $(this).prop("checked");
        const secFields = _secFieldsByKey(secKey);

        secFields.forEach(f => {
            const $rowChk = $w.find(`.cps-field-row[data-fn="${f.fieldname}"] .cps-row-select`);
            if (!$rowChk.length || $rowChk.prop("disabled")) return;
            $rowChk.prop("checked", checked);
        });

        _syncSecSelectChk(secKey);
        _syncBulkAddState();
    });

    $w.on("click.cps", ".cps-add-selected-btn", function () {
        if (!_isDraft()) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        const selectedFns = _selectedFns();
        if (!selectedFns.length) return;

        const tabOverride = ($w.find(".cps-target-tab").val() || "").trim();
        const secOverride = ($w.find(".cps-target-sec").val() || "").trim();
        const forceMandatory = $w.find(".cps-bulk-mandatory").prop("checked");
        const touchedSecKeys = new Set();
        let addedCount = 0;

        selectedFns.forEach(fn => {
            const $row = $w.find(".cps-field-row").filter(function () {
                return ($(this).data("fn") || "") === fn;
            }).first();
            if (!$row.length) return;

            const lbl = $row.data("lbl") || fn;
            const ft = $row.data("ft") || "Data";
            const tab = tabOverride || ($row.data("tab") || "General");
            const sec = secOverride || ($row.data("sec") || "General");
            const secKey = $row.data("sec-key");
            const isMandatory = forceMandatory || $row.find(".cps-mandatory-chk").prop("checked");

            if (_addField(fn, lbl, ft, tab, sec, isMandatory)) {
                addedCount++;
                if (secKey) touchedSecKeys.add(secKey);
            }
        });

        if (!addedCount) {
            frappe.show_alert({ message: __("Selected fields are already added."), indicator: "orange" });
            return;
        }

        frm.refresh_field("custom_candidate_portal_fields");
        const newAdded = _added();
        selectedFns.forEach(fn => _refreshRowCell(fn, newAdded.has(fn)));
        touchedSecKeys.forEach(secKey => {
            _refreshSecHeader(secKey);
            _syncSecMandChk(secKey);
        });
        _syncBulkAddState();

        frappe.show_alert({
            message: __(`Added ${addedCount} selected field(s)${tabOverride || secOverride ? ` to ${tabOverride || "General"} / ${secOverride || "General"}` : ""}${forceMandatory ? " as Mandatory" : ""}`),
            indicator: "green"
        });
    });

    $w.on("keydown.cps", ".cps-target-tab, .cps-target-sec", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        $w.find(".cps-add-selected-btn").trigger("click");
    });

    // ─────────────────────────────────────────────────────────────────────
    // Add ALL Section button (event delegation)
    // ─────────────────────────────────────────────────────────────────────
    $w.on("click.cps", ".cps-add-sec-btn", function (e) {
        if (!_isDraft()) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        e.stopPropagation();
        const secKey  = $(this).data("sec-key");
        const tab     = $(this).data("tab");
        const sec     = $(this).data("sec");
        const secFlds = _secFieldsByKey(secKey);
        const addedSet = _added();
        let count = 0;

        secFlds.forEach(f => {
            if (addedSet.has(f.fieldname)) return;
            // Respect the individual mandatory checkbox state if it exists in DOM
            const $chk = $w.find(`.cps-field-row[data-fn="${frappe.utils.escape_html(f.fieldname)}"] .cps-mandatory-chk`);
            const isMandatory = $chk.length ? $chk.prop("checked") : false;
            _addField(f.fieldname, f.label || f.fieldname, f.fieldtype, tab, sec, isMandatory);
            count++;
        });

        frm.refresh_field("custom_candidate_portal_fields");

        const newAdded = _added();
        secFlds.forEach(f => {
            _refreshRowCell(f.fieldname, newAdded.has(f.fieldname));
        });
        _refreshSecHeader(secKey);
        _syncSecMandChk(secKey);

        frappe.show_alert({
            message: __(`Added ${count} field(s) from "${sec}"`),
            indicator: "green"
        });
    });

    $w.on("click.cps", ".cps-remove-sec-btn", function (e) {
        if (!_isDraft()) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        e.stopPropagation();
        const secKey  = $(this).data("sec-key");
        const sec     = $(this).data("sec");
        const secFlds = _secFieldsByKey(secKey);
        const addedSet = _added();
        let removedCount = 0;

        secFlds.forEach(f => {
            if (!addedSet.has(f.fieldname)) return;
            _removeField(f.fieldname);
            removedCount++;
        });

        if (!removedCount) {
            frappe.show_alert({ message: __(`No fields to remove from "${sec}"`), indicator: "orange" });
            return;
        }

        frm.refresh_field("custom_candidate_portal_fields");

        const newAdded = _added();
        secFlds.forEach(f => {
            _refreshRowCell(f.fieldname, newAdded.has(f.fieldname));
        });
        _refreshSecHeader(secKey);
        _syncSecMandChk(secKey);
        _syncSecSelectChk(secKey);
        _syncBulkAddState();

        frappe.show_alert({
            message: __(`Removed ${removedCount} field(s) from "${sec}"`),
            indicator: "orange"
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    // Save child field selection back to the per-record row (and persist)
    // ─────────────────────────────────────────────────────────────────────
    function _saveChildFieldSelection(fn, selectedFieldnames, mandatoryFieldnames) {
        if (!_isDraft()) {
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        const childRow = _getRow(fn);
        if (!childRow) {
            frappe.show_alert({ message: __(`Add "${fn}" to portal fields first before configuring child fields.`), indicator: "orange" });
            return;
        }
        const selectedJson  = (selectedFieldnames && selectedFieldnames.length > 0) ? JSON.stringify(selectedFieldnames) : "";
        const validMandatory = (mandatoryFieldnames || []).filter(m => {
            if (!selectedFieldnames || selectedFieldnames.length === 0) return true;
            return selectedFieldnames.indexOf(m) !== -1;
        });
        const mandatoryJson = validMandatory.length > 0 ? JSON.stringify(validMandatory) : "";

        const selCount  = selectedFieldnames ? selectedFieldnames.length : 0;
        const mandCount = validMandatory.length;
        const summaryMsg =
            (selCount > 0
                ? `${selCount} child field(s) selected`
                : `all child fields will be exposed`)
            + (mandCount > 0 ? `, ${mandCount} marked mandatory` : "")
            + ` for "${fn}"`;

        Promise.all([
            frappe.model.set_value(childRow.doctype, childRow.name, "selected_child_fields",  selectedJson),
            frappe.model.set_value(childRow.doctype, childRow.name, "mandatory_child_fields", mandatoryJson),
        ]).then(() => {
            frm.refresh_field("custom_candidate_portal_fields");
            const $actionCell = $w.find(`.cps-action-cell[data-fn="${fn}"]`);
            $actionCell.find(".cps-child-badge").replaceWith(_childFieldBadge(fn));
            return frm.save();
        }).then(() => {
            frappe.show_alert({
                message: __("Saved & persisted: " + summaryMsg),
                indicator: "green"
            });
        }).catch((err) => {
            console.error("Child field selection save failed:", err);
            frappe.show_alert({
                message: __(
                    "Changes staged in-memory but the form could not be saved automatically. " +
                    "Please press Ctrl+S to save the form so the changes persist."
                ),
                indicator: "orange"
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Render child field grid inside the expandable panel
    // ─────────────────────────────────────────────────────────────────────
    function _renderChildPanel(fn, childDt, $panelContent) {
        frappe.call({
            method: "recruitment.api.candidate_portal.get_child_doctype_fields",
            args: { child_doctype: childDt },
            callback(r) {
                if (!r.message || r.message.status !== "success") {
                    $panelContent.html(`<em style="color:red;">Could not load child fields.</em>`);
                    return;
                }
                const childFields = r.message.fields || [];
                if (!childFields.length) {
                    $panelContent.html(`<em style="color:#888;">No fields found for ${childDt}.</em>`);
                    return;
                }

                const currentSel = _getSelectedChildFields(fn);
                const selectedSet = currentSel ? new Set(currentSel) : null;
                const mandatorySet = new Set(_getMandatoryChildFields(fn));

                const types = Array.from(new Set(childFields.map(f => f.fieldtype))).sort();
                const filterChipsHTML = types.length > 1
                    ? `<div class="cps-child-filter-chips"
                            style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;
                                   padding-top:8px;border-top:1px dashed #e8dcf5;">
                        <span style="font-size:0.7rem;color:#555;font-weight:600;
                                     padding:3px 4px 3px 0;">Filter:</span>
                        <button class="cps-child-type-chip cps-child-type-active" data-type=""
                                style="font-size:0.68rem;padding:2px 10px;border:1px solid #6610f2;
                                       background:#6610f2;color:#fff;border-radius:11px;
                                       cursor:pointer;font-weight:600;">
                            All
                        </button>
                        ${types.map(t => `
                            <button class="cps-child-type-chip" data-type="${frappe.utils.escape_html(t)}"
                                    style="font-size:0.68rem;padding:2px 10px;border:1px solid #c39bd3;
                                           background:#fff;color:#6610f2;border-radius:11px;cursor:pointer;">
                                ${frappe.utils.escape_html(t)}
                            </button>`).join("")}
                    </div>`
                    : "";

                let html = `
                <div class="cps-child-toolbar"
                     style="background:#fff;border:1px solid #e0d4ef;border-radius:6px;
                            padding:10px 12px;margin-bottom:12px;
                            box-shadow:0 1px 3px rgba(102,16,242,0.06);">
                    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <input type="text" class="form-control cps-child-search"
                               placeholder="🔍 Search child fields by name or label…"
                               style="flex:1;min-width:200px;max-width:340px;height:30px;
                                      font-size:0.78rem;border:1px solid #d4c5e8;" />
                        <button class="btn btn-xs cps-child-sel-all"
                                title="Select all visible fields"
                                style="font-size:0.71rem;padding:4px 11px;background:#198754;color:#fff;
                                       border:none;border-radius:4px;font-weight:600;">
                            ✓ Select All
                        </button>
                        <button class="btn btn-xs cps-child-sel-none"
                                title="Clear all visible fields"
                                style="font-size:0.71rem;padding:4px 11px;background:#fff;color:#444;
                                       border:1px solid #ccc;border-radius:4px;">
                            ✕ Clear
                        </button>
                        <button class="btn btn-xs cps-child-mand-all"
                                title="Toggle mandatory on currently-visible selected fields (respects search & type filter)"
                                style="font-size:0.71rem;padding:4px 11px;background:#fff;color:#c0392b;
                                       border:1px solid #f1b0b7;border-radius:4px;font-weight:600;">
                            ★ Mandatory: Visible
                        </button>
                        <div style="flex:1;min-width:170px;display:flex;align-items:center;gap:7px;">
                            <div style="flex:1;height:7px;background:#eee;border-radius:4px;overflow:hidden;">
                                <div class="cps-child-progress-bar"
                                     style="height:100%;width:0%;background:linear-gradient(90deg,#6610f2,#a78bfa);
                                            transition:width 0.25s;"></div>
                            </div>
                            <span class="cps-child-sel-count"
                                  style="font-size:0.72rem;color:#444;font-weight:600;white-space:nowrap;
                                         min-width:110px;text-align:right;">0 / ${childFields.length}</span>
                        </div>
                        <button class="btn btn-xs cps-child-save-btn"
                                data-fn="${frappe.utils.escape_html(fn)}"
                                style="font-size:0.74rem;padding:5px 13px;background:#6610f2;color:#fff;
                                       border:none;border-radius:4px;font-weight:600;
                                       box-shadow:0 1px 3px rgba(102,16,242,0.25);">
                            💾 Save Selection
                        </button>
                    </div>
                    ${filterChipsHTML}
                </div>

                <div class="cps-child-grid"
                     style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
                            gap:7px;">`;

                childFields.forEach(cf => {
                    const cfFn  = frappe.utils.escape_html(cf.fieldname);
                    const cfLbl = frappe.utils.escape_html(cf.label || cf.fieldname);
                    const cfFt  = frappe.utils.escape_html(cf.fieldtype);
                    const isChk  = selectedSet === null || selectedSet.has(cf.fieldname);
                    const isMand = mandatorySet.has(cf.fieldname);
                    const searchKey = ((cf.label || "") + " " + (cf.fieldname || "")).toLowerCase();
                    html += `
                    <label class="cps-child-card"
                           data-search-key="${frappe.utils.escape_html(searchKey)}"
                           data-type="${cfFt}"
                           style="display:flex;align-items:center;gap:9px;
                                  padding:8px 11px;cursor:pointer;
                                  border:1px solid ${isMand ? '#dc3545' : (isChk ? '#a78bfa' : '#e3dcef')};
                                  border-left:${isMand ? '3px solid #dc3545' : (isChk ? '1px solid #a78bfa' : '1px solid #e3dcef')};
                                  border-radius:5px;
                                  background:${isChk ? '#f5edff' : '#fff'};
                                  transition:background 0.15s,border-color 0.15s,box-shadow 0.15s;
                                  user-select:none;"
                           onmouseenter="this.style.boxShadow='0 1px 4px rgba(102,16,242,0.15)'"
                           onmouseleave="this.style.boxShadow='none'">
                        <input type="checkbox" class="cps-child-field-chk"
                               value="${cfFn}" ${isChk ? 'checked' : ''}
                               style="cursor:pointer;width:15px;height:15px;flex-shrink:0;
                                      accent-color:#6610f2;" />
                        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;">
                            <div style="font-size:0.78rem;color:#1f1f1f;font-weight:500;
                                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                                 title="${cfLbl}">${cfLbl}</div>
                            <code style="font-size:0.66rem;color:#7a3a8a;
                                         overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                                  title="${cfFn}">${cfFn}</code>
                        </div>
                        <span class="badge"
                              style="font-size:0.6rem;background:#ede5f7;color:#5a2a8a;
                                     padding:2px 7px;border-radius:10px;flex-shrink:0;
                                     font-weight:600;">${cfFt}</span>
                        <button type="button" class="cps-child-mand-toggle"
                                data-fn-val="${cfFn}"
                                title="${isMand ? 'Click to unmark mandatory' : 'Mark as mandatory in portal'}"
                                style="flex-shrink:0;width:24px;height:24px;padding:0;
                                       border:1px solid ${isMand ? '#dc3545' : '#d4c5e8'};
                                       background:${isMand ? '#dc3545' : '#fff'};
                                       color:${isMand ? '#fff' : '#aaa'};
                                       border-radius:50%;cursor:pointer;font-size:0.78rem;
                                       line-height:1;font-weight:700;
                                       display:inline-flex;align-items:center;justify-content:center;">★</button>
                    </label>`;
                });

                html += `</div>
                <div class="cps-child-empty"
                     style="display:none;text-align:center;color:#888;font-size:0.84rem;
                            padding:28px;font-style:italic;
                            border:1px dashed #d4c5e8;border-radius:6px;
                            background:#fafafa;margin-top:6px;">
                    🔍 No child fields match your filters.
                </div>`;

                $panelContent.html(html);
                _updateChildSelCount($panelContent);

                const _isCardSel  = $card => $card.find(".cps-child-field-chk").prop("checked");
                const _isCardMand = $card => $card.find(".cps-child-mand-toggle").attr("data-mand") === "1";
                const _setCardMand = ($card, mand) => {
                    const $btn = $card.find(".cps-child-mand-toggle");
                    $btn.attr("data-mand", mand ? "1" : "0").css({
                        "background": mand ? "#dc3545" : "#fff",
                        "color": mand ? "#fff" : "#aaa",
                        "border-color": mand ? "#dc3545" : "#d4c5e8"
                    }).attr("title", mand ? "Click to unmark mandatory" : "Mark as mandatory in portal");
                    _restyleCard($card);
                };
                const _restyleCard = $card => {
                    const sel  = _isCardSel($card);
                    const mand = _isCardMand($card);
                    $card.css({
                        "background": sel ? "#f5edff" : "#fff",
                        "border-color": mand ? "#dc3545" : (sel ? "#a78bfa" : "#e3dcef"),
                        "border-left-width": mand ? "3px" : "1px",
                        "border-left-color": mand ? "#dc3545" : (sel ? "#a78bfa" : "#e3dcef")
                    });
                };

                $panelContent.find(".cps-child-card").each(function() {
                    const $card = $(this);
                    const fnVal = $card.find(".cps-child-mand-toggle").data("fn-val");
                    $card.find(".cps-child-mand-toggle")
                         .attr("data-mand", mandatorySet.has(fnVal) ? "1" : "0");
                });

                const initialSel  = {};
                const initialMand = {};
                $panelContent.find(".cps-child-card").each(function() {
                    const $card = $(this);
                    const fnVal = $card.find(".cps-child-mand-toggle").data("fn-val");
                    initialSel[fnVal]  = _isCardSel($card);
                    initialMand[fnVal] = _isCardMand($card);
                });
                const $saveBtn = $panelContent.find(".cps-child-save-btn");
                let isDirty = false;
                const _setDirty = (dirty) => {
                    if (dirty === isDirty) return;
                    isDirty = dirty;
                    $saveBtn.css({
                        "background": dirty ? "#dc3545" : "#6610f2",
                        "box-shadow": dirty
                            ? "0 1px 6px rgba(220,53,69,0.4)"
                            : "0 1px 3px rgba(102,16,242,0.25)"
                    }).html(dirty ? "💾 Save Changes •" : "💾 Save Selection");
                };
                const _checkDirty = () => {
                    let dirty = false;
                    $panelContent.find(".cps-child-card").each(function() {
                        const $card = $(this);
                        const fnVal = $card.find(".cps-child-mand-toggle").data("fn-val");
                        if (_isCardSel($card) !== initialSel[fnVal] ||
                            _isCardMand($card) !== initialMand[fnVal]) {
                            dirty = true; return false;
                        }
                    });
                    _setDirty(dirty);
                };

                const _applyFilters = () => {
                    const q = ($panelContent.find(".cps-child-search").val() || "").toLowerCase().trim();
                    const activeType = $panelContent.find(".cps-child-type-active").data("type") || "";
                    let visibleCount = 0;
                    $panelContent.find(".cps-child-card").each(function() {
                        const $card = $(this);
                        const matchSearch = !q || ($card.data("search-key") || "").includes(q);
                        const matchType = !activeType || $card.data("type") === activeType;
                        const show = matchSearch && matchType;
                        $card.toggle(show);
                        if (show) visibleCount++;
                    });
                    $panelContent.find(".cps-child-empty").toggle(visibleCount === 0);
                };

                $panelContent.find(".cps-child-sel-all").on("click", function() {
                    $panelContent.find(".cps-child-card:visible").each(function() {
                        const $card = $(this);
                        $card.find(".cps-child-field-chk").prop("checked", true);
                        _restyleCard($card);
                    });
                    _updateChildSelCount($panelContent);
                    _checkDirty();
                });

                $panelContent.find(".cps-child-sel-none").on("click", function() {
                    $panelContent.find(".cps-child-card:visible").each(function() {
                        const $card = $(this);
                        $card.find(".cps-child-field-chk").prop("checked", false);
                        _setCardMand($card, false);
                    });
                    _updateChildSelCount($panelContent);
                    _checkDirty();
                });

                $panelContent.find(".cps-child-mand-all").on("click", function() {
                    const $visibleSelected = $panelContent.find(".cps-child-card:visible").filter(function() {
                        return _isCardSel($(this));
                    });
                    if (!$visibleSelected.length) {
                        frappe.show_alert({
                            message: __("Select fields first, then mark them mandatory."),
                            indicator: "orange"
                        });
                        return;
                    }
                    const anyOff = $visibleSelected.toArray().some(c => !_isCardMand($(c)));
                    $visibleSelected.each(function() { _setCardMand($(this), anyOff); });
                    _updateChildSelCount($panelContent);
                    _checkDirty();
                });

                $panelContent.on("change", ".cps-child-field-chk", function() {
                    const $card = $(this).closest(".cps-child-card");
                    if (!$(this).prop("checked")) {
                        _setCardMand($card, false);
                    }
                    _restyleCard($card);
                    _updateChildSelCount($panelContent);
                    _checkDirty();
                });

                $panelContent.on("click", ".cps-child-mand-toggle", function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const $card = $(this).closest(".cps-child-card");
                    if (!_isCardSel($card)) {
                        $card.find(".cps-child-field-chk").prop("checked", true);
                    }
                    _setCardMand($card, !_isCardMand($card));
                    _updateChildSelCount($panelContent);
                    _checkDirty();
                });

                $panelContent.on("input", ".cps-child-search", _applyFilters);

                $panelContent.on("click", ".cps-child-type-chip", function() {
                    $panelContent.find(".cps-child-type-chip")
                        .removeClass("cps-child-type-active")
                        .css({
                            "background": "#fff",
                            "color": "#6610f2",
                            "border-color": "#c39bd3",
                            "font-weight": "400"
                        });
                    $(this).addClass("cps-child-type-active").css({
                        "background": "#6610f2",
                        "color": "#fff",
                        "border-color": "#6610f2",
                        "font-weight": "600"
                    });
                    _applyFilters();
                });

                $panelContent.find(".cps-child-save-btn").on("click", function() {
                    const parentFn = $(this).data("fn");
                    const selected = $panelContent.find(".cps-child-field-chk:checked")
                        .map(function() { return $(this).val(); }).get();
                    const mandatory = $panelContent.find(".cps-child-mand-toggle[data-mand='1']")
                        .map(function() { return $(this).data("fn-val"); }).get();
                    const allCount = childFields.length;
                    const selToSave = selected.length === allCount ? [] : selected;
                    _saveChildFieldSelection(parentFn, selToSave, mandatory);

                    $panelContent.find(".cps-child-card").each(function() {
                        const $card = $(this);
                        const fnVal = $card.find(".cps-child-mand-toggle").data("fn-val");
                        initialSel[fnVal]  = _isCardSel($card);
                        initialMand[fnVal] = _isCardMand($card);
                    });
                    _setDirty(false);
                });
            }
        });
    }

    function _updateChildSelCount($panelContent) {
        const total     = $panelContent.find(".cps-child-field-chk").length;
        const checked   = $panelContent.find(".cps-child-field-chk:checked").length;
        const mandatory = $panelContent.find(".cps-child-mand-toggle[data-mand='1']").length;
        const mandSuffix = mandatory > 0
            ? ` <span style="color:#c0392b;">• ★${mandatory}</span>`
            : "";
        $panelContent.find(".cps-child-sel-count").html(`${checked} / ${total}${mandSuffix}`);
        const pct = total ? (checked / total) * 100 : 0;
        $panelContent.find(".cps-child-progress-bar").css("width", `${pct}%`);
    }

    // ── Child Fields toggle button (event delegation) ─────────────────────
    $w.on("click.cps", ".cps-child-fields-btn", function (e) {
        e.stopPropagation();
        const fn = $(this).data("fn");
        const $panelRow     = $w.find(`.cps-child-panel-row[data-fn="${fn}"]`);
        const $panel        = $panelRow.find(`.cps-child-panel[data-fn="${fn}"]`);
        const $panelContent = $panelRow.find(`.cps-child-panel-content[data-fn="${fn}"]`);
        const childDt       = $panel.data("child-dt");

        if ($panelRow.is(":visible")) {
            $panelRow.slideUp(180);
            return;
        }
        if ($panelContent.text().includes("Loading")) {
            _renderChildPanel(fn, childDt, $panelContent);
        }
        $panelRow.slideDown(200);
    });

    // ── Close panel button inside child panel header ──────────────────────
    $w.on("click.cps", ".cps-child-close-btn", function (e) {
        e.stopPropagation();
        const fn = $(this).data("fn");
        $w.find(`.cps-child-panel-row[data-fn="${fn}"]`).slideUp(180);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Helper: sync the section-level mandatory checkbox state
    // ─────────────────────────────────────────────────────────────────────
    function _syncSecMandChk(secKey) {
        const $chk = $w.find(`.cps-sec-mand-chk[data-sec-key="${secKey}"]`);
        if (!$chk.length) return;
        const secFields = _secFieldsByKey(secKey);
        const state = _mandatoryState(secFields);
        if (state === 'all') {
            $chk.prop('checked', true).prop('indeterminate', false);
            $chk.closest('.cps-sec-mand-label').css('color', '#8e44ad').css('background', '#ede0f8');
        } else if (state === 'some') {
            $chk.prop('checked', false).prop('indeterminate', true);
            $chk.closest('.cps-sec-mand-label').css('color', '#8e44ad').css('background', '#f9f0ff');
        } else {
            $chk.prop('checked', false).prop('indeterminate', false);
            $chk.closest('.cps-sec-mand-label').css('color', '#8e44ad').css('background', '#f9f0ff');
        }
    }

    // Sync all section checkboxes on initial render
    tabOrder.forEach(tab => {
        Object.keys(tabs[tab]).forEach(sec => {
            _syncSecSelectChk(`${_k(tab)}__${_k(sec)}`);
            _syncSecMandChk(`${_k(tab)}__${_k(sec)}`);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    // Section-level: Mark ALL Mandatory toggle
    // ─────────────────────────────────────────────────────────────────────
    $w.on("change.cps", ".cps-sec-mand-chk", function (e) {
        if (!_isDraft()) {
            $(this).prop("checked", !$(this).prop("checked"));
            frappe.msgprint(__("Candidate portal fields can be edited only in Draft."));
            return;
        }
        e.stopPropagation();
        const secKey   = $(this).data("sec-key");
        const checked  = $(this).prop("checked");
        const secFlds  = _secFieldsByKey(secKey);
        const addedSet = _added();
        let updatedCount = 0;

        secFlds.forEach(f => {
            const fn = f.fieldname;

            // Update the individual row checkbox in DOM
            const $rowChk = $w.find(`.cps-field-row[data-fn="${fn}"] .cps-mandatory-chk`);
            $rowChk.prop('checked', checked);
            $rowChk.closest('.cps-mandatory-label').css('color', checked ? '#c0392b' : '#555');

            // Update child table row if field is already added
            const childRow = _getRow(fn);
            if (childRow && addedSet.has(fn)) {
                frappe.model.set_value(
                    childRow.doctype, childRow.name,
                    "is_mandatory", checked ? 1 : 0
                );
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            frm.refresh_field("custom_candidate_portal_fields");
        }

        // Update visual state of section checkbox itself
        $(this).prop('indeterminate', false);
        $(this).closest('.cps-sec-mand-label')
               .css('background', checked ? '#ede0f8' : '#f9f0ff');

        frappe.show_alert({
            message: checked
                ? __(`All fields in this section marked as Mandatory (${updatedCount} in child table updated)`)
                : __(`All fields in this section marked as Optional`),
            indicator: checked ? "red" : "blue"
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    // Section collapse / expand — click on header
    // ─────────────────────────────────────────────────────────────────────
    $w.on("click.cps", ".cps-sec-header", function (e) {
        // Ignore clicks on action buttons / mandatory label inside header
        if ($(e.target).closest(".cps-add-sec-btn, .cps-remove-sec-btn, .cps-sec-select-label, .cps-sec-select-chk, .cps-sec-mand-label, .cps-sec-mand-chk").length) return;

        const secKey = $(this).data("sec-key");
        const $body  = $w.find(`.cps-sec-body[data-sec-key="${secKey}"]`);
        const $arrow = $w.find(`.cps-sec-arrow[data-sec-key="${secKey}"]`);

        // Use actual DOM visibility — no stored flag needed
        const isOpen = $body.is(":visible");

        // Kill any running animation to prevent queue buildup
        $body.stop(true, true);

        if (isOpen) {
            $body.slideUp(200);
            $arrow.css("transform", "rotate(-90deg)");
        } else {
            $body.slideDown(200);
            $arrow.css("transform", "rotate(0deg)");
        }
    });

    // ─────────────────────────────────────────────────────────────────────
    // Live search
    // ─────────────────────────────────────────────────────────────────────
    $w.find(".cps-search").on("input", function () {
        const q = (this.value || "").toLowerCase().trim();

        $w.find(".cps-field-row").each(function () {
            const fn  = ($(this).data("fn")  || "").toLowerCase();
            const lbl = ($(this).data("lbl") || "").toLowerCase();
            $(this).toggle(!q || fn.includes(q) || lbl.includes(q));
        });

        // Auto-expand sections with matching rows
        if (q) {
            $w.find(".cps-sec-body").each(function () {
                const secKey = $(this).data("sec-key");
                if ($(this).find(".cps-field-row:visible").length) {
                    $(this).stop(true, true).show();
                    $w.find(`.cps-sec-arrow[data-sec-key="${secKey}"]`).css("transform", "rotate(0deg)");
                }
            });
        }
    });
}

// job_applicant_portal_settings.js
// Interactive Field Inspector — collapsible sections, Add Section, Remove, & Mandatory toggle

frappe.ui.form.on("Job Applicant Portal Settings", {

    refresh(frm) {
        frm.fields_dict["available_fields_html"].$wrapper.html("");
    },

    fetch_fields_btn(frm) {
        frappe.call({
            method: "recruitment.api.candidate_portal.get_available_job_applicant_fields",
            freeze: true,
            freeze_message: __("Reading Job Applicant fields…"),
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


// ─────────────────────────────────────────────────────────────────────────────
// Main Inspector Renderer
// ─────────────────────────────────────────────────────────────────────────────
function _render_field_inspector(frm, fields) {

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
    const $w = frm.fields_dict["available_fields_html"].$wrapper;
    $w.off(".cps");

    // ── Helpers ────────────────────────────────────────────────────────────
    const _k      = str => (str || "general").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const _added  = () => new Set((frm.doc.portal_fields || []).map(r => r.fieldname));
    const _getRow = fn  => (frm.doc.portal_fields || []).find(r => r.fieldname === fn);

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
            return `
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap;">
                    ${mandCheck}
                    <span class="badge badge-success cps-added-badge"
                          style="font-size:0.68rem;">✓ Added</span>
                    <button class="btn btn-xs cps-remove-btn"
                            data-fn="${fn}"
                            style="font-size:0.69rem;padding:2px 7px;
                                   background:#dc3545;color:#fff;border:none;border-radius:3px;">
                        ✕ Remove
                    </button>
                </div>`;
        }

        return `
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap;">
                ${mandCheck}
                <button class="btn btn-xs cps-add-btn"
                        data-fn="${fn}" data-lbl="${lbl}"
                        data-ft="${ft}" data-tab="${tab}" data-sec="${sec}"
                        style="font-size:0.69rem;padding:2px 8px;
                               background:#2e6cd1;color:#fff;border:none;border-radius:3px;">
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
            ...(frm.doc.portal_fields || []).map(r => (r.tab_label || "").trim()).filter(Boolean),
        ]));
        const secSuggestions = Array.from(new Set([
            ...tabOrder.flatMap(tab => Object.keys(tabs[tab] || {})),
            ...(frm.doc.portal_fields || []).map(r => (r.section_label || "").trim()).filter(Boolean),
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
        if ((frm.doc.portal_fields || []).some(r => r.fieldname === fn)) return false;

        const row = frappe.model.add_child(frm.doc, "Job Applicant Portal Field", "portal_fields");
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
        const idx = (frm.doc.portal_fields || []).findIndex(r => r.fieldname === fn);
        if (idx === -1) return;
        frappe.model.clear_doc("Job Applicant Portal Field", frm.doc.portal_fields[idx].name);
        frm.doc.portal_fields.splice(idx, 1);
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
            frm.refresh_field("portal_fields");
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
            frm.refresh_field("portal_fields");
            _refreshRowCell(fn, false);
            _refreshSecHeader(secKey);
            frappe.show_alert({ message: __(`Removed: ${fn}`), indicator: "orange" });
        });

        // MANDATORY checkbox — toggle live on already-added fields
        $scope.find(".cps-mandatory-chk").off("change").on("change", function () {
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
                frm.refresh_field("portal_fields");
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

        frm.refresh_field("portal_fields");
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

        frm.refresh_field("portal_fields");

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

        frm.refresh_field("portal_fields");

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
            frm.refresh_field("portal_fields");
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

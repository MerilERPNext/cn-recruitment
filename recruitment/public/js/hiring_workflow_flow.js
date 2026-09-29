/**
 * hiring_workflow_flow.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual hiring-workflow stepper for the Job Applicant form.
 *
 * Renders the ordered stages defined on the linked Job Opening
 * (`custom_hiring_stages`) as a horizontal flow with arrows, highlighting where
 * the candidate currently is. Each stage exposes inline actions by type:
 *   - Interview → "+ Schedule Interview" (creates a built-in Interview)
 *   - Offer     → "Send Pre Offer Form" / "Create Job Offer"
 *   - any stage → HR can Complete the current stage or jump to any stage
 *
 * All data comes from `recruitment.api.hiring_stage.get_workflow_view`; every
 * action re-uses an existing whitelisted endpoint. Host: HTML field
 * `custom_hiring_workflow_html`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
    const API = "recruitment.api.hiring_stage";
    const HOST = "custom_hiring_workflow_html";
    const TAB = "custom_hiring_workflow_tab";
    const esc = frappe.utils.escape_html;

    // Frappe hides "empty" tabs during the initial refresh (a timing race: the
    // tab is evaluated before this HTML field's content lands). Once we've
    // rendered content, force the tab visible and re-run section visibility so
    // it doesn't flash-and-hide.
    function keepTabVisible(frm) {
        try {
            (frm.layout && frm.layout.tabs || []).forEach((t) => {
                if (t.df && t.df.fieldname === TAB) { t.df.hidden = 0; t.toggle(true); }
            });
            // Frappe marks our HTML field's section `empty-section` (CSS-collapses
            // it to 0 height) during the initial refresh, before our content lands
            // and never re-checks. Un-collapse it so the rendered flow is visible.
            const field = frm.fields_dict[HOST];
            if (field && field.$wrapper) {
                // The HTML control keeps `hide-control` (display:none) because its
                // refresh() never ran for this inactive tab; un-hide it, and its
                // section, so the rendered flow is actually visible.
                field.df.hidden = 0;
                field.$wrapper.removeClass("hide-control").show();
                field.$wrapper.closest(".form-section")
                    .removeClass("empty-section").addClass("visible-section");
            }
        } catch (e) { /* non-fatal */ }
    }

    // Hiring Workflow is the FIRST tab, so it is what the form opens on. A brand
    // new applicant has no workflow yet — hide the tab while unsaved so Frappe
    // falls through to Application Details instead of opening an empty stepper.
    function hideTab(frm) {
        try {
            const tabs = (frm.layout && frm.layout.tabs) || [];
            let hidden_tab = null;
            tabs.forEach((t) => {
                if (t.df && t.df.fieldname === TAB) {
                    t.df.hidden = 1;
                    t.toggle(false);
                    hidden_tab = t;
                }
            });

            // `Tab.toggle(false)` only adds the `hide` class to the link and the
            // wrapper -- it does NOT hand the active state to another tab. Frappe
            // has already opened this one (it is the first tab), so hiding it here
            // left the form with an active-but-hidden pane and no visible content:
            // a brand new applicant opened on a blank page.
            //
            // Pass the active state to the first tab still visible, the way
            // Frappe's own Layout.set_tab_as_active() does. Only when the tab we
            // just hid was the active one, so a user who has already clicked
            // another tab is not yanked back on the next refresh.
            if (hidden_tab && hidden_tab.is_active()) {
                const first_visible_tab = tabs.find((t) => !t.is_hidden());
                first_visible_tab && first_visible_tab.set_active();
            }
        } catch (e) { /* non-fatal */ }
    }

    // Frappe hoists any custom field with a blank `insert_after` to position 0 of
    // the doctype (Meta.sort_fields), which lands it in front of our Tab Break and
    // makes Frappe synthesise an auto "Details" tab ahead of the workflow. Move our
    // tab link back to the front so the workflow is always the first thing on the
    // form, whatever stray fields a site has.
    function ensureTabFirst(frm) {
        try {
            const tab = (frm.layout && frm.layout.tabs || []).find(
                (t) => t.df && t.df.fieldname === TAB
            );
            if (!tab || !tab.tab_link || !tab.tab_link.length) return;
            const $list = tab.tab_link.parent();
            if (!$list.children().first().is(tab.tab_link)) tab.tab_link.prependTo($list);

            // Land on the workflow when a candidate is opened. Frappe picks the
            // default tab from `layout.tabs` order (meta order, not the DOM order
            // we just fixed), so it lands on the synthesised "Details" tab — and by
            // the time this runs it has already recorded that as the active tab,
            // so `frm.get_active_tab()` can't tell us whether the USER chose it.
            // Track the landing ourselves: force it once per applicant, then leave
            // the user's tab alone for the rest of the visit (form reloads after a
            // stage action must not yank them back here).
            if (frm._hwf_landed_on !== frm.doc.name) {
                frm._hwf_landed_on = frm.doc.name;
                tab.set_active();
            }
        } catch (e) { /* non-fatal */ }
    }

    const STATE = {
        done:     { icon: "✓", cls: "hwf-done" },
        current:  { icon: "●", cls: "hwf-current" },
        upcoming: { icon: "○", cls: "hwf-upcoming" },
        rejected: { icon: "✕", cls: "hwf-rejected" },
    };

    function injectStyles() {
        if (document.getElementById("hwf-styles")) return;
        const css = `
        .hwf-wrap{padding:6px 2px 2px;}

        /* Vertical stepper: a rail of badges joined by a connector line, with one
           full-width expandable card per stage. */
        .hwf-flow{display:flex;flex-direction:column;}
        .hwf-row{display:grid;grid-template-columns:26px 1fr;gap:14px;padding-bottom:10px;}
        .hwf-row:last-child{padding-bottom:0;}
        .hwf-rail{position:relative;display:flex;justify-content:center;padding-top:11px;}
        .hwf-row:not(:last-child) .hwf-rail::after{content:"";position:absolute;
            top:37px;bottom:-10px;left:50%;transform:translateX(-50%);
            width:2px;background:var(--border-color,#e2e6e9);}
        .hwf-row.hwf-done .hwf-rail::after{background:var(--green-300,#9ad5a8);}
        .hwf-badge{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;
            justify-content:center;font-size:12px;font-weight:700;color:#fff;flex:0 0 auto;z-index:1;}
        .hwf-name{font-weight:600;font-size:.88rem;line-height:1.2;color:var(--text-color);}
        .hwf-type{font-size:.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em;}

        /* No overflow:hidden — the "⋮" dropdown inside a card body would be clipped. */
        .hwf-card{border:1px solid var(--border-color);border-radius:8px;
            background:var(--fg-color,var(--card-bg));}
        .hwf-card-head{display:flex;align-items:center;gap:10px;padding:11px 14px;
            cursor:pointer;border-radius:7px;}
        .hwf-row.is-open .hwf-card-head{border-radius:7px 7px 0 0;}
        .hwf-card-head:hover{background:var(--control-bg-on-gray,var(--bg-color));}
        .hwf-chevron{margin-left:auto;color:var(--text-muted);font-size:.9rem;
            transition:transform .15s;flex:0 0 auto;}
        .hwf-row.is-open .hwf-chevron{transform:rotate(180deg);}
        .hwf-card-body{padding:12px 14px 13px;border-top:1px solid var(--border-color);}
        .hwf-row:not(.is-open) .hwf-card-body{display:none;}

        .hwf-sbadge{padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;}
        .hwf-sb-done{background:var(--green-100,#d3efd9);color:var(--green-700,#1e7a34);}
        .hwf-sb-current{background:var(--blue-100,#cfe6fb);color:var(--blue-600,#1479d6);}
        .hwf-sb-upcoming,.hwf-sb-muted{background:var(--gray-200,#e6e9ec);color:var(--gray-700,#4a5157);}
        .hwf-sb-rejected{background:var(--red-100,#fbd8d8);color:var(--red-700,#b02a2a);}

        .hwf-done  .hwf-badge{background:var(--green-500,#28a745);}
        .hwf-done  .hwf-card{border-color:var(--green-300,#9ad5a8);}
        .hwf-current .hwf-badge{background:var(--blue-500,#2490ef);animation:hwf-pulse 1.6s infinite;}
        .hwf-current .hwf-card{border-color:var(--blue-500,#2490ef);
            box-shadow:0 0 0 3px var(--blue-100,rgba(36,144,239,.18));}
        .hwf-upcoming .hwf-badge{background:var(--gray-400,#b9c0c9);}
        .hwf-upcoming .hwf-card{opacity:.8;}
        .hwf-rejected .hwf-badge{background:var(--red-500,#e24c4c);}
        .hwf-rejected .hwf-card{border-color:var(--red-500,#e24c4c);}
        @keyframes hwf-pulse{0%{box-shadow:0 0 0 0 rgba(36,144,239,.45);}70%{box-shadow:0 0 0 6px rgba(36,144,239,0);}100%{box-shadow:0 0 0 0 rgba(36,144,239,0);}}

        /* The action panel is embedded in the current stage's card, so it drops its
           own frame — the card already provides one. */
        .hwf-panel{margin-top:4px;border:1px solid var(--border-color);border-radius:8px;
            padding:12px 14px;background:var(--subtle-fg,var(--control-bg));}
        .hwf-card-body .hwf-panel{margin:0;border:0;padding:0;background:transparent;}
        .hwf-panel-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .hwf-panel-title{font-weight:600;font-size:.92rem;color:var(--text-color);}
        .hwf-actions{display:flex;flex-wrap:wrap;gap:8px;}
        .hwf-btn{border:1px solid var(--border-color);background:var(--fg-color,#fff);color:var(--text-color);
            padding:5px 12px;border-radius:6px;font-size:.82rem;cursor:pointer;transition:background .12s;}
        .hwf-btn:hover{background:var(--control-bg-on-gray,var(--bg-color));}
        .hwf-btn.primary{background:var(--blue-500,#2490ef);border-color:var(--blue-500,#2490ef);color:#fff;}
        .hwf-btn.primary:hover{background:var(--blue-600,#1479d6);}
        .hwf-btn[disabled]{opacity:.5;cursor:not-allowed;}
        .hwf-req{font-size:.66rem;font-weight:600;letter-spacing:.03em;text-transform:uppercase;
            padding:1px 6px;border-radius:9px;background:var(--orange-100,#fdebd0);color:var(--orange-700,#9c5700);}
        .hwf-req.hwf-extra{background:var(--purple-100,#ece4fb);color:var(--purple-700,#5b3aa8);}
        .hwf-btn.danger{color:var(--red-600,#c0392b);border-color:var(--red-200,#f0b4b4);}
        .hwf-btn.danger:hover{background:var(--red-50,#fdeaea);}
        .hwf-more-wrap{position:relative;display:inline-block;}
        .hwf-menu{position:absolute;top:calc(100% + 4px);right:0;z-index:50;min-width:190px;
            background:var(--fg-color,#fff);border:1px solid var(--border-color);border-radius:8px;
            box-shadow:0 4px 16px rgba(0,0,0,.14);padding:4px;}
        .hwf-menu a{display:block;padding:7px 12px;border-radius:6px;font-size:.83rem;color:var(--text-color);
            cursor:pointer;text-decoration:none;white-space:nowrap;}
        .hwf-menu a:hover{background:var(--control-bg-on-gray,var(--bg-color));}
        .hwf-menu a.danger{color:var(--red-600,#c0392b);}
        .hwf-menu a.disabled{opacity:.5;cursor:not-allowed;}
        .hwf-menu a.disabled:hover{background:none;}
        .hwf-banner{padding:9px 12px;border-radius:6px;font-size:.85rem;font-weight:500;}
        .hwf-banner.ok{background:var(--green-50,#eaf7ee);color:var(--green-700,#1e7a34);}
        .hwf-banner.bad{background:var(--red-50,#fdeaea);color:var(--red-700,#b02a2a);}
        .hwf-sub{margin-top:10px;font-size:.8rem;color:var(--text-muted);}
        .hwf-ivlist{margin-top:8px;border-top:1px dashed var(--border-color);padding-top:8px;}
        .hwf-ivrow{display:flex;align-items:center;gap:8px;font-size:.8rem;padding:3px 0;flex-wrap:wrap;}
        .hwf-ivitem{padding:1px 0;}
        .hwf-ivitem + .hwf-ivitem{margin-top:4px;}
        /* People line sits under its interview row, indented to the row's text and
           free to wrap — a five-person panel must not stretch the card. */
        .hwf-ivpeople{font-size:.76rem;color:var(--text-muted);padding:0 0 2px 2px;line-height:1.5;}
        .hwf-owner-label{font-weight:600;color:var(--text-color,#36414c);}
        .hwf-pill{font-size:.68rem;padding:1px 7px;border-radius:10px;font-weight:600;}
        .hwf-pill.Cleared,.hwf-pill.Approved{background:var(--green-100,#d3efd9);color:var(--green-700,#1e7a34);}
        .hwf-pill.Rejected{background:var(--red-100,#fbd8d8);color:var(--red-700,#b02a2a);}
        .hwf-pill.Pending,.hwf-pill.Sent,.hwf-pill.Filled,.hwf-pill.Reviewed,.hwf-pill.default{background:var(--gray-200,#e6e9ec);color:var(--gray-700,#4a5157);}
        .hwf-pill.Awaiting{background:var(--orange-100,#fde8d0);color:var(--orange-700,#a4561a);}
        .hwf-offer-versions{margin-top:6px;font-size:.78rem;color:var(--text-muted,#6c7680);}
        .hwf-offer-versions a{margin-right:4px;}
        .hwf-empty{padding:18px;text-align:center;color:var(--text-muted);font-size:.85rem;}
        .hwf-link{color:var(--blue-500,#2490ef);cursor:pointer;text-decoration:none;}
        .hwf-link:hover{text-decoration:underline;}
        /* Pre-offer form preview — lives inside its own dialog, so nothing here
           can reach the stage cards. */
        .hwf-pv-head{font-size:.82rem;color:var(--text-muted);margin-bottom:12px;}
        .hwf-pv-sec{margin-bottom:14px;}
        .hwf-pv-sec-title{font-size:.72rem;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border-color);padding-bottom:4px;margin-bottom:6px;}
        .hwf-pv-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:4px 0;border-bottom:1px solid var(--border-color,#ebeef0);}
        .hwf-pv-row:last-child{border-bottom:none;}
        .hwf-pv-label{font-size:.85rem;font-weight:500;color:var(--text-color,#36414c);}
        .hwf-pv-req{font-size:.66rem;font-weight:700;padding:1px 7px;border-radius:10px;background:var(--red-100,#fbd8d8);color:var(--red-700,#b02a2a);}
        .hwf-fb-head{text-transform:none;letter-spacing:0;font-size:.85rem;color:var(--text-color,#36414c);}
        .hwf-fb-form{margin:6px 0 8px;}
        .hwf-pv-row .hwf-pv-label{min-width:180px;}
        .hwf-pv-type{margin-left:auto;font-size:.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;}
        `;
        const el = document.createElement("style");
        el.id = "hwf-styles";
        el.textContent = css;
        document.head.appendChild(el);
    }

    // ── mutating action helpers ────────────────────────────────────────────
    function call(frm, method, args, reload) {
        frappe.call({
            method: API + "." + method,
            args: Object.assign({ job_applicant: frm.doc.name }, args || {}),
            freeze: true,
            callback: (r) => {
                if (reload) frm.reload_doc();
            },
        });
    }

    function completeStage(frm) {
        call(frm, "move_to_next_stage", {}, true);
    }

    function markNotRequired(frm, stageName) {
        const d = new frappe.ui.Dialog({
            title: __("Mark as Not Required"),
            fields: [{ fieldtype: "Small Text", fieldname: "comment", label: __("Comments"), reqd: 1 }],
            primary_action_label: __("Submit"),
            primary_action(values) {
                frappe.call({
                    method: API + ".mark_stage_not_required",
                    args: { job_applicant: frm.doc.name, stage_name: stageName, comment: values.comment },
                    freeze: true,
                    callback: () => {
                        d.hide();
                        frappe.show_alert({ message: __("Stage marked Not Required."), indicator: "blue" });
                        frm.reload_doc();
                    },
                });
            },
        });
        d.show();
    }

    // The Pre Offer Approval tab is hidden until the pre-offer is actually in
    // play. This is one of the two things that puts it in play (the other is the
    // pre-offer being sent) — pre_offer_field_approval.js owns that gate.
    function gotoPreOfferApprovalTab(frm) {
        if (typeof window.poa_reveal_pre_offer_tab === "function") {
            window.poa_reveal_pre_offer_tab(frm);
            return;
        }
        const tabs = (frm.layout && frm.layout.tabs) || [];
        const tab = tabs.find((t) => t.df && t.df.fieldname === "custom_pre_offer_approval_tab");
        if (tab && tab.tab_link) tab.tab_link.find("a, button").first().trigger("click");
        else if (frm.scroll_to_field) frm.scroll_to_field("custom_pre_offer_approval_html");
    }

    // The pre-offer form as the candidate will receive it — the fields the linked
    // Job Opening marks "Pre-offer: View", with the mandatory ones tagged. Read
    // only; it neither sends nor changes anything.
    function previewPreOfferForm(frm) {
        frappe.call({
            method: API + ".get_pre_offer_form_preview",
            args: { job_applicant: frm.doc.name },
            freeze: true,
            freeze_message: __("Loading form…"),
            callback: (r) => {
                const res = (r && r.message) || {};
                const fields = res.fields || [];
                const d = new frappe.ui.Dialog({
                    title: __("Pre Offer Form Preview"),
                    size: "large",
                    fields: [{ fieldtype: "HTML", fieldname: "body" }],
                    primary_action_label: __("Close"),
                    primary_action: () => d.hide(),
                });

                let html;
                if (!fields.length) {
                    html = `<div class="hwf-empty">${res.job_opening
                        ? __("No pre-offer fields are configured on {0}.", [esc(res.job_opening)])
                        : __("This candidate has no linked Job Opening.")}</div>`;
                } else {
                    // Group by the section the opening's config puts each field in,
                    // keeping the configured order within each group.
                    const groups = [];
                    const byName = {};
                    fields.forEach((f) => {
                        const key = f.section || __("General");
                        if (!byName[key]) { byName[key] = []; groups.push(key); }
                        byName[key].push(f);
                    });
                    const required = fields.filter((f) => f.reqd).length;
                    html = `<div class="hwf-pv">
                        <div class="hwf-pv-head">${__("The candidate will be asked for these fields")}${res.job_opening
                            ? ` — <a href="/app/job-opening/${encodeURIComponent(res.job_opening)}" target="_blank">${esc(res.job_opening)}</a>` : ""}
                            <span class="text-muted"> · ${__("{0} field(s), {1} mandatory", [fields.length, required])}</span>
                        </div>` +
                        groups.map((g) => `<div class="hwf-pv-sec">
                            <div class="hwf-pv-sec-title">${esc(g)}</div>
                            ${byName[g].map((f) => `<div class="hwf-pv-row">
                                <span class="hwf-pv-label">${esc(f.display_name || f.reference_name || "")}</span>
                                ${f.reqd ? `<span class="hwf-pv-req">${__("Mandatory")}</span>` : ""}
                                <span class="hwf-pv-type">${esc(f.fieldtype || "")}</span>
                            </div>`).join("")}
                        </div>`).join("") + `</div>`;
                }
                d.fields_dict.body.$wrapper.html(html);
                d.show();
            },
        });
    }

    // Pick each interviewer's evaluation form, then send it to everyone still
    // owing feedback: a task in their Tasks list plus an email. Interviewers may get
    // different forms; the stage clears only when every one of them is positive.
    // The server locks an interviewer's form once THEY have started feedback.
    const FORM_QUERY = () => ({ filters: { doc_type: ["in", ["Interview Feedback", "Interview"]], is_archived: 0 } });

    function sendFeedbackForm(frm, stage) {
        const iv = (stage.interviews || [])[0] || {};
        const done = new Set(iv.submitted_by || []);
        // Still owing feedback: pending_with while the interview is open, else the
        // panel minus whoever has submitted.
        const owing = (iv.pending_with && iv.pending_with.length ? iv.pending_with : (iv.interviewers || []))
            .filter((p) => !done.has(p.user));
        const fallback = iv.custom_evaluation_form || stage.evaluation_form || "";
        const panelForms = iv.panel_forms || {};
        // Someone who has started a draft is locked to the form they are on. Show
        // them exactly that, so the default send doesn't ask to change it (the
        // server would refuse the whole send with "Form Locked").
        const started = new Set(iv.started_by || []);
        const formFor = (user) => started.has(user)
            ? (panelForms[user] || iv.custom_evaluation_form || "")
            : (panelForms[user] || fallback);
        const d = new frappe.ui.Dialog({
            title: __("Send Feedback Form"),
            size: "large",
            fields: [
                {
                    fieldtype: "Link", fieldname: "apply_all", label: __("Same form for everyone"),
                    options: "Microapp Form Widget", get_query: FORM_QUERY,
                    description: __("Optional: picks this form on every row below."),
                    change() {
                        const v = d.get_value("apply_all");
                        if (!v) return;
                        (d.fields_dict.forms.df.data || []).forEach((row) => { row.form = v; });
                        d.fields_dict.forms.grid.refresh();
                    },
                },
                {
                    fieldtype: "Table", fieldname: "forms", label: __("Form per interviewer"),
                    cannot_add_rows: true, cannot_delete_rows: true, in_place_edit: true,
                    data: owing.map((p) => ({
                        user: p.user,
                        interviewer: p.full_name || p.user,
                        form: formFor(p.user),
                    })),
                    fields: [
                        { fieldtype: "Data", fieldname: "user", hidden: 1 },
                        { fieldtype: "Data", fieldname: "interviewer", label: __("Interviewer"),
                          in_list_view: 1, read_only: 1, columns: 4 },
                        { fieldtype: "Link", fieldname: "form", label: __("Feedback Form"),
                          options: "Microapp Form Widget", in_list_view: 1, columns: 6,
                          get_query: FORM_QUERY },
                    ],
                },
                {
                    fieldtype: "HTML", fieldname: "hint",
                    options: `<div class="hwf-sub">${owing.length
                        ? __("Each interviewer gets a task for their own form. An empty form means the standard skill assessment. The candidate moves on only when every interviewer's feedback is positive.")
                        : __("Every interviewer has already submitted feedback.")}</div>`,
                },
            ],
            primary_action_label: __("Send to Interviewers"),
            primary_action() {
                const forms = {};
                (d.fields_dict.forms.df.data || []).forEach((row) => {
                    if (row.user) forms[row.user] = row.form || "";
                });
                frappe.call({
                    method: API + ".send_interview_feedback_form",
                    args: {
                        job_applicant: frm.doc.name,
                        stage_name: stage.stage_name,
                        interviewer_forms: JSON.stringify(forms),
                    },
                    freeze: true,
                    freeze_message: __("Sending feedback request…"),
                    callback: (r) => {
                        const m = r && r.message;
                        if (!m) return;
                        d.hide();
                        const to = (m.sent_to || []).join(", ");
                        frappe.show_alert({
                            message: __("Feedback form assigned to {0}", [to || __("interviewers")]),
                            indicator: "green",
                        });
                        frm.reload_doc();
                    },
                });
            },
        });
        d.show();
    }

    function cancelInterview(frm, iv) {
        frappe.prompt(
            [{
                fieldname: "reason", label: __("Reason"), fieldtype: "Small Text", reqd: 1,
                description: __("The interview is kept on record as Cancelled, the panel is notified, and the stage can be scheduled again."),
            }],
            (v) => {
                frappe.call({
                    method: "recruitment.api.stage_interview.cancel_interview",
                    args: { job_applicant: frm.doc.name, interview: iv.name, reason: v.reason },
                    freeze: true,
                    freeze_message: __("Cancelling interview…"),
                    callback: (r) => {
                        if (!r || !r.message) return;
                        frappe.show_alert({ message: __("Interview {0} cancelled.", [esc(iv.name)]), indicator: "orange" });
                        frm.reload_doc();
                    },
                });
            },
            __("Cancel Interview {0}", [iv.name]),
            __("Cancel Interview")
        );
    }

    function rescheduleInterview(frm, iv) {
        const current = (iv.interviewers || []).map((p) => p.user);
        const d = new frappe.ui.Dialog({
            title: __("Reschedule Interview {0}", [iv.name]),
            fields: [
                { fieldtype: "Date", fieldname: "scheduled_on", label: __("Date"), reqd: 1,
                  default: iv.scheduled_on },
                { fieldtype: "Column Break" },
                { fieldtype: "Time", fieldname: "from_time", label: __("From Time"), reqd: 1,
                  default: iv.from_time },
                { fieldtype: "Column Break" },
                { fieldtype: "Time", fieldname: "to_time", label: __("To Time"), reqd: 1,
                  default: iv.to_time },
                { fieldtype: "Section Break" },
                {
                    fieldtype: "MultiSelectPills", fieldname: "interviewers", label: __("Interviewers"), reqd: 1,
                    default: current,
                    description: __("Remove someone to take them off the panel; add a replacement to hand the interview over."),
                    get_data: (txt) => frappe.db.get_link_options("User", txt, { enabled: 1, user_type: "System User" }),
                },
                { fieldtype: "Small Text", fieldname: "reason", label: __("Reason") },
            ],
            primary_action_label: __("Reschedule"),
            primary_action(values) {
                frappe.call({
                    method: "recruitment.api.stage_interview.reschedule_interview",
                    args: {
                        job_applicant: frm.doc.name,
                        interview: iv.name,
                        scheduled_on: values.scheduled_on,
                        from_time: values.from_time,
                        to_time: values.to_time,
                        interviewers: JSON.stringify(values.interviewers || []),
                        reason: values.reason || "",
                    },
                    freeze: true,
                    freeze_message: __("Rescheduling…"),
                    callback: (r) => {
                        if (!r || !r.message) return;
                        d.hide();
                        frappe.show_alert({ message: __("Interview rescheduled and the panel notified."), indicator: "green" });
                        frm.reload_doc();
                    },
                });
            },
        });
        d.show();
    }

    // An Interview stage for THIS candidate only. It can follow their current
    // stage or any later one, but never the offer stages, which always close the
    // flow — the server enforces the same.
    const OFFER_TYPES = ["Pre Offer", "Offer", "Done"];

    function addInterviewStage(frm, view) {
        const stages = view.stages || [];
        const anchors = stages
            .slice(Math.max(view.current_stage_index, 0))
            .filter((s) => !OFFER_TYPES.includes(s.stage_type || ""))
            .map((s) => s.stage_name);
        if (!anchors.length) {
            frappe.msgprint(__("The candidate is already at the offer stages; no interview stage can be added."));
            return;
        }
        const d = new frappe.ui.Dialog({
            title: __("Add Interview Stage"),
            fields: [
                { fieldtype: "Data", fieldname: "stage_name", label: __("Stage Name"), reqd: 1,
                  description: __("For example: Technical Round 2, Managerial Round.") },
                { fieldtype: "Select", fieldname: "after_stage", label: __("Add After"), reqd: 1,
                  options: anchors, default: view.current_stage || anchors[0] },
                { fieldtype: "Link", fieldname: "evaluation_form", label: __("Feedback Form"),
                  options: "Microapp Form Widget", get_query: FORM_QUERY,
                  description: __("Default form for this stage's interview. Can be changed per interviewer later.") },
                { fieldtype: "Check", fieldname: "is_mandatory", label: __("Mandatory (can't be skipped)") },
                { fieldtype: "HTML", fieldname: "hint",
                  options: `<div class="hwf-sub">${__("Only this candidate's flow changes. Other candidates on the opening are not affected.")}</div>` },
            ],
            primary_action_label: __("Add Stage"),
            primary_action(values) {
                frappe.call({
                    method: "recruitment.api.stage_interview.add_interview_stage",
                    args: {
                        job_applicant: frm.doc.name,
                        stage_name: values.stage_name,
                        after_stage: values.after_stage,
                        evaluation_form: values.evaluation_form || null,
                        is_mandatory: values.is_mandatory ? 1 : 0,
                    },
                    freeze: true,
                    callback: (r) => {
                        if (!r || !r.message) return;
                        d.hide();
                        frappe.show_alert({ message: __("Stage {0} added.", [esc(r.message.stage_name)]), indicator: "green" });
                        frm.reload_doc();
                    },
                });
            },
        });
        d.show();
    }

    function removeInterviewStage(frm, stageName) {
        frappe.confirm(__("Remove the stage <b>{0}</b> from this candidate's flow?", [esc(stageName)]), () => {
            frappe.call({
                method: "recruitment.api.stage_interview.remove_interview_stage",
                args: { job_applicant: frm.doc.name, stage_name: stageName },
                freeze: true,
                callback: (r) => {
                    if (!r || !r.message) return;
                    frappe.show_alert({ message: __("Stage removed."), indicator: "orange" });
                    frm.reload_doc();
                },
            });
        });
    }

    function jumpTo(frm, stageName) {
        frappe.confirm(
            __("Set the current stage to <b>{0}</b>? This is logged in the stage history.", [esc(stageName)]),
            () => {
                frappe.call({
                    method: API + ".set_stage",
                    args: { job_applicant: frm.doc.name, stage_name: stageName },
                    freeze: true,
                    callback: () => frm.reload_doc(),
                });
            }
        );
    }

    function scheduleInterview(frm, stageName) {
        frappe.call({
            method: API + ".prepare_interview",
            args: { job_applicant: frm.doc.name, stage_name: stageName || null },
            freeze: true,
            callback: (r) => {
                const m = r && r.message;
                if (!m) return;
                frappe.model.with_doctype("Interview", () => {
                    const d = frappe.model.get_new_doc("Interview");
                    // Link triggers on open would let HRMS's interview_round
                    // handler clear job_applicant and replace the panel.
                    d.__run_link_triggers = false;
                    // interview.js locks candidate + round on this form: the
                    // interview belongs to this applicant's stage, and HRMS's
                    // round handler would otherwise clear the candidate.
                    d.__from_hiring_workflow = 1;
                    d.job_applicant = m.job_applicant;
                    // Show the name straight away, not the id until a lookup lands.
                    if (m.applicant_title) frappe.utils.add_link_title("Job Applicant", m.job_applicant, m.applicant_title);
                    // v15 links the round through `interview_round`, v16 through
                    // `interview_type`; the server says which this site has.
                    d[m.interview_round_field || "interview_round"] = m.interview_round;
                    if (m.designation) d.designation = m.designation;
                    if (m.job_opening) d.job_opening = m.job_opening;
                    if (m.evaluation_form) d.custom_evaluation_form = m.evaluation_form;
                    Object.entries(m.fetched || {}).forEach(([field, value]) => {
                        if (value != null && frappe.meta.has_field("Interview", field)) d[field] = value;
                    });
                    // The stage's configured panel. Plain assignment, not
                    // frm.set_value: HRMS's own `interview_round` handler CLEARS
                    // interview_details and refills it from the round, so these
                    // rows only survive because nothing triggers that handler
                    // here. A recruiter who re-picks the round on the form is
                    // choosing HRMS's list, and that is the right outcome.
                    (m.interviewers || []).forEach((interviewer) => {
                        frappe.model.add_child(d, "Interview Detail", "interview_details").interviewer = interviewer;
                    });
                    frappe.set_route("Form", "Interview", d.name);
                });
            },
        });
    }

    // Render a Form.io schema read-only into `el`, optionally filled with `data`.
    // Buttons are dropped: nothing here can be submitted.
    function renderFormio(el, schema, data) {
        if (!window.Formio) {
            $(el).html(`<div class="hwf-empty">${__("The form viewer is not available.")}</div>`);
            return;
        }
        const clean = {
            ...schema,
            components: (schema.components || []).filter((c) => !(c && c.type === "button")),
        };
        window.Formio.createForm(el, clean, { readOnly: true }).then((form) => {
            if (data) form.submission = { data };
        }).catch((e) => {
            console.error("Feedback form render failed", e);
            $(el).html(`<div class="hwf-empty">${__("This form could not be displayed.")}</div>`);
        });
    }

    function infoDialog(title) {
        const d = new frappe.ui.Dialog({
            title,
            size: "large",
            fields: [{ fieldtype: "HTML", fieldname: "body" }],
            primary_action_label: __("Close"),
            primary_action: () => d.hide(),
        });
        d.show();
        return { d, $body: d.fields_dict.body.$wrapper };
    }

    // Read-only view of the stage's feedback form(s), as interviewers get them —
    // the stage's form and any the interview or a panel member was given.
    function previewFeedbackForm(stageName, frm) {
        frappe.call({
            method: "recruitment.api.interview_feedback_approval.get_stage_feedback_form_preview",
            args: { job_applicant: frm.doc.name, stage_name: stageName },
            freeze: true,
            freeze_message: __("Loading form…"),
            callback: (r) => {
                const forms = ((r && r.message) || {}).forms || [];
                const title = __("Feedback Form Preview") + (forms.length === 1 ? ` — ${esc(forms[0].label)}` : "");
                const { $body } = infoDialog(title);
                if (!forms.length) {
                    $body.html(`<div class="hwf-empty">${__("No feedback form is set on this stage.")}</div>`);
                    return;
                }
                $body.empty();
                forms.forEach((f) => {
                    const who = (f.interviewers || []).length
                        ? `<span class="text-muted"> · ${__("for")} ${esc(f.interviewers.join(", "))}</span>` : "";
                    const $sec = $(`<div class="hwf-pv-sec"><div class="hwf-pv-sec-title">${esc(f.label)}${who}</div><div></div></div>`)
                        .appendTo($body);
                    const el = $sec.children().last()[0];
                    if (!f.schema) $(el).html(`<div class="hwf-empty">${__("The form {0} could not be read.", [esc(f.widget)])}</div>`);
                    else renderFormio(el, f.schema);
                });
            },
        });
    }

    // Every submitted feedback on the stage, each interviewer's form filled in as
    // they sent it. A feedback filed on the standard grid shows its skill ratings.
    function viewSubmittedFeedback(stageName, frm) {
        frappe.call({
            method: "recruitment.api.interview_feedback_approval.get_stage_submitted_feedback",
            args: { job_applicant: frm.doc.name, stage_name: stageName },
            freeze: true,
            freeze_message: __("Loading feedback…"),
            callback: (r) => {
                const list = ((r && r.message) || {}).feedback || [];
                const { $body } = infoDialog(__("Submitted Feedback") + ` — ${esc(stageName)}`);
                if (!list.length) {
                    $body.html(`<div class="hwf-empty">${__("No feedback has been submitted for this stage yet.")}</div>`);
                    return;
                }
                $body.empty();
                list.forEach((fb) => {
                    const head = `<div class="hwf-pv-sec-title hwf-fb-head">
                        ${esc(fb.interviewer)} &nbsp;${pill(fb.result || "Pending")}
                        <span>${ratingStars(fb.average_rating)}</span>
                        <span class="text-muted"> · ${fb.submitted_on ? esc(frappe.datetime.str_to_user(fb.submitted_on)) : ""}
                            · <a href="/app/interview-feedback/${encodeURIComponent(fb.name)}" target="_blank">${esc(fb.name)}</a>
                            ${fb.label ? " · " + esc(fb.label) : ""}</span>
                    </div>`;
                    let extra = "";
                    if (!fb.schema && (fb.skills || []).length) {
                        extra += fb.skills.map((sk) => `<div class="hwf-pv-row">
                            <span class="hwf-pv-label">${esc(sk.skill)}</span><span>${ratingStars(sk.rating)}</span></div>`).join("");
                    }
                    (fb.extras || []).forEach((x) => {
                        extra += `<div class="hwf-pv-row"><span class="hwf-pv-label">${esc(x.label)}</span><span>${esc(x.value)}</span></div>`;
                    });
                    if (fb.feedback) {
                        extra += `<div class="hwf-pv-row"><span class="hwf-pv-label">${__("Feedback")}</span></div>
                            <div class="hwf-sub" style="white-space:pre-wrap;">${esc(fb.feedback)}</div>`;
                    }
                    const $sec = $(`<div class="hwf-pv-sec">${head}<div class="hwf-fb-form"></div>${extra}</div>`).appendTo($body);
                    if (fb.schema) renderFormio($sec.find(".hwf-fb-form")[0], fb.schema, fb.data || {});
                });
            },
        });
    }

    // What the candidate sent back on the pre-offer form: each field's value and
    // approval status. Read-only; approving still happens on the Pre Offer tab.
    function viewPreOfferSubmission(frm) {
        frappe.call({
            method: API + ".get_pre_offer_submission",
            args: { job_applicant: frm.doc.name },
            freeze: true,
            freeze_message: __("Loading pre offer…"),
            callback: (r) => {
                const res = (r && r.message) || {};
                const fields = res.fields || [];
                const rounds = res.rounds || [];
                const { $body } = infoDialog(__("Pre Offer"));
                const when = (v) => (v ? esc(frappe.datetime.str_to_user(v)) : "—");
                let html = rounds.map((rd) => `<div class="hwf-sub" style="margin-top:0;">
                    ${__("Sent")}: ${when(rd.sent_at)} &nbsp;·&nbsp; ${__("Filled")}: ${when(rd.filled_at)} &nbsp;·&nbsp; ${pill(rd.status || "Sent")}
                </div>`).join("");
                if (!fields.length) {
                    html += `<div class="hwf-empty">${__("The candidate has not submitted the pre-offer form yet.")}</div>`;
                } else {
                    const groups = [];
                    const bySec = {};
                    fields.forEach((f) => {
                        if (!bySec[f.section]) { bySec[f.section] = []; groups.push(f.section); }
                        bySec[f.section].push(f);
                    });
                    const approved = fields.filter((f) => f.approval_status === "Approved").length;
                    html += `<div class="hwf-pv"><div class="hwf-pv-head">${__("{0} of {1} field(s) approved", [approved, fields.length])}</div>` +
                        groups.map((g) => `<div class="hwf-pv-sec"><div class="hwf-pv-sec-title">${esc(g)}</div>` +
                            bySec[g].map((f) => {
                                const val = f.value == null || f.value === "" ? `<span class="text-muted">—</span>`
                                    : (f.fieldtype === "Attach" || f.fieldtype === "Attach Image")
                                        ? `<a href="${esc(f.value)}" target="_blank">${esc(String(f.value).split("/").pop())}</a>`
                                        : esc(f.value);
                                const note = f.hr_comment ? `<div class="text-muted" style="font-size:11px;">${esc(f.hr_comment)}</div>` : "";
                                return `<div class="hwf-pv-row">
                                    <span class="hwf-pv-label">${esc(f.label)}</span>
                                    <span style="flex:1;white-space:pre-wrap;">${val}${note}</span>
                                    ${pill(f.approval_status || "Pending")}
                                </div>`;
                            }).join("") + `</div>`).join("") + `</div>`;
                }
                $body.html(html);
            },
        });
    }

    function rejectCandidate(frm) {
        frappe.prompt(
            [{ fieldname: "reason", label: __("Reason"), fieldtype: "Small Text" }],
            (v) => {
                frappe.call({
                    method: API + ".reject_at_current_stage",
                    args: { job_applicant: frm.doc.name, reason: v.reason || "" },
                    freeze: true,
                    callback: () => frm.reload_doc(),
                });
            },
            __("Reject Candidate"),
            __("Reject")
        );
    }

    function sendPreOffer(frm) {
        frappe.confirm(
            __("Send the Pre Offer Form to this candidate?"),
            () => {
                frappe.call({
                    method: "recruitment.api.action_center.send_pre_offer",
                    args: { job_applicant_id: frm.doc.name },
                    freeze: true,
                    freeze_message: __("Sending Pre Offer Form…"),
                    callback: (r) => {
                        if (r.message && r.message.status === "success") {
                            frappe.show_alert({
                                message: r.message.already_sent
                                    ? __("Pre Offer Form already sent — no change.")
                                    : __("Pre Offer Form sent to candidate."),
                                indicator: "green",
                            });
                            frm.reload_doc();
                        } else {
                            frappe.msgprint({
                                title: __("Error"), indicator: "red",
                                message: (r.message && r.message.message) || __("Failed to send Pre Offer Form."),
                            });
                        }
                    },
                });
            }
        );
    }

    // Same server call as the Job Offer form's "Send Job Offer" button, so the
    // template, attachments and Recruitment Settings rules cannot drift.
    function sendJobOffer(frm, offer) {
        frappe.confirm(__("Send the offer email to {0}?", [esc(candidateName(frm.doc))]), () => {
            frappe.call({
                method: "recruitment.api.bulk_job_offer.send_bulk_job_offer",
                args: { job_offers: JSON.stringify([offer.name]) },
                freeze: true,
                freeze_message: __("Sending offer…"),
                callback: (r) => {
                    const m = (r && r.message) || {};
                    if (m.sent) {
                        frappe.show_alert({ message: __("Offer email sent."), indicator: "green" });
                    } else {
                        frappe.msgprint({
                            title: __("Not sent"), indicator: "orange",
                            message: m.pending_hr_ops
                                ? __("HR Ops has not been notified for this offer yet. Use 'Notify HR Ops' on the offer first.")
                                : m.already_sent
                                    ? __("This offer has already been sent.")
                                    : __("The offer could not be sent. Open it and check Email Status for the reason."),
                        });
                    }
                    frm.reload_doc();
                },
            });
        });
    }

    function withdrawJobOffer(frm, offer) {
        frappe.prompt(
            [{
                fieldname: "reason", label: __("Reason"), fieldtype: "Small Text",
                description: __("Recorded on the offer's timeline. The position returns to Open, and you can resend a revised offer afterwards."),
            }],
            (values) => {
                frappe.call({
                    method: "recruitment.api.offer_position.withdraw_offer",
                    args: { job_offer: offer.name, reason: values.reason },
                    freeze: true,
                    freeze_message: __("Withdrawing…"),
                    callback: () => {
                        frappe.show_alert({ message: __("Offer withdrawn"), indicator: "orange" });
                        frm.reload_doc();
                    },
                });
            },
            __("Withdraw Offer"),
            __("Withdraw")
        );
    }

    // A withdrawn / declined / cancelled offer is never edited back to life: the
    // next version is a new Draft, with the position re-claimed automatically,
    // opened for HR to review, submit and send.
    function resendConfirmMessage(offer, rule) {
        const next = (offer.version || 1) + 1;
        if (offer.status !== "Accepted" || offer.docstatus === 2) {
            return __("Create version {0} of {1} as a new Draft? You can edit it, then submit and send it.", [next, esc(offer.name)]);
        }
        const eos = ((rule && rule.removes_onboarding) || []).map((e) => esc(e.name));
        return __("The candidate has already accepted {0}. Resending will:", [esc(offer.name)])
            + "<ul>"
            + (eos.length
                ? "<li>" + __("delete their pending onboarding ({0}), including any details they have filled in on the onboarding form, and remove it from their portal", [eos.join(", ")]) + "</li>"
                : "")
            + "<li>" + __("cancel the accepted offer and free its position") + "</li>"
            + "<li>" + __("create version {0} as a new Draft for you to edit, submit and send", [next]) + "</li>"
            + "</ul>" + __("Continue?");
    }

    // An EXPIRED offer has a second route: the candidate simply ran out of time,
    // so the next version, with the same terms, is submitted and emailed on a new
    // expiry date. Nothing to edit or re-submit — see recruitment.api.offer_expiry.
    function resendOfferLetter(frm, offer) {
        const days =
            offer.offer_date && offer.custom_jo_expiry_date
                ? Math.max(frappe.datetime.get_day_diff(offer.custom_jo_expiry_date, offer.offer_date), 1)
                : 7;
        frappe.prompt(
            [{
                fieldname: "expiry_date", label: __("New Expiry Date"), fieldtype: "Date", reqd: 1,
                default: frappe.datetime.add_days(frappe.datetime.get_today(), days),
                description: __("The last day the candidate may accept. A new version of the offer, with the same terms, is created and emailed to the candidate."),
            }],
            (values) => {
                frappe.call({
                    method: "recruitment.api.offer_expiry.resend_offer_letter",
                    args: { job_offer: offer.name, expiry_date: values.expiry_date },
                    freeze: true,
                    freeze_message: __("Resending offer letter…"),
                    callback: (r) => {
                        const m = (r && r.message) || {};
                        if (!m.job_offer) return;
                        frappe.show_alert({
                            message: __("Offer letter resent as version {0} ({1}) — valid until {2}.", [
                                m.version,
                                m.job_offer,
                                frappe.datetime.str_to_user(m.expiry_date),
                            ]),
                            indicator: "green",
                        });
                        frm.reload_doc();
                    },
                });
            },
            __("Resend Offer Letter"),
            __("Resend")
        );
    }

    // A live offer the candidate has not answered: mail it to them again as it
    // stands. The server re-checks the rule (offer_lifecycle._resend_email_rule).
    function resendOfferEmail(frm, offer) {
        frappe.confirm(__("Email offer {0} to {1} again?", [esc(offer.name), esc(candidateName(frm.doc))]), () => {
            frappe.call({
                method: "recruitment.api.offer_lifecycle.resend_offer_email",
                args: { job_offer: offer.name },
                freeze: true,
                freeze_message: __("Resending offer…"),
                callback: (r) => {
                    const m = (r && r.message) || {};
                    if (!m.email) return;
                    frappe.show_alert({ message: __("Offer emailed again to {0}", [esc(m.email)]), indicator: "green" });
                    frm.reload_doc();
                },
            });
        });
    }

    function resendJobOffer(frm, offer, rule) {
        frappe.confirm(
            resendConfirmMessage(offer, rule),
            () => {
                frappe.call({
                    method: "recruitment.api.offer_lifecycle.resend_job_offer",
                    args: { job_offer: offer.name },
                    freeze: true,
                    freeze_message: __("Creating new version…"),
                    callback: (r) => {
                        const m = (r && r.message) || {};
                        if (!m.job_offer) return;
                        frappe.show_alert({
                            message: m.position_label
                                ? __("Version {0} created against {1}.", [m.version, m.position_label])
                                : __("Version {0} created.", [m.version]),
                            indicator: "green",
                        });
                        frappe.set_route("Form", "Job Offer", m.job_offer);
                    },
                });
            }
        );
    }

    function createJobOffer(frm) {
        // Ask the server whether this candidate may be offered at all before we
        // open a blank form — an active offer, a missing requisition or exhausted
        // headcount should be said up front, not after the recruiter has filled
        // in salary and terms. Job Offer.validate re-checks on save regardless.
        frappe.call({
            method: "recruitment.api.offer_validation.can_create_job_offer",
            args: { job_applicant: frm.doc.name },
            freeze: true,
            freeze_message: __("Checking offer eligibility..."),
            callback: (r) => {
                const res = (r && r.message) || {};
                if (res.allowed === false) {
                    frappe.msgprint({
                        title: __("Cannot Create Job Offer"),
                        indicator: "red",
                        message: res.message,
                    });
                    return;
                }
                openNewJobOffer(frm);
            },
        });
    }

    // A lateral requisition itemises its headcount, so the recruiter must say
    // which position the offer consumes BEFORE the offer form opens — picking it
    // afterwards means the form is already half-filled against an unknown
    // position. Campus requisitions budget a lump of openings per region and have
    // nothing to pick, so they go straight through.
    function openNewJobOffer(frm) {
        frappe.call({
            method: "recruitment.api.offer_position.get_offer_position_context",
            args: { job_applicant: frm.doc.name },
            freeze: true,
            freeze_message: __("Checking available positions..."),
            callback: (r) => {
                const ctx = (r && r.message) || {};

                if (!ctx.requires_position) {
                    routeToNewJobOffer(frm, null);
                    return;
                }

                const positions = ctx.positions || [];
                if (!positions.length) {
                    frappe.msgprint({
                        title: __("No Position Available"),
                        indicator: "red",
                        message:
                            ctx.reason ||
                            __("No position is free on this requisition to offer against."),
                    });
                    return;
                }

                const dialog = new frappe.ui.Dialog({
                    title: __("Select Position"),
                    fields: [
                        {
                            fieldname: "position",
                            label: __("Position"),
                            fieldtype: "Select",
                            reqd: 1,
                            options: positions.map((p) => ({ label: p.label, value: p.name })),
                            default: positions[0].name,
                            description: __(
                                "The offer will be raised against this position. It moves to Filled while the offer is live, and back to Open if the offer is withdrawn."
                            ),
                        },
                    ],
                    primary_action_label: __("Continue"),
                    primary_action(values) {
                        const chosen = positions.find((p) => p.name === values.position);
                        dialog.hide();
                        routeToNewJobOffer(frm, chosen);
                    },
                });
                dialog.show();
            },
        });
    }

    // The Job Applicant keeps the name in parts — `applicant_name` is the FIRST name
    // — and derives `custom_full_name` from them on save. Anything that shows a
    // candidate to a person shows that.
    function candidateName(doc) {
        if (doc.custom_full_name) return doc.custom_full_name;
        // Fallback for a row saved before the derived field shipped: skip a part
        // already sitting in an earlier one, so a surname is never printed twice.
        let out = "";
        [doc.applicant_name, doc.custom_applicant_middle_name, doc.custom_applicant_last_name]
            .map((p) => String(p || "").trim())
            .filter(Boolean)
            .forEach((part) => {
                if (out.toLowerCase().includes(part.toLowerCase())) return;
                out = out ? `${out} ${part}` : part;
            });
        return out || doc.name;
    }

    // Open a prefilled Job Offer form for review (don't create it silently) —
    // HR fills salary/terms and saves it themselves.
    function routeToNewJobOffer(frm, position) {
        frappe.model.with_doctype("Job Offer", () => {
            const d = frappe.model.get_new_doc("Job Offer");
            d.job_applicant = frm.doc.name;
            d.applicant_name = candidateName(frm.doc);
            d.applicant_email = frm.doc.email_id;
            if (frm.doc.designation) d.designation = frm.doc.designation;
            if (frm.doc.custom_expected_doj) d.custom_expected_doj = frm.doc.custom_expected_doj;
            if (frm.doc.phone_number) d.custom_phone_number = frm.doc.phone_number;
            d.offer_date = frappe.datetime.get_today();
            if (position) {
                d.custom_requisition_position = position.name;
                d.custom_position_label = position.label;
                if (position.employee_type) d.custom_employment_type = position.employee_type;
            }
            frappe.set_route("Form", "Job Offer", d.name);
        });
    }

    // ── rendering ──────────────────────────────────────────────────────────
    function ratingStars(v) {
        const n = Math.round((v || 0) * 5);
        return n ? "★".repeat(n) + "☆".repeat(5 - n) : "";
    }

    // Job Offer status -> an existing pill colour. Cancelled is docstatus 2.
    function offerStatus(o) {
        return o.docstatus === 2 ? __("Cancelled") : (o.status || "Draft");
    }
    function offerPill(o) {
        const st = o.docstatus === 2 ? "Cancelled" : (o.status || "Draft");
        const cls = { Accepted: "Approved", Rejected: "Rejected", Withdrawn: "Rejected",
                      Expired: "Rejected", Cancelled: "Rejected",
                      "Awaiting Response": "Awaiting" }[st] || "default";
        return `<span class="hwf-pill ${cls}">${esc(offerStatus(o))}</span>`;
    }

    function pill(text) {
        const cls = ["Cleared", "Approved", "Rejected", "Pending", "Sent", "Filled", "Reviewed"].includes(text) ? text : "default";
        return `<span class="hwf-pill ${cls}">${esc(text)}</span>`;
    }

    // Badge text for a stage. The stage's own recorded `result` wins ("Not Required",
    // "Cleared", …) — it says more than the derived state does.
    function stageStatusLabel(s) {
        if (s.result) return s.result;
        if (s.state === "done") return __("Completed");
        if (s.state === "current") return __("In Progress");
        if (s.state === "rejected") return __("Rejected");
        return __("Pending");
    }

    function stageStatusCls(s) {
        if (/not required/i.test(s.result || "")) return "hwf-sb-muted";
        if (s.state === "done") return "hwf-sb-done";
        if (s.state === "current") return "hwf-sb-current";
        if (s.state === "rejected") return "hwf-sb-rejected";
        return "hwf-sb-upcoming";
    }

    const names = (people) => (people || []).map((p) => p.full_name || p.user).filter(Boolean);

    // "Whose action is this?" — the interviewers still owing feedback while the
    // interview is open, or who gave it once the round is decided. Its own line
    // under the interview row so a long panel wraps instead of stretching the row.
    function ivPeopleHtml(iv) {
        const pending = names(iv.pending_with);
        if (pending.length) {
            return `<div class="hwf-ivpeople"><span class="hwf-owner-label">${__("Pending with")}:</span> ${esc(pending.join(", "))}</div>`;
        }
        const panel = names(iv.interviewers);
        if (panel.length) {
            return `<div class="hwf-ivpeople"><span class="hwf-owner-label">${__("Interviewers")}:</span> ${esc(panel.join(", "))}</div>`;
        }
        return "";
    }

    // Cancelled interviews stay on record, muted, under the stage they were for.
    function cancelledHtml(stage) {
        const list = stage.cancelled_interviews || [];
        if (!list.length) return "";
        return `<div class="hwf-ivlist">` + list.map((iv) =>
            `<div class="hwf-ivrow text-muted">
                <a class="hwf-link" data-open-iv="${esc(iv.name)}">${esc(iv.name)}</a>
                <span class="hwf-pill Rejected">${__("Cancelled")}</span>
                <span>${iv.scheduled_on ? esc(frappe.datetime.str_to_user(iv.scheduled_on)) : ""}</span>
            </div>`).join("") + `</div>`;
    }

    function interviewsHtml(stage) {
        const list = stage.interviews || [];
        if (!list.length) {
            // Nothing scheduled yet — the round is waiting on whoever books it.
            const owner = names(stage.pending_with);
            return (owner.length
                ? `<div class="hwf-sub" style="margin-top:8px;"><span class="hwf-owner-label">${__("Pending with")}:</span> ${esc(owner.join(", "))} — ${__("no interview scheduled yet")}</div>`
                : "") + cancelledHtml(stage);
        }
        return cancelledHtml(stage) + `<div class="hwf-ivlist">` + list.map((iv) =>
            `<div class="hwf-ivitem">
                <div class="hwf-ivrow">
                    <a class="hwf-link" data-open-iv="${esc(iv.name)}">${esc(iv.name)}</a>
                    ${pill(iv.status || "Pending")}
                    <span>${ratingStars(iv.average_rating)}</span>
                    <span class="text-muted">${iv.scheduled_on ? esc(frappe.datetime.str_to_user(iv.scheduled_on)) : ""}</span>
                </div>
                ${ivPeopleHtml(iv)}
            </div>`).join("") + `</div>`;
    }

    // Banner shown above the flow when there is no current stage to act on.
    function renderBanner(view) {
        if (view.is_closed) {
            const ok = view.status === "Accepted";
            return `<div class="hwf-panel"><div class="hwf-banner ${ok ? "ok" : "bad"}">
                ${ok ? "✓ " + __("Candidate has cleared the pipeline (Accepted).")
                     + (((view.job_offer_actions || {}).resend || {}).allowed
                        ? " " + __("If the offer needs revising, 'Resend Job Offer' is on the Job Offer stage.") : "")
                     : (view.current_stage_type === "Offer" && view.job_offer && view.job_offer.status === "Rejected"
                        ? "✕ " + __("Candidate declined the job offer.")
                          + ((view.job_offer_actions || {}).resend && view.job_offer_actions.resend.allowed
                             ? " " + __("A revised offer can be resent from the Job Offer stage.") : "")
                        : "✕ " + __("Candidate was rejected."))}
                </div></div>`;
        }
        if ((view.stages || [])[view.current_stage_index]) return "";
        const first = (view.stages || [])[0];
        const startBtn = first
            ? `<div class="hwf-actions" style="justify-content:center;margin-top:8px;">
                 <button class="hwf-btn primary" data-start="${esc(first.stage_name)}">${__("Place on first stage")}: ${esc(first.stage_name)}</button>
               </div>` : "";
        return `<div class="hwf-panel"><div class="hwf-empty" style="padding-bottom:4px;">${__("Candidate is not on any stage yet.")}</div>${startBtn}</div>`;
    }

    // "Mark as Not Required" is offered only where skipping is actually allowed:
    // a stage the workflow marks Mandatory can be cleared or rejected, never
    // stepped around. Returns null so moreMenu() drops the entry (and the whole
    // ⋮ button, when nothing else is left in it).
    function notRequiredItem(stage) {
        if (stage && stage.is_mandatory) return null;
        return { key: "notreq", label: __("Mark as Not Required"), cls: "danger" };
    }

    function moreMenu(items) {
        const live = (items || []).filter(Boolean);
        if (!live.length) return "";
        const links = live.map((i) =>
            `<a data-menu="${esc(i.key)}"${i.cls ? ` class="${esc(i.cls)}"` : ""}${i.title ? ` title="${esc(i.title)}"` : ""}>${esc(i.label)}</a>`).join("");
        return `<span class="hwf-more-wrap">
                <button class="hwf-btn" data-act="more" title="${__("More")}">⋮</button>
                <div class="hwf-menu" style="display:none;">${links}</div>
            </span>`;
    }

    // Preview (blank) / View (submitted) for an Interview stage's feedback forms.
    // A form can sit on the stage or only on its interview / panel rows, so any
    // of those makes the preview worth offering.
    function feedbackButtonsHtml(stage) {
        const ivs = stage.interviews || [];
        const hasForm = !!stage.evaluation_form || ivs.some((iv) =>
            iv.custom_evaluation_form || Object.keys(iv.panel_forms || {}).length);
        const submitted = ivs.some((iv) => (iv.submitted_by || []).length);
        const st = esc(stage.stage_name);
        let html = "";
        if (hasForm) html += `<button class="hwf-btn" data-act="previewfeedback" data-stage="${st}">${__("Preview Feedback Form")}</button>`;
        if (submitted) html += `<button class="hwf-btn" data-act="viewfeedback" data-stage="${st}">${__("View Feedback")}</button>`;
        return html;
    }

    // Read-only buttons on a stage the candidate has already passed.
    function pastStageButtonsHtml(view, s) {
        const type = s.stage_type || "";
        let html = "";
        if (type === "Interview") html = feedbackButtonsHtml(s);
        else if (type === "Pre Offer") {
            html = `<button class="hwf-btn" data-act="previewpreoffer">${__("Preview")}</button>`;
            if ((view.pre_offer || {}).sent) html += `<button class="hwf-btn" data-act="viewpreofferdata">${__("View Pre Offer")}</button>`;
        }
        return html ? `<div class="hwf-actions" style="margin-top:8px;">${html}</div>` : "";
    }

    // Actions + context for the stage the candidate is standing on. Rendered inside
    // that stage's card in the vertical flow, so it carries no frame of its own.
    function renderStageActions(frm, view, cur) {
        const type = cur.stage_type || "";
        let actions = "";
        if (type === "Screening") {
            actions += `<button class="hwf-btn primary" data-act="review" data-mode="Screening">${__("Screen")}</button>`;
            actions += `<button class="hwf-btn" data-act="screening">${__("Run Auto-Screening")}</button>`;
        } else if (type === "Shortlist") {
            actions += `<button class="hwf-btn primary" data-act="review" data-mode="Shortlist">${__("Shortlist")}</button>`;
        } else if (type === "Interview") {
            // Feedback is filed against the interview that was actually held, so
            // the stage can't be completed before one exists — the server refuses
            // it too (complete_interview), this just says so before the click.
            const hasInterview = (cur.interviews || []).length > 0;
            // One interview per stage: once it is booked (cancelled ones are not
            // in this list), rescheduling happens on the Interview itself.
            actions += hasInterview
                ? `<button class="hwf-btn" disabled title="${__("An interview is already scheduled for this stage.")}">+ ${__("Schedule Interview")}</button>`
                : `<button class="hwf-btn" data-act="interview">+ ${__("Schedule Interview")}</button>`;
            actions += feedbackButtonsHtml(cur);
            actions += hasInterview
                ? `<button class="hwf-btn primary" data-act="markdone">${__("Mark as Completed")}</button>`
                : `<button class="hwf-btn primary" disabled title="${__("Schedule an interview for this stage first.")}">${__("Mark as Completed")}</button>`;
            // Feedback can be requested only once an interview has actually taken place.
            const interviewOver = (cur.interviews || []).some((iv) => iv.is_over);
            // Cancel / Reschedule act on the stage's one live interview; the server
            // says when that is no longer allowed (feedback in, decided, campus…).
            const live = (cur.interviews || [])[0];
            const blocked = !live ? __("Schedule an interview for this stage first.") : live.change_blocked;
            const changeItem = (key, label, cls) => blocked
                ? { key, label, cls: `disabled${cls ? " " + cls : ""}`, title: blocked }
                : { key, label, cls };
            actions += moreMenu([
                interviewOver
                    ? { key: "feedbackform", label: __("Send Feedback Form") }
                    : { key: "feedbackform", label: __("Send Feedback Form"), cls: "disabled",
                        title: __("Available after the interview is completed.") },
                changeItem("rescheduleiv", __("Reschedule Interview")),
                changeItem("canceliv", __("Cancel Interview"), "danger"),
                notRequiredItem(cur),
            ]);
        } else if (type === "Pre Offer") {
            const po = view.pre_offer || {};
            const poLabel = po.sent ? __("Resend Pre Offer Form") : __("Send Pre Offer Form");
            actions += `<button class="hwf-btn primary" data-act="preoffer">+ ${poLabel}</button>`;
            // "View Pre Offer Form" opens the approval panel, which only has rows
            // once the candidate submits. This one answers the other question —
            // what is this opening going to ask for — and works before sending.
            actions += `<button class="hwf-btn" data-act="previewpreoffer">${__("Preview")}</button>`;
            if (po.sent) actions += `<button class="hwf-btn" data-act="viewpreoffer">${__("View Pre Offer Form")}</button>`;
            if (!view.is_last) actions += `<button class="hwf-btn" data-act="complete">✓ ${__("Complete stage")}</button>`;
            actions += moreMenu([notRequiredItem(cur)]);
        } else if (type === "Offer") {
            actions += offerActionsHtml(view);
        } else if (!view.is_last) {
            actions += `<button class="hwf-btn primary" data-act="complete">✓ ${__("Complete stage")}</button>`;
        }
        actions += `<button class="hwf-btn danger" data-act="reject">✕ ${__("Reject")}</button>`;

        // context detail for the current stage
        let detail = "";
        if (type === "Interview") {
            detail = interviewsHtml(cur);
        }
        if (type === "Pre Offer") {
            const po = view.pre_offer || {};
            const c = po.counts || {};
            const bits = [];
            bits.push(__("Pre Offer") + ": " + pill(po.sent ? (po.status || "Sent") : "Not sent"));
            if ((c.Filled || c.Approved || c.Rejected)) {
                bits.push(`${__("Approvals")}: ${c.Approved || 0}✓ / ${c.Filled || 0}📝 / ${c.Rejected || 0}✕`);
            }
            detail = `<div class="hwf-sub">${bits.join(" &nbsp;·&nbsp; ")}</div>`;
        }
        if (type === "Offer") {
            detail = offerDetailHtml(view);
        }

        return `<div class="hwf-actions">${actions}</div>${detail}`;
    }

    // Offer stage buttons. Which of Send / Withdraw / Resend show is decided by
    // the server (offer_lifecycle.get_offer_actions, which reads the Recruitment
    // Settings -> Job Offer Rules) — the same answer the Job Offer form uses.
    function offerActionsHtml(view) {
        const o = view.job_offer;
        if (!o) return `<button class="hwf-btn primary" data-act="createoffer">+ ${__("Create Job Offer")}</button>`;
        const a = view.job_offer_actions || {};
        let html = "";
        if (a.resend_letter && a.resend_letter.allowed) {
            // The expected move on an expired offer, so it leads.
            html += `<button class="hwf-btn primary" data-act="resendofferletter">✉ ${__("Resend Offer Letter")}</button>`;
        }
        if (a.resend && a.resend.allowed) {
            // Revising an accepted offer undoes onboarding — offered, not pushed.
            // Alongside "Resend Offer Letter" it is the secondary choice: it is for
            // when the terms change, not just the date.
            const cls = (o.status === "Accepted" && o.docstatus !== 2) || (a.resend_letter || {}).allowed
                ? "hwf-btn" : "hwf-btn primary";
            html += `<button class="${cls}" data-act="resendoffer">↻ ${__("Resend Job Offer")}</button>`;
        } else if (a.resend_email && a.resend_email.allowed) {
            // Live offer awaiting the candidate: the same email again.
            html += `<button class="hwf-btn" data-act="resendofferemail">↻ ${__("Resend Job Offer")}</button>`;
        } else if (!(a.resend_letter || {}).allowed) {
            // Always on the stage once there is an offer, saying why it can't be
            // used yet — "Resend Offer Letter" stands in for it on an expired one.
            const closed = o.docstatus === 2 || ["Accepted", "Rejected", "Withdrawn", "Expired"].includes(o.status);
            const why = (closed ? (a.resend || {}).reason : (a.resend_email || {}).reason) || "";
            html += `<button class="hwf-btn" disabled title="${esc(why)}">↻ ${__("Resend Job Offer")}</button>`;
        }
        if (a.send && a.send.allowed) {
            html += `<button class="hwf-btn primary" data-act="sendoffer">✉ ${__("Send Job Offer")}</button>`;
        }
        html += `<button class="hwf-btn" data-act="openoffer">${o.docstatus === 0 ? __("Edit Job Offer") : __("Open Job Offer")}</button>`;
        if (a.withdraw && a.withdraw.allowed) {
            html += `<button class="hwf-btn danger" data-act="withdrawoffer">${__("Withdraw Offer")}</button>`;
        }
        return html;
    }

    function offerDetailHtml(view) {
        const o = view.job_offer;
        if (!o) return `<div class="hwf-sub">${__("No Job Offer created yet.")}</div>`;
        const a = view.job_offer_actions || {};
        const bits = [
            `${__("Job Offer")}: <a class="hwf-link" data-open-offer="${esc(o.name)}">${esc(o.name)}</a>`
                + (o.version > 1 ? ` (v${o.version})` : "") + " " + offerPill(o),
        ];
        if (o.email_status === "Sent") bits.push(__("Email sent"));
        let hint = "";
        if (o.docstatus === 0 && !["Withdrawn", "Rejected", "Expired"].includes(o.status)) {
            hint = __("Review the offer and submit it, then send it to the candidate.");
        } else if (o.status === "Expired" && (a.resend_letter || {}).allowed) {
            hint = __("The candidate did not respond before the expiry date. Resend the letter with a new date, or raise a revised version.");
        } else if (a.resend && !a.resend.allowed && (o.docstatus === 2 || ["Withdrawn", "Rejected", "Expired"].includes(o.status))) {
            hint = a.resend.reason || "";
        }
        let html = `<div class="hwf-sub">${bits.join(" &nbsp;·&nbsp; ")}</div>`;
        html += offerApprovalHtml(view.job_offer_approval);
        if (hint) html += `<div class="hwf-sub text-muted">${esc(hint)}</div>`;
        const prev = view.previous_offers || [];
        if (prev.length) {
            html += `<div class="hwf-offer-versions">${__("Earlier versions")}: ` + prev.map((p) =>
                `<a class="hwf-link" data-open-offer="${esc(p.name)}">v${p.version} ${esc(p.name)}</a> ${offerPill(p)}`
            ).join(" &nbsp; ") + `</div>`;
        }
        return html;
    }

    // Where the offer's approval stands — a nextai approval flow on Job Offer, or
    // the HR Ops verification step (offer_lifecycle.offer_approval_status). While
    // it is live, name the approvers; a role-based stage names the role(s).
    function offerApprovalHtml(ap) {
        if (!ap) return "";
        const stage = ap.stage ? ` <span class="text-muted">(${esc(ap.stage)})</span>` : "";
        if (ap.status === "Pending" || ap.status === "Send Back") {
            const people = names(ap.pending_with);
            const parts = [];
            if (people.length) parts.push(esc(people.join(", ")));
            if ((ap.roles || []).length) {
                parts.push(esc(ap.roles.join(", ")) + ` <span class="text-muted">(${__("role")})</span>`);
            }
            const who = parts.join("; ") || `<span class="text-muted">${__("no approver assigned")}</span>`;
            const label = ap.status === "Send Back" ? __("Sent back — pending with") : __("Approval pending with");
            return `<div class="hwf-sub"><span class="hwf-owner-label">${label}:</span> ${who}${stage}</div>`;
        }
        return `<div class="hwf-sub"><span class="hwf-owner-label">${__("Approval")}:</span> ${pill(ap.status)}${stage}</div>`;
    }

    // A candidate who declined (Rejected) or accepted is closed, but the Offer
    // stage still has one thing to offer: a revised letter.
    function offerStageReopenable(view, s, i) {
        const a = view.job_offer_actions || {};
        return view.is_closed && ["Rejected", "Accepted"].includes(view.status)
            && (s.stage_type || "") === "Offer" && i === view.current_stage_index
            && !!(a.resend && a.resend.allowed);
    }

    // What a stage shows when expanded: live actions for the current stage, the
    // recorded outcome for anything already passed, a "move here" for what's ahead.
    function stageBody(frm, view, s, i) {
        if (s.state === "current" && !view.is_closed) return renderStageActions(frm, view, s);
        if (offerStageReopenable(view, s, i)) {
            return `<div class="hwf-actions">${offerActionsHtml(view)}</div>${offerDetailHtml(view)}`;
        }

        const bits = [];
        if (s.entered_on) bits.push(`${__("Entered")}: ${esc(frappe.datetime.str_to_user(s.entered_on))}`);
        if (s.result) bits.push(`${__("Result")}: ${esc(s.result)}`);

        let html = bits.length ? `<div class="hwf-sub" style="margin-top:0;">${bits.join(" &nbsp;·&nbsp; ")}</div>` : "";
        if (s.state !== "upcoming") html += pastStageButtonsHtml(view, s);
        html += interviewsHtml(s);
        // Forward-only: a completed or current stage can't be revisited, so the jump
        // is offered on upcoming stages only.
        if (s.state === "upcoming" && !view.is_closed) {
            // Jumping here would leave every stage in between with no outcome —
            // which a mandatory stage does not allow. set_stage refuses it
            // server-side; this names the blocker instead of offering the click.
            const blockers = (view.stages || [])
                .slice(view.current_stage_index + 1, i)
                .filter((b) => b.is_mandatory)
                .map((b) => b.stage_name);
            html += blockers.length
                ? `<div class="hwf-sub" style="margin-top:10px;">${__("Can't move here — the mandatory stage(s) {0} must be completed first.", [esc(blockers.join(", "))])}</div>`
                : `<div class="hwf-actions" style="margin-top:10px;">
                <button class="hwf-btn" data-jump="${esc(s.stage_name)}">${__("Move candidate to this stage")}</button>
            </div>`;
        }
        if (s.is_extra && s.state === "upcoming" && !view.is_closed) {
            html += `<div class="hwf-actions" style="margin-top:10px;">
                <button class="hwf-btn danger" data-remove-stage="${esc(s.stage_name)}">${__("Remove this stage")}</button>
            </div>`;
        }
        return html || `<div class="hwf-sub" style="margin-top:0;">${__("Nothing recorded for this stage yet.")}</div>`;
    }

    function render(frm, view, attempt) {
        attempt = attempt || 0;
        frm._hwf_view = view;   // cache so a tab click can re-render
        const field = frm.fields_dict[HOST];
        if (!field || !field.$wrapper) {
            // HTML control not mounted yet (inactive tab) — retry briefly.
            if (attempt < 20) setTimeout(() => render(frm, view, attempt + 1), 150);
            return;
        }
        const $w = field.$wrapper;

        if (!view || !view.enabled) {
            $w.html(`<div class="hwf-empty">${__("Hiring Workflow is disabled in Recruitment Settings.")}</div>`);
            keepTabVisible(frm);
            return;
        }
        const stages = view.stages || [];
        if (!stages.length) {
            $w.html(`<div class="hwf-empty">${__("The linked Job Opening has no hiring stages configured.")}</div>`);
            keepTabVisible(frm);
            return;
        }

        const closed = view.is_closed;
        // Vertical flow: one row per stage, expanded on the stage in play.
        const rows = stages.map((s, i) => {
            const st = STATE[s.state] || STATE.upcoming;
            const open = s.state === "current" && !closed;
            // A declined offer that can be resent stays expanded so the action shows.
            const expanded = open || offerStageReopenable(view, s, i);
            // The stage in play shows its step number; the rest show their outcome.
            const icon = open ? String(i + 1) : st.icon;
            return `<div class="hwf-row ${st.cls}${expanded ? " is-open" : ""}">
                <div class="hwf-rail"><span class="hwf-badge">${icon}</span></div>
                <div class="hwf-card">
                    <div class="hwf-card-head">
                        <span class="hwf-name">${esc(s.stage_name || "")}</span>
                        <span class="hwf-sbadge ${stageStatusCls(s)}">${esc(stageStatusLabel(s))}</span>
                        <span class="hwf-type">${esc(s.stage_type || "")}</span>
                        ${s.is_mandatory ? `<span class="hwf-req" title="${__("This stage can't be skipped.")}">${__("Mandatory")}</span>` : ""}
                        ${s.is_extra ? `<span class="hwf-req hwf-extra" title="${__("Added for this candidate only.")}">${__("Added")}</span>` : ""}
                        <span class="hwf-chevron">⌄</span>
                    </div>
                    <div class="hwf-card-body">${stageBody(frm, view, s, i)}</div>
                </div>
            </div>`;
        }).join("");

        const addBtn = view.add_stage_blocked
            ? `<button class="hwf-btn" disabled title="${esc(view.add_stage_blocked)}">+ ${__("Add Interview Stage")}</button>`
            : `<button class="hwf-btn" data-add-stage="1">+ ${__("Add Interview Stage")}</button>`;
        $w.html(`<div class="hwf-wrap">${renderBanner(view)}<div class="hwf-flow">${rows}</div>
            <div class="hwf-actions" style="margin-top:12px;padding-left:40px;">${addBtn}</div></div>`);

        // Expand / collapse a stage. Actions live in the body, so they never
        // collide with this.
        $w.find(".hwf-card-head").on("click", function () {
            $(this).closest(".hwf-row").toggleClass("is-open");
        });

        // ── event wiring ──
        $w.find("[data-start]").on("click", function () {
            const stage = $(this).data("start");
            frappe.call({
                method: API + ".set_stage",
                args: { job_applicant: frm.doc.name, stage_name: stage },
                freeze: true,
                callback: () => frm.reload_doc(),
            });
        });
        $w.find("[data-jump]").on("click", function () { jumpTo(frm, $(this).data("jump")); });
        $w.find("[data-add-stage]").on("click", () => addInterviewStage(frm, view));
        $w.find("[data-remove-stage]").on("click", function () { removeInterviewStage(frm, $(this).data("remove-stage")); });
        $w.find("[data-open-offer]").on("click", function () {
            frappe.set_route("Form", "Job Offer", $(this).data("open-offer"));
        });
        $w.find("[data-open-iv]").on("click", function () {
            frappe.set_route("Form", "Interview", $(this).data("open-iv"));
        });
        $w.find(".hwf-actions .hwf-btn").on("click", function (e) {
            const act = $(this).data("act");
            if (act === "more") {
                e.stopPropagation();
                const menu = $(this).siblings(".hwf-menu");
                $w.find(".hwf-menu").not(menu).hide();
                menu.toggle();
                return;
            }
            if (act === "complete") completeStage(frm);
            else if (act === "interview") scheduleInterview(frm, view.current_stage);
            else if (act === "previewfeedback") previewFeedbackForm($(this).data("stage") || view.current_stage, frm);
            else if (act === "viewfeedback") viewSubmittedFeedback($(this).data("stage") || view.current_stage, frm);
            else if (act === "viewpreofferdata") viewPreOfferSubmission(frm);
            else if (act === "markdone") openInterviewDialog(frm, view);
            else if (act === "review") openReviewDialog(frm, $(this).data("mode"));
            else if (act === "screening") runScreening(frm);
            else if (act === "preoffer") sendPreOffer(frm);
            else if (act === "previewpreoffer") previewPreOfferForm(frm);
            else if (act === "viewpreoffer") gotoPreOfferApprovalTab(frm);
            else if (act === "createoffer") createJobOffer(frm);
            else if (act === "openoffer") frappe.set_route("Form", "Job Offer", view.job_offer.name);
            else if (act === "sendoffer") sendJobOffer(frm, view.job_offer);
            else if (act === "withdrawoffer") withdrawJobOffer(frm, view.job_offer);
            else if (act === "resendoffer") resendJobOffer(frm, view.job_offer, (view.job_offer_actions || {}).resend);
            else if (act === "resendofferemail") resendOfferEmail(frm, view.job_offer);
            else if (act === "resendofferletter") resendOfferLetter(frm, view.job_offer);
            else if (act === "reject") rejectCandidate(frm);
        });
        $w.find(".hwf-menu a").on("click", function () {
            if ($(this).hasClass("disabled")) return false;
            const item = $(this).data("menu");
            $w.find(".hwf-menu").hide();
            const cur = (view.stages || [])[view.current_stage_index] || {};
            const liveIv = (cur.interviews || [])[0];
            if (item === "notreq") markNotRequired(frm, view.current_stage);
            else if (item === "feedbackform") sendFeedbackForm(frm, cur);
            else if (item === "rescheduleiv" && liveIv) rescheduleInterview(frm, liveIv);
            else if (item === "canceliv" && liveIv) cancelInterview(frm, liveIv);
        });
        // close any open menu when clicking elsewhere
        $(document).off("click.hwfmenu").on("click.hwfmenu", () => $w.find(".hwf-menu").hide());

        keepTabVisible(frm);
    }

    function runScreening(frm) {
        // Screening runs in a background worker; the "screening_done" realtime
        // handler in job_applicant.js reloads the form when it finishes.
        frappe.call({
            method: "recruitment.recruitment.screening_engine.run_screening",
            args: { applicant: frm.doc.name },
            freeze: true,
            freeze_message: __("Queuing screening…"),
            callback: (r) => {
                const msg = (r && r.message) || {};
                if (msg.enqueued) {
                    frappe.show_alert({ message: __("Screening started — the result will update shortly."), indicator: "blue" });
                } else {
                    frappe.msgprint(__("This opening has no screening conditions configured."));
                }
            },
        });
    }

    // ── Screening / Shortlist review dialog ────────────────────────────────
    function reviewSummaryHtml(m) {
        const row = (l, v) => v ? `<div style="margin-bottom:8px;"><div class="text-muted" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;">${esc(l)}</div><div>${esc(v)}</div></div>` : "";
        const work = (m.work_experience || []).map((w) =>
            `<div>${esc(w.company || "")}${w.designation ? " — " + esc(w.designation) : ""}${w.experience ? " (" + esc(w.experience) + ")" : ""}</div>`).join("") || `<span class="text-muted">—</span>`;
        const edu = (m.education || []).map((e) =>
            `<div>${esc(e.qualification || "")}${e.school ? " — " + esc(e.school) : ""}${e.year ? " (" + esc(e.year) + ")" : ""}</div>`).join("") || `<span class="text-muted">—</span>`;
        const resume = m.resume_url
            ? `<a href="${esc(m.resume_url)}" target="_blank" class="hwf-link">📄 ${__("View / Download Resume")}</a>`
            : (m.resume_link ? `<a href="${esc(m.resume_link)}" target="_blank" class="hwf-link">🔗 ${__("Resume Link")}</a>` : `<span class="text-muted">${__("No resume attached")}</span>`);
        return `<div style="display:flex;gap:24px;flex-wrap:wrap;padding:4px 2px 12px;">
            <div style="flex:1;min-width:280px;">
                <h5 style="margin:0 0 2px;">${esc(m.name || "")}</h5>
                <div class="text-muted" style="margin-bottom:14px;">${esc(m.email || "")}${m.phone ? " · " + esc(m.phone) : ""}</div>
                ${row(__("Total Experience"), m.total_experience)}
                ${row(__("Current"), [m.current_designation, m.current_company].filter(Boolean).join(" @ "))}
                <div style="margin-bottom:8px;"><div class="text-muted" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;">${__("Experience")}</div>${work}</div>
                <div style="margin-bottom:8px;"><div class="text-muted" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;">${__("Education")}</div>${edu}</div>
                ${row(__("Source"), m.source)}
            </div>
            <div style="flex:0 0 200px;">
                <div class="text-muted" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px;">${__("Resume")}</div>
                ${resume}
            </div>
        </div>`;
    }

    function submitReview(frm, d, action, values) {
        const tags = ((values && values.tags) || "").split(",").map((s) => s.trim()).filter(Boolean);
        frappe.call({
            method: API + ".complete_review",
            args: {
                job_applicant: frm.doc.name,
                action: action,
                comment: (values && values.comment) || "",
                tags: JSON.stringify(tags),
            },
            freeze: true,
            freeze_message: __("Saving…"),
            callback: () => {
                d.hide();
                frappe.show_alert({ message: action === "reject" ? __("Candidate rejected.") : __("Moved to next stage."), indicator: action === "reject" ? "red" : "green" });
                frm.reload_doc();
            },
        });
    }

    function openReviewDialog(frm, mode) {
        const actionLabel = mode === "Shortlist" ? __("Shortlist") : __("Screen");
        const d = new frappe.ui.Dialog({
            title: `${mode} — ${candidateName(frm.doc)}`,
            size: "large",
            fields: [
                { fieldtype: "HTML", fieldname: "summary" },
                { fieldtype: "Section Break", label: __("Feedback") },
                { fieldtype: "Small Text", fieldname: "comment", label: __("Comment") },
                { fieldtype: "Data", fieldname: "tags", label: __("Tags (comma separated)") },
            ],
            primary_action_label: actionLabel,
            primary_action(values) { submitReview(frm, d, "advance", values); },
            secondary_action_label: __("Reject"),
            secondary_action() { submitReview(frm, d, "reject", d.get_values(true) || {}); },
        });
        d.show();
        frappe.call({
            method: API + ".get_candidate_review",
            args: { job_applicant: frm.doc.name },
            callback: (r) => {
                const m = r && r.message;
                if (m) d.fields_dict.summary.$wrapper.html(reviewSummaryHtml(m));
            },
        });
    }

    // ── Interview completion dialog ("Mark as Completed") ──────────────────
    function openInterviewDialog(frm, view) {
        const d = new frappe.ui.Dialog({
            title: __("Complete Interview"),
            fields: [
                { fieldtype: "Rating", fieldname: "rating", label: __("Rating"), reqd: 1 },
                { fieldtype: "Small Text", fieldname: "comments", label: __("Overall Comments") },
                { fieldtype: "Select", fieldname: "assessment", label: __("Assessment"), reqd: 1,
                  options: ["", "Candidate Selected", "Candidate Rejected"].join("\n") },
            ],
            primary_action_label: __("Submit"),
            primary_action(values) {
                frappe.call({
                    method: API + ".complete_interview",
                    args: {
                        job_applicant: frm.doc.name,
                        rating: values.rating || 0,
                        comments: values.comments || "",
                        assessment: values.assessment,
                        stage_name: view.current_stage,
                    },
                    freeze: true,
                    freeze_message: __("Saving feedback…"),
                    callback: () => {
                        d.hide();
                        frappe.show_alert({ message: __("Interview feedback recorded."), indicator: "green" });
                        frm.reload_doc();
                    },
                });
            },
        });
        d.show();
    }

    // Re-render from the cached view whenever the Hiring Workflow tab is
    // clicked — by then the HTML control is guaranteed to be in the DOM.
    function bindTabClick(frm) {
        (frm.layout && frm.layout.tabs || []).forEach((t) => {
            if (t.df && t.df.fieldname === TAB && t.tab_link) {
                t.tab_link.off("click.hwf").on("click.hwf", () => {
                    if (frm._hwf_view) setTimeout(() => render(frm, frm._hwf_view), 50);
                });
            }
        });
    }

    // ── form hook ──
    frappe.ui.form.on("Job Applicant", {
        refresh(frm) {
            injectStyles();
            if (frm.is_new()) { hideTab(frm); return; }
            keepTabVisible(frm);   // show immediately, before the data round-trip
            ensureTabFirst(frm);
            bindTabClick(frm);
            frappe.call({
                method: API + ".get_workflow_view",
                args: { job_applicant: frm.doc.name },
                callback: (r) => render(frm, r && r.message),
            });
        },
    });
})();

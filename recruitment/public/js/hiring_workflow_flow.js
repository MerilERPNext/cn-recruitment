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
                if (t.df && t.df.fieldname === TAB) t.toggle(true);
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
        .hwf-strip{display:flex;align-items:stretch;gap:0;overflow-x:auto;padding:6px 2px 12px;}
        .hwf-node{display:flex;align-items:center;flex:0 0 auto;}
        .hwf-chip{position:relative;display:flex;flex-direction:column;gap:2px;min-width:118px;
            padding:9px 12px;border-radius:8px;border:1px solid var(--border-color);
            background:var(--fg-color,var(--card-bg));cursor:default;transition:box-shadow .15s,transform .15s;}
        .hwf-chip.clickable{cursor:pointer;}
        .hwf-chip.clickable:hover{box-shadow:0 2px 8px rgba(0,0,0,.12);transform:translateY(-1px);}
        .hwf-chip .hwf-top{display:flex;align-items:center;gap:7px;}
        .hwf-badge{width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;
            justify-content:center;font-size:12px;font-weight:700;color:#fff;flex:0 0 auto;}
        .hwf-name{font-weight:600;font-size:.83rem;line-height:1.15;color:var(--text-color);}
        .hwf-type{font-size:.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em;}
        .hwf-done  .hwf-badge{background:var(--green-500,#28a745);}
        .hwf-done  .hwf-chip,.hwf-node.hwf-done .hwf-chip{border-color:var(--green-300,#9ad5a8);}
        .hwf-current .hwf-badge{background:var(--blue-500,#2490ef);animation:hwf-pulse 1.6s infinite;}
        .hwf-current .hwf-chip{border-color:var(--blue-500,#2490ef);border-width:2px;
            box-shadow:0 0 0 3px var(--blue-100,rgba(36,144,239,.18));}
        .hwf-upcoming .hwf-badge{background:var(--gray-400,#b9c0c9);}
        .hwf-upcoming .hwf-chip{opacity:.75;}
        .hwf-rejected .hwf-badge{background:var(--red-500,#e24c4c);}
        .hwf-rejected .hwf-chip{border-color:var(--red-500,#e24c4c);}
        @keyframes hwf-pulse{0%{box-shadow:0 0 0 0 rgba(36,144,239,.45);}70%{box-shadow:0 0 0 6px rgba(36,144,239,0);}100%{box-shadow:0 0 0 0 rgba(36,144,239,0);}}
        .hwf-arrow{flex:0 0 auto;color:var(--text-muted);font-size:1.2rem;padding:0 6px;align-self:center;}
        .hwf-plus{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;
            border:none;background:var(--blue-500,#2490ef);color:#fff;font-size:15px;font-weight:700;
            line-height:1;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.25);}
        .hwf-plus:hover{background:var(--blue-600,#1479d6);}
        .hwf-panel{margin-top:4px;border:1px solid var(--border-color);border-radius:8px;
            padding:12px 14px;background:var(--subtle-fg,var(--control-bg));}
        .hwf-panel-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
        .hwf-panel-title{font-weight:600;font-size:.92rem;color:var(--text-color);}
        .hwf-actions{display:flex;flex-wrap:wrap;gap:8px;}
        .hwf-btn{border:1px solid var(--border-color);background:var(--fg-color,#fff);color:var(--text-color);
            padding:5px 12px;border-radius:6px;font-size:.82rem;cursor:pointer;transition:background .12s;}
        .hwf-btn:hover{background:var(--control-bg-on-gray,var(--bg-color));}
        .hwf-btn.primary{background:var(--blue-500,#2490ef);border-color:var(--blue-500,#2490ef);color:#fff;}
        .hwf-btn.primary:hover{background:var(--blue-600,#1479d6);}
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
        .hwf-banner{padding:9px 12px;border-radius:6px;font-size:.85rem;font-weight:500;}
        .hwf-banner.ok{background:var(--green-50,#eaf7ee);color:var(--green-700,#1e7a34);}
        .hwf-banner.bad{background:var(--red-50,#fdeaea);color:var(--red-700,#b02a2a);}
        .hwf-sub{margin-top:10px;font-size:.8rem;color:var(--text-muted);}
        .hwf-ivlist{margin-top:8px;border-top:1px dashed var(--border-color);padding-top:8px;}
        .hwf-ivrow{display:flex;align-items:center;gap:8px;font-size:.8rem;padding:3px 0;}
        .hwf-pill{font-size:.68rem;padding:1px 7px;border-radius:10px;font-weight:600;}
        .hwf-pill.Cleared,.hwf-pill.Approved{background:var(--green-100,#d3efd9);color:var(--green-700,#1e7a34);}
        .hwf-pill.Rejected{background:var(--red-100,#fbd8d8);color:var(--red-700,#b02a2a);}
        .hwf-pill.Pending,.hwf-pill.Sent,.hwf-pill.Filled,.hwf-pill.Reviewed,.hwf-pill.default{background:var(--gray-200,#e6e9ec);color:var(--gray-700,#4a5157);}
        .hwf-empty{padding:18px;text-align:center;color:var(--text-muted);font-size:.85rem;}
        .hwf-link{color:var(--blue-500,#2490ef);cursor:pointer;text-decoration:none;}
        .hwf-link:hover{text-decoration:underline;}
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

    function gotoPreOfferApprovalTab(frm) {
        const tabs = (frm.layout && frm.layout.tabs) || [];
        const tab = tabs.find((t) => t.df && t.df.fieldname === "custom_pre_offer_approval_tab");
        if (tab && tab.tab_link) tab.tab_link.find("a, button").first().trigger("click");
        else if (frm.scroll_to_field) frm.scroll_to_field("custom_pre_offer_approval_html");
    }

    function sendFeedbackForm(frm, stageName) {
        frappe.call({
            method: API + ".send_interview_feedback_form",
            args: { job_applicant: frm.doc.name, stage_name: stageName },
            freeze: true,
            freeze_message: __("Sending feedback request…"),
            callback: (r) => {
                const m = r && r.message;
                if (!m) return;
                const to = (m.sent_to || []).join(", ");
                frappe.show_alert({ message: __("Feedback form sent to {0}", [to || __("interviewers")]), indicator: "green" });
            },
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
                    d.job_applicant = m.job_applicant;
                    d.interview_round = m.interview_round;
                    if (m.designation) d.designation = m.designation;
                    if (m.job_opening) d.job_opening = m.job_opening;
                    frappe.set_route("Form", "Interview", d.name);
                });
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

    function createJobOffer(frm) {
        // Open a prefilled Job Offer form for review (don't create it silently) —
        // HR fills salary/terms and saves it themselves.
        frappe.model.with_doctype("Job Offer", () => {
            const d = frappe.model.get_new_doc("Job Offer");
            d.job_applicant = frm.doc.name;
            d.applicant_name = frm.doc.applicant_name;
            d.applicant_email = frm.doc.email_id;
            if (frm.doc.designation) d.designation = frm.doc.designation;
            if (frm.doc.custom_expected_doj) d.custom_expected_doj = frm.doc.custom_expected_doj;
            if (frm.doc.phone_number) d.custom_phone_number = frm.doc.phone_number;
            d.offer_date = frappe.datetime.get_today();
            frappe.set_route("Form", "Job Offer", d.name);
        });
    }

    // ── rendering ──────────────────────────────────────────────────────────
    function ratingStars(v) {
        const n = Math.round((v || 0) * 5);
        return n ? "★".repeat(n) + "☆".repeat(5 - n) : "";
    }

    function pill(text) {
        const cls = ["Cleared", "Approved", "Rejected", "Pending", "Sent", "Filled", "Reviewed"].includes(text) ? text : "default";
        return `<span class="hwf-pill ${cls}">${esc(text)}</span>`;
    }

    function renderPanel(frm, view) {
        const cur = (view.stages || [])[view.current_stage_index];
        if (view.is_closed) {
            const ok = view.status === "Accepted";
            return `<div class="hwf-panel"><div class="hwf-banner ${ok ? "ok" : "bad"}">
                ${ok ? "✓ " + __("Candidate has cleared the pipeline (Accepted).") : "✕ " + __("Candidate was rejected.")}
                </div></div>`;
        }
        if (!cur) {
            const first = (view.stages || [])[0];
            const startBtn = first
                ? `<div class="hwf-actions" style="justify-content:center;margin-top:8px;">
                     <button class="hwf-btn primary" data-start="${esc(first.stage_name)}">${__("Place on first stage")}: ${esc(first.stage_name)}</button>
                   </div>` : "";
            return `<div class="hwf-panel"><div class="hwf-empty" style="padding-bottom:4px;">${__("Candidate is not on any stage yet.")}</div>${startBtn}</div>`;
        }

        const type = cur.stage_type || "";
        let actions = "";
        if (type === "Screening") {
            actions += `<button class="hwf-btn primary" data-act="review" data-mode="Screening">${__("Screen")}</button>`;
            actions += `<button class="hwf-btn" data-act="screening">${__("Run Auto-Screening")}</button>`;
        } else if (type === "Shortlist") {
            actions += `<button class="hwf-btn primary" data-act="review" data-mode="Shortlist">${__("Shortlist")}</button>`;
        } else if (type === "Interview") {
            actions += `<button class="hwf-btn" data-act="interview">+ ${__("Schedule Interview")}</button>`;
            actions += `<button class="hwf-btn primary" data-act="markdone">${__("Mark as Completed")}</button>`;
            actions += `<span class="hwf-more-wrap">
                <button class="hwf-btn" data-act="more" title="${__("More")}">⋮</button>
                <div class="hwf-menu" style="display:none;">
                    <a data-menu="feedbackform">${__("Send Feedback Form")}</a>
                    <a data-menu="notreq" class="danger">${__("Mark as Not Required")}</a>
                </div>
            </span>`;
        } else if (type === "Pre Offer") {
            const po = view.pre_offer || {};
            const poLabel = po.sent ? __("Resend Pre Offer Form") : __("Send Pre Offer Form");
            actions += `<button class="hwf-btn primary" data-act="preoffer">+ ${poLabel}</button>`;
            actions += `<button class="hwf-btn" data-act="viewpreoffer">${__("View Pre Offer Form")}</button>`;
            if (!view.is_last) actions += `<button class="hwf-btn" data-act="complete">✓ ${__("Complete stage")}</button>`;
            actions += `<span class="hwf-more-wrap">
                <button class="hwf-btn" data-act="more" title="${__("More")}">⋮</button>
                <div class="hwf-menu" style="display:none;">
                    <a data-menu="notreq" class="danger">${__("Mark as Not Required")}</a>
                </div>
            </span>`;
        } else if (type === "Offer") {
            actions += view.job_offer
                ? `<button class="hwf-btn" data-act="openoffer">${__("Open Job Offer")}</button>`
                : `<button class="hwf-btn primary" data-act="createoffer">+ ${__("Create Job Offer")}</button>`;
        } else if (!view.is_last) {
            actions += `<button class="hwf-btn primary" data-act="complete">✓ ${__("Complete stage")}</button>`;
        }
        actions += `<button class="hwf-btn danger" data-act="reject">✕ ${__("Reject")}</button>`;

        // context detail for the current stage
        let detail = "";
        if (type === "Interview" && (cur.interviews || []).length) {
            detail = `<div class="hwf-ivlist">` + cur.interviews.map((iv) =>
                `<div class="hwf-ivrow">
                    <a class="hwf-link" data-open-iv="${esc(iv.name)}">${esc(iv.name)}</a>
                    ${pill(iv.status || "Pending")}
                    <span>${ratingStars(iv.average_rating)}</span>
                    <span class="text-muted">${iv.scheduled_on ? esc(frappe.datetime.str_to_user(iv.scheduled_on)) : ""}</span>
                </div>`).join("") + `</div>`;
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
            const bit = view.job_offer
                ? __("Job Offer") + ": " + pill(view.job_offer.status || "Open")
                : __("No Job Offer created yet.");
            detail = `<div class="hwf-sub">${bit}</div>`;
        }

        return `<div class="hwf-panel">
            <div class="hwf-panel-head">
                <span class="hwf-panel-title">${__("Current stage")}: ${esc(cur.stage_name || "")}</span>
                <span class="hwf-type">${esc(type)}</span>
            </div>
            <div class="hwf-actions">${actions}</div>
            ${detail}
        </div>`;
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
        const strip = stages.map((s, i) => {
            const st = STATE[s.state] || STATE.upcoming;
            const isCurrent = s.state === "current";
            // Forward-only: only upcoming stages are jump targets — a completed
            // or the current stage can't be revisited.
            const clickable = !closed && s.state === "upcoming";
            // "+" appears on the current stage for actionable types
            let plus = "";
            if (isCurrent && !closed) {
                if (s.stage_type === "Interview") plus = `<button class="hwf-plus" data-plus="interview" data-stage="${esc(s.stage_name)}" title="${__("Schedule Interview")}">+</button>`;
                else if (s.stage_type === "Screening" || s.stage_type === "Shortlist") plus = `<button class="hwf-plus" data-plus="review" data-mode="${esc(s.stage_type)}" title="${esc(s.stage_type)}">+</button>`;
                else if (s.stage_type === "Pre Offer") plus = `<button class="hwf-plus" data-plus="preoffer" title="${__("Send Pre Offer Form")}">+</button>`;
                else if (s.stage_type === "Offer") plus = `<button class="hwf-plus" data-plus="offer" title="${__("Create Job Offer")}">+</button>`;
            }
            const arrow = i < stages.length - 1 ? `<span class="hwf-arrow">▸</span>` : "";
            return `<div class="hwf-node ${st.cls}">
                <div class="hwf-chip ${clickable ? "clickable" : ""}" ${clickable ? `data-jump="${esc(s.stage_name)}"` : ""}>
                    ${plus}
                    <div class="hwf-top">
                        <span class="hwf-badge">${st.icon}</span>
                        <span class="hwf-name">${esc(s.stage_name || "")}</span>
                    </div>
                    <span class="hwf-type">${esc(s.stage_type || "")}</span>
                </div>
                ${arrow}
            </div>`;
        }).join("");

        $w.html(`<div class="hwf-wrap"><div class="hwf-strip">${strip}</div>${renderPanel(frm, view)}</div>`);

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
        $w.find('[data-plus="interview"]').on("click", function (e) {
            e.stopPropagation(); scheduleInterview(frm, $(this).data("stage"));
        });
        $w.find('[data-plus="review"]').on("click", function (e) {
            e.stopPropagation(); openReviewDialog(frm, $(this).data("mode"));
        });
        $w.find('[data-plus="preoffer"]').on("click", function (e) {
            e.stopPropagation(); sendPreOffer(frm);
        });
        $w.find('[data-plus="offer"]').on("click", function (e) {
            e.stopPropagation();
            if (view.job_offer) frappe.set_route("Form", "Job Offer", view.job_offer.name);
            else createJobOffer(frm);
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
            else if (act === "markdone") openInterviewDialog(frm, view);
            else if (act === "review") openReviewDialog(frm, $(this).data("mode"));
            else if (act === "screening") runScreening(frm);
            else if (act === "preoffer") sendPreOffer(frm);
            else if (act === "viewpreoffer") gotoPreOfferApprovalTab(frm);
            else if (act === "createoffer") createJobOffer(frm);
            else if (act === "openoffer") frappe.set_route("Form", "Job Offer", view.job_offer.name);
            else if (act === "reject") rejectCandidate(frm);
        });
        $w.find(".hwf-menu a").on("click", function () {
            const item = $(this).data("menu");
            $w.find(".hwf-menu").hide();
            if (item === "notreq") markNotRequired(frm, view.current_stage);
            else if (item === "feedbackform") sendFeedbackForm(frm, view.current_stage);
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
            title: `${mode} — ${frm.doc.applicant_name || frm.doc.name}`,
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
            if (frm.is_new()) return;
            keepTabVisible(frm);   // show immediately, before the data round-trip
            bindTabClick(frm);
            frappe.call({
                method: API + ".get_workflow_view",
                args: { job_applicant: frm.doc.name },
                callback: (r) => render(frm, r && r.message),
            });
        },
    });
})();

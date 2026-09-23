frappe.ui.form.on("Job Applicant", {
  make_dashboard: function (frm) {
    frappe.call({
        method: "hrms.hr.doctype.job_applicant.job_applicant.get_interview_details",
        args: {
            job_applicant: frm.doc.name,
        },
        callback: function (r) {
            if (r.message) {
                let data = r.message.interviews;
                let number_of_stars = r.message.stars;

                if (Object.keys(data).length > 0) {
                    let table = `
                        <table class="table table-bordered small">
                            <thead>
                                <tr>
                                    <th style="width: 14%" class="text-left">Interview</th>
                                    <th style="width: 16%" class="text-left">Interview Round</th>
                                    <th style="width: 12%" class="text-left">Date</th>
                                    <th style="width: 12%" class="text-left">Status</th>
                                    <th style="width: 14%" class="text-left">Rating</th>
                                    <th style="width: 12%" class="text-left"></th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    for (const [key, value] of Object.entries(data)) {
                        let row = `
                            <tr>
                                <td class="text-left">${key}</td>
                                <td class="text-left">${value["interview_type"] || value["interview_round"] || '-'}</td>
                                <td class="text-left">${frappe.datetime.str_to_user(value["scheduled_on"])}</td>
                                <td class="text-left">${value["status"]}</td>
                                <td class="text-left">
                                    <div class="rating">
                        `;

                        for (let i = 1; i <= number_of_stars; i++) {
                            let right_class = i <= value["average_rating"] ? 'star-click' : '';
                            let left_class = (i <= value["average_rating"]) || ((i - 0.5) == value["average_rating"]) ? 'star-click' : '';

                            row += `
                                <svg class="icon icon-md" data-rating="${i}" viewBox="0 0 24 24" fill="none">
                                    <path class="right-half ${right_class}" d="M11.9987 3.00011C12.177 3.00011 12.3554 3.09303 12.4471 3.27888L14.8213 8.09112C14.8941 8.23872 15.0349 8.34102 15.1978 8.3647L20.5069 9.13641C20.917 9.19602 21.0807 9.69992 20.7841 9.9892L16.9421 13.7354C16.8243 13.8503 16.7706 14.0157 16.7984 14.1779L17.7053 19.4674C17.7753 19.8759 17.3466 20.1874 16.9798 19.9945L12.2314 17.4973C12.1586 17.459 12.0786 17.4398 11.9987 17.4398V3.00011Z" fill="var(--star-fill)" stroke="var(--star-fill)"/>
                                    <path class="left-half ${left_class}" d="M11.9987 3.00011C11.8207 3.00011 11.6428 3.09261 11.5509 3.27762L9.15562 8.09836C9.08253 8.24546 8.94185 8.34728 8.77927 8.37075L3.42887 9.14298C3.01771 9.20233 2.85405 9.70811 3.1525 9.99707L7.01978 13.7414C7.13858 13.8564 7.19283 14.0228 7.16469 14.1857L6.25116 19.4762C6.18071 19.8842 6.6083 20.1961 6.97531 20.0045L11.7672 17.5022C11.8397 17.4643 11.9192 17.4454 11.9987 17.4454V3.00011Z" fill="var(--star-fill)" stroke="var(--star-fill)"/>
                                </svg>
                            `;
                        }

                        row += `
                                    </div>
                                </td>
                                <td class="text-left">
                                    <button class="btn btn-primary btn-sm" data-interview="${key}">Details</button>
                                </td>
                            </tr>
                        `;
                        table += row;
                    }

                    table += `
                            </tbody>
                        </table>
                    `;

                    if (frm.fields_dict.custom_interview_feedback) {
                        $(frm.fields_dict.custom_interview_feedback.wrapper).html(table);

                        // Attach click event to buttons
                        $(frm.fields_dict.custom_interview_feedback.wrapper).find('button').on('click', function () {
                            let interview_id = $(this).data('interview');
                            show_feedback(interview_id);
                        });
                    }

                } else {
                    if (frm.fields_dict.custom_interview_feedback) {
                        $(frm.fields_dict.custom_interview_feedback.wrapper).html('<p style="margin-top: 30px;">No Interview has been scheduled.</p>');
                    }
                }
            }
        },
    });

    function show_feedback(interview_id) {
      frappe.call({
          method: "recruitment.customizations.interview.interview.get_interview_feedback_records",
          args: {
              interview_id: interview_id,
          },
          callback: function (r) {
              if (r.message && r.message.length > 0) {
                  let feedback_table = `
                      <table class="table table-bordered small" style="margin-top: 20px; width: 100%;">
                          <thead>
                              <tr>
                                  <th style="width: 20%; text-align: left;">Interviewer</th>
                                  <th style="width: 60%; text-align: left;">Feedback</th>
                                  <th style="width: 20%; text-align: left;">Status</th>
                                  <th style="width: 20%; text-align: left;">Creation Time</th>
                              </tr>
                          </thead>
                          <tbody>
                  `;
                  
                  r.message.forEach(feedback => {
                      feedback_table += `
                          <tr>
                              <td style="text-align: left;">${feedback.interviewer}</td>
                              <td style="text-align: left;">${feedback.feedback}</td>
                              <td style="text-align: left;">${feedback.result}</td> 
                              <td style="text-align: left;">${feedback.creation !== "N/A" ? frappe.datetime.str_to_user(feedback.creation) : "N/A"}</td>
                          </tr>
                      `;
                  });
                  
                  feedback_table += `
                          </tbody>
                      </table>
                  `;
                  
                  const dialog = new frappe.ui.Dialog({
                      title: `Feedback for Interview: ${interview_id}`,
                      size: 'large',
                      fields: [
                          {
                              fieldtype: 'HTML',
                              fieldname: 'feedback_table',
                              options: feedback_table
                          }
                      ]
                  });
                  
                  dialog.show();
              } else {
                  frappe.msgprint({
                      title: `Feedback for Interview: ${interview_id}`,
                      message: '<p>No feedback available for this interview.</p>',
                  });
              }
          },
      });
  }
  
  
},
});
// The name lives on the Job Applicant in parts — applicant_name is the FIRST name
// and nothing else — and `custom_full_name` is derived from them on every save. The
// banner shows the whole name, so it reads that field and only falls back to joining
// the parts for a record saved before the derived field shipped.
function applicant_full_name(doc) {
  if (doc.custom_full_name) return doc.custom_full_name;
  const seen = new Set();
  const parts = [];
  [doc.applicant_name, doc.custom_applicant_middle_name, doc.custom_applicant_last_name]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .forEach((part) => {
      const words = part.toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length && words.every((w) => seen.has(w))) return;   // never twice
      words.forEach((w) => seen.add(w));
      parts.push(part);
    });
  return parts.join(' ');
}

function applicant_details(frm) {
  frappe.require('recruitment.recruitment.public.css.job_applicant.css'); 
  let job_applicant_html = `
  <div class="section-heading">APPLICANT INFORMATION</div>
<table class="custom-table">
    <tr>
        <th>Applicant Name</th>
        <td>${applicant_full_name(frm.doc) || '-'}</td>
        <th>Email ID</th>
        <td>${frm.doc.email_id || '-'}</td>
    </tr>
    <tr>
        <th>Phone Number</th>
        <td>${frm.doc.phone_number || '-'}</td>
        <th>Country</th>
        <td>${frm.doc.country || '-'}</td>
    </tr>
    <tr>
        <th>Job Title</th>
        <td>${frm.doc.job_title || '-'}</td>
        <th>Designation</th>
        <td>${frm.doc.designation || '-'}</td>
    </tr>
    <tr>
        <th>Status</th>
        <td>${frm.doc.status || '-'}</td>
        <th>Shortlisted by Hiring Manager</th>
        <td>${frm.doc.custom_shortlisted_by_hiring_manager || '-'}</td>
    </tr>
    <tr>
        <th>Expected Date of Joining</th>
        <td>${frm.doc.custom_expected_doj || '-'}</td>
        <th>Approval Pending from Management</th>
        <td><input type="checkbox" ${frm.doc.custom_approval_pending_from_management ? 'checked' : ''} disabled class="checkbox-disabled"></td>
    </tr>
    <tr>
        <th>Current Salary CTC</th>
        <td>${frm.doc.custom_current_salaryctc || '-'}</td>
        <th>CTC Finalized</th>
        <td>${frm.doc.custom_ctc_finalized || '-'}</td>
    </tr>
</table>

  <div class="section-heading">SOURCE AND RATING</div>
  <table class="custom-table">
      <tr>
          <th class="bold">Source</th>
          <td>${frm.doc.source || '-'}</td>
          <th class="bold">Source Name</th>
          <td>${frm.doc.source_name || '-'}</td>
      </tr>
      <tr>
          <th class="bold">Employee Referral</th>
          <td>${frm.doc.employee_referral || '-'}</td>
          <th class="bold">Applicant Rating</th>
          <td>${frm.doc.applicant_rating || '-'}</td>
      </tr>
      <tr>
          <th class="bold">Resume Attachment</th>
          <td>${frm.doc.resume_attachment ? `<a href="${frm.doc.resume_attachment}" target="_blank">Download</a>` : '-'}</td>
          <th class="bold">Resume Link</th>
          <td>${frm.doc.resume_link || '-'}</td>
      </tr>
  </table>
  `;

  // Fetch Interview Details
  //
  // `interview_round` is asked for only when this HRMS version has it: v16
  // renamed it to `interview_type`, and frappe.client.get_list THROWS on a field
  // the doctype lacks rather than skipping it, which failed this whole panel.
  // See interview_feedback.js -> interviewFieldsOnThisSite for the detail.
  frappe.call({
      method: 'frappe.client.get_list',
      args: {
          doctype: 'Interview',
          filters: {
              job_applicant: frm.doc.name
          },
          fields: [
              'custom_interview_type',
              ...(frappe.meta.has_field('Interview', 'interview_round') ? ['interview_round'] : []),
              ...(frappe.meta.has_field('Interview', 'interview_type') ? ['interview_type'] : []),
              'job_applicant',
              'status',
              'scheduled_on',
              'from_time',
              'to_time',
              'custom_interview_location',
              'custom_zoom_link',
              'custom_zoom_password'
          ]
      },
      callback: function(response) {
          if (response.message && response.message.length > 0) {
              let interviews = response.message;
              let interview_html = `<div class="section-heading">INTERVIEW DETAILS</div>`;

              interviews.forEach(function(interview) {
                  interview_html += `
                  <table class="custom-table">
                      <tr>
                          <th class="bold">Interview Type</th>
                          <td>${interview.custom_interview_type || '-'}</td>
                          <th class="bold">Interview Round</th>
                          <td>${interview.interview_type || interview.interview_round || '-'}</td>
                      </tr>
                      <tr>
                          <th class="bold">Job Applicant</th>
                          <td>${interview.job_applicant || '-'}</td>
                      </tr>
                      <tr>
                          <th class="bold">Status</th>
                          <td>${interview.status || '-'}</td>
                          <th class="bold">Scheduled On</th>
                          <td>${interview.scheduled_on || '-'}</td>
                      </tr>
                      <tr>
                          <th class="bold">From Time</th>
                          <td>${interview.from_time || '-'}</td>
                          <th class="bold">To Time</th>
                          <td>${interview.to_time || '-'}</td>
                      </tr>
                      <tr>
                          <th class="bold">Interview Location</th>
                          <td>${interview.custom_interview_location || '-'}</td>
                          <th class="bold">Zoom Link</th>
                          <td>${interview.custom_zoom_link || '-'}</td>
                      </tr>
                      <tr>
                          <th class="bold">Zoom Password</th>
                          <td>${interview.custom_zoom_password || '-'}</td>
                          <td colspan="2"></td>
                      </tr>
                  </table>
                  `;
              });

              job_applicant_html += interview_html;
          } else {
              job_applicant_html += `
              <div class="section-heading">INTERVIEW DETAILS</div>
              <table class="custom-table">
                  <tr>
                      <td colspan="4">No interview details available.</td>
                  </tr>
              </table>
              `;
          }

          // Fetch Interview Feedback
          frappe.call({
              method: 'frappe.client.get_list',
              args: {
                  doctype: 'Interview Feedback',
                  filters: {
                      job_applicant: frm.doc.name
                  },
                  fields: [
                      'interview',
                      // Same version split as above — ask only for what exists.
                      ...(frappe.meta.has_field('Interview Feedback', 'interview_round') ? ['interview_round'] : []),
                      ...(frappe.meta.has_field('Interview Feedback', 'interview_type') ? ['interview_type'] : []),
                      'job_applicant',
                      'interviewer',
                      'result',
                      'feedback'
                  ]
              },
              callback: function(response) {
                  if (response.message && response.message.length > 0) {
                      let feedbacks = response.message;
                      let feedback_html = `<div class="section-heading">INTERVIEW FEEDBACK</div>`;

                      feedbacks.forEach(function(feedback) {
                          feedback_html += `
                          <table class="custom-table">
                              <tr>
                                  <th class="bold">Interview</th>
                                  <td>${feedback.interview || '-'}</td>
                                  <th class="bold">Interview Round</th>
                                  <td>${feedback.interview_type || feedback.interview_round || '-'}</td>
                              </tr>
                              <tr>
                                  <th class="bold">Job Applicant</th>
                                  <td>${feedback.job_applicant || '-'}</td>
                                  <th class="bold">Interviewer</th>
                                  <td>${feedback.interviewer || '-'}</td>
                              </tr>
                              <tr>
                                  <th class="bold">Result</th>
                                  <td>${feedback.result || '-'}</td>
                                  <th class="bold">Feedback</th>
                                  <td>${feedback.feedback || '-'}</td>
                              </tr>
                          </table>
                          `;
                      });

                      job_applicant_html += feedback_html;
                  } else {
                      job_applicant_html += `
                      <div class="section-heading">INTERVIEW FEEDBACK</div>
                      <table class="custom-table">
                          <tr>
                              <td colspan="4">No interview feedback available.</td>
                          </tr>
                      </table>
                      `;
                  }

                  // ✅ Inject tab3 route switcher here
                  job_applicant_html += `
                  <script>
                      (function() {
                          const route = window.location.pathname.split('/');
                          if (route.includes('tab3')) {
                              setTimeout(function() {
                                  const tabLinks = document.querySelectorAll('.form-tabs .nav-link');
                                  for (let link of tabLinks) {
                                      if (link.textContent.trim() === "Tab 3") {
                                          link.click();
                                          break;
                                      }
                                  }
                              }, 300);
                          }
                      })();
                  </script>
                  `;

                  // Finally set the HTML content
                  if (frm.fields_dict.custom_custom_table) {
                      frm.fields_dict.custom_custom_table.$wrapper.html(job_applicant_html);
                  }
              }
          });
      }
  });
}
frappe.ui.form.on("Job Applicant Notes", {
  custom_notes_add: function (frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    child.added_by = frappe.session.user;
    child.added_on = new Date();
    cur_frm.refresh_field("custom_notes");
  },
});


frappe.ui.form.on("Job Applicant", {
  custom_job_requisition: function(frm) {
      if (frm.doc.custom_job_requisition) {
          frappe.call({
              method: "recruitment.auto_fetch_fields.job_requisition_fields",
              args: {
                  job_requisition: frm.doc.custom_job_requisition  
              },
              callback: function(r) {
                  if (r.message) {
                      $.each(r.message, function(field, value) {
                          frm.set_value(field, value);
                      });
                  }
              }
          });
      }
  }
});

frappe.ui.form.on('Job Applicant', {
    status: function(frm) {

        if (!frm.doc.status) return;

        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Sub Status",
                filters: { "parent_status": frm.doc.status },
                fieldname: ["sub_status"]
            },
            callback: function(r) {
                let options = [];
                let description = "";

                if (r.message && r.message.sub_status) {
                    options = r.message.sub_status.split('\n');
                }

                if (options.length === 0) {
                    description = "No sub-status available for this status. Please update the Sub Status master.";
                }

                frm.set_df_property('custom_substatus', 'options', options);
                frm.set_df_property('custom_substatus', 'description', description);
                frm.refresh_field('custom_substatus');
            }
        });
    },

    onload: function(frm) {
        if (frm.doc.status) {
            frm.trigger('status');
        }
    }
});


// NOTE: The "Send Pre Offer Form" action now lives inline on the Offer stage of
// the visual hiring-workflow flow (hiring_workflow_flow.js → sendPreOffer), so the
// standalone top button was removed to avoid a duplicate control.


frappe.ui.form.on('Job Applicant', {
    refresh(frm) {
        if (frm.doc.__islocal || frm.doc.status !== 'Accepted') return;

        // Gated by Recruitment Settings -> Enable Pre Onboarding Form Button.
        frappe.db.get_single_value('Recruitment Settings', 'enable_pre_onboarding_form').then((enabled) => {
            if (!enabled) return;
            const label = frm.doc.custom_pre_onboarding_status === 'Released'
                ? __('Update Pre Onboarding Release')
                : __('Send Pre Onboarding Form');

            frm.add_custom_button(label, () => {
                recruitment.open_pre_onboarding_dialog(frm.doc.name, frm.doc, () => frm.reload_doc());
            }, __('Actions'));
        });
    }
});


frappe.ui.form.on('Job Applicant', {
    refresh(frm) {
        if (frm.doc.__islocal || frm.doc.status !== 'Accepted') return;

        // Gated by Recruitment Settings -> Enable Initiate Onboarding Button.
        frappe.db.get_single_value('Recruitment Settings', 'enable_initiate_onboarding').then((enabled) => {
            if (!enabled) return;

            frm.add_custom_button(__('Initiate Onboarding'), () => {
                frappe.confirm(
                    __('Create the Employee Onboarding for this candidate? Buddies, Recruiter, Onboarding SPOC and the default Onboarding Portal Form will be auto-filled.'),
                    () => {
                        frappe.call({
                            method: 'recruitment.api.action_center.initiate_onboarding',
                            args: { job_applicant: frm.doc.name },
                            freeze: true,
                            freeze_message: __('Initiating onboarding...'),
                            callback(r) {
                                const eo = r.message && r.message.employee_onboarding;
                                if (!eo) return;
                                const msg = r.message.already_existed
                                    ? __('Employee Onboarding already exists — opening it.')
                                    : __('Employee Onboarding created.');
                                frappe.show_alert({ message: msg, indicator: 'green' });
                                frappe.set_route('Form', 'Employee Onboarding', eo);
                            },
                        });
                    }
                );
            }, __('Actions'));
        });
    }
});


window.recruitment = window.recruitment || {};

recruitment.open_pre_onboarding_dialog = function (job_applicant_id, prefill_doc, on_success) {
    const prefill = prefill_doc || {};
    const dlg = new frappe.ui.Dialog({
        title: __('Send Pre Onboarding Form'),
        fields: [
            {
                fieldname: 'onboarding_portal_form',
                fieldtype: 'Link',
                label: __('Onboarding Portal Form'),
                options: 'Onboarding Portal Forms',
                reqd: 1,
                default: prefill.custom_onboarding_portal_form || ''
            },
            {
                fieldname: 'bgv_vendor',
                fieldtype: 'Link',
                label: __('BGV Vendor'),
                options: 'Supplier',
                default: prefill.custom_bgv_vendor || ''
            },
            { fieldtype: 'Section Break', label: __('Contacts') },
            {
                fieldname: 'onboarding_buddy',
                fieldtype: 'Link',
                label: __('Onboarding Buddy'),
                options: 'User',
                default: prefill.custom_onboarding_buddy || ''
            },
            {
                fieldname: 'joining_buddy',
                fieldtype: 'Link',
                label: __('Joining Buddy'),
                options: 'User',
                default: prefill.custom_joining_buddy || ''
            },
            { fieldtype: 'Column Break' },
            {
                fieldname: 'manager',
                fieldtype: 'Link',
                label: __('Manager'),
                options: 'User',
                default: prefill.custom_manager || ''
            }
        ],
        primary_action_label: __('Release'),
        primary_action(values) {
            frappe.call({
                method: 'recruitment.api.action_center.release_pre_onboarding',
                args: { job_applicant_id, data: values },
                freeze: true,
                freeze_message: __('Releasing pre onboarding...'),
                callback: (r) => {
                    if (r.message && r.message.status === 'success') {
                        frappe.show_alert({ message: r.message.message || __('Released.'), indicator: 'green' });
                        dlg.hide();
                        if (typeof on_success === 'function') on_success();
                    }
                }
            });
        }
    });

    if (!prefill.custom_onboarding_buddy && !prefill.custom_joining_buddy && !prefill.custom_manager) {
        frappe.call({
            method: 'recruitment.api.action_center.get_pre_onboarding_buddy_suggestions',
            args: { job_applicant_id },
            callback: (r) => {
                const s = (r.message && r.message.suggestions) || {};
                if (s.onboarding_buddy) dlg.set_value('onboarding_buddy', s.onboarding_buddy);
                if (s.joining_buddy) dlg.set_value('joining_buddy', s.joining_buddy);
                if (s.manager) dlg.set_value('manager', s.manager);
            }
        });
    }

    dlg.show();
};

// --- Resend Job Offer -------------------------------------------------------
// Once the candidate's newest offer is accepted, withdrawn, rejected or
// cancelled, raise the next version from here too — not only from the hiring
// workflow's Offer stage, which is absent when the workflow is off or the
// candidate is on another stage. Whether it is allowed is decided server-side
// (offer_lifecycle.get_offer_actions).
frappe.ui.form.on("Job Applicant", {
    refresh(frm) {
        if (frm.is_new()) return;
        const applicant = frm.doc.name;
        frappe.call({
            method: "recruitment.api.offer_lifecycle.get_applicant_offer_actions",
            args: { job_applicant: applicant },
            callback: (r) => {
                // The user may have moved to another applicant while this loaded.
                if (frm.doc.name !== applicant) return;
                const a = r && r.message;
                if (!(a && a.resend && a.resend.allowed)) return;
                const accepted = a.status === "Accepted" && a.docstatus !== 2;
                const btn = frm.add_custom_button(__("Resend Job Offer"), () => {
                    frappe.confirm(
                        applicant_resend_confirm_message(a, accepted),
                        () => {
                            frappe.call({
                                method: "recruitment.api.offer_lifecycle.resend_job_offer",
                                args: { job_offer: a.job_offer },
                                freeze: true,
                                freeze_message: __("Creating new version…"),
                                callback: (res) => {
                                    const m = (res && res.message) || {};
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
                }, __("Actions"));
                // Revising an accepted offer undoes onboarding — offered, not pushed.
                if (accepted) btn.removeClass("btn-primary");
            },
        });
    },
});

// Same wording as job_offer.js resend_confirm_message (the two scripts load on
// different forms): an accepted offer says what resending removes.
function applicant_resend_confirm_message(a, accepted) {
    const next = (a.version || 1) + 1;
    const esc = frappe.utils.escape_html;
    if (!accepted) {
        return __("Create version {0} of {1} as a new Draft? You can edit it, then submit and send it.", [
            next, esc(a.job_offer),
        ]);
    }
    const eos = ((a.resend && a.resend.removes_onboarding) || []).map((e) => esc(e.name));
    return __("The candidate has already accepted {0}. Resending will:", [esc(a.job_offer)])
        + "<ul>"
        + (eos.length
            ? "<li>" + __("delete their pending onboarding ({0}), including any details they have filled in on the onboarding form, and remove it from their portal", [eos.join(", ")]) + "</li>"
            : "")
        + "<li>" + __("cancel the accepted offer and free its position") + "</li>"
        + "<li>" + __("create version {0} as a new Draft for you to edit, submit and send", [next]) + "</li>"
        + "</ul>" + __("Continue?");
}

// --- Auto-screening: manual "Run Screening" trigger -------------------------
frappe.ui.form.on("Job Applicant", {
    refresh(frm) {
        if (frm.is_new()) return;

        frm.add_custom_button(__("Run Screening"), () => {
            frappe.call({
                method: "recruitment.recruitment.screening_engine.run_screening",
                args: { applicant: frm.doc.name },
                freeze: true,
                freeze_message: __("Queuing screening…"),
                callback: (r) => {
                    const msg = r.message || {};
                    if (msg.enqueued) {
                        frappe.show_alert({
                            message: __("Screening started — the result will update shortly."),
                            indicator: "blue",
                        });
                    } else {
                        frappe.msgprint(__("This opening has no screening conditions configured."));
                    }
                },
            });
        }, __("Actions"));
    },
});

// Live-refresh the form when the background worker finishes.
frappe.realtime.on("screening_done", (data) => {
    const frm = cur_frm;
    if (frm && frm.doc && frm.doctype === "Job Applicant" && frm.doc.name === data.applicant) {
        frm.reload_doc();
    }
});

/* ------------------------------------------------------------------ *
 * Hiring Workflow — drive a candidate through the Job Opening's
 * hiring stages (custom_hiring_stages). Server: recruitment.api.hiring_stage
 * ------------------------------------------------------------------ */
(function () {
    // The stage controls (Move / Jump / Schedule Interview / Reject) now live in
    // the visual hiring-workflow flow (hiring_workflow_flow.js). Here we only keep
    // a lightweight dashboard indicator showing the current stage at a glance.
    const API = "recruitment.api.hiring_stage";

    frappe.ui.form.on("Job Applicant", {
        refresh(frm) {
            if (frm.is_new()) return;
            frappe.call({
                method: API + ".get_stage_options",
                args: { job_applicant: frm.doc.name },
                callback: (r) => {
                    const info = r && r.message;
                    if (!(info && info.enabled && info.current_stage)) return;
                    const closed = ["Rejected", "Accepted"].includes(frm.doc.status);
                    frm.dashboard.add_indicator(__("Stage: {0}", [info.current_stage]), closed ? "gray" : "blue");
                },
            });
        },
    });
})();

// --- Interview region: HR decides where a candidate is interviewed -----------
// A panel can suggest another region while giving feedback, but it never moves the
// candidate — it raises a Pending flag. Everything that actually changes the region
// goes through recruitment.api.candidate_region so each change carries a reason.
(function () {
    const API = "recruitment.api.candidate_region";

    // Region routing only exists for campus hiring — it picks a Campus Drive Round
    // panel. Showing these controls on a lateral or referral candidate would offer
    // an action that can never do anything, so gate the whole block.
    //
    // Checked by campus linkage AND source, not source alone: campus candidates
    // created outside the portal flow (drive imports, seeding) carry the invite but
    // may have no source stamped.
    function isCampusCandidate(doc) {
        return Boolean(doc.custom_campus_invite || doc.custom_campus_drive ||
                       doc.custom_institute || doc.source === "Campus Hiring");
    }

    // "Rajasthan (REGION_16)" — the bare ID means nothing to a recruiter, but the
    // ID still has to be there because that is what reports and filters key on.
    function regionLabel(region) {
        if (!region) return Promise.resolve("");
        return frappe.db.get_value("Region", region, "location_region").then((r) => {
            const name = (r && r.message && r.message.location_region) || "";
            return name ? `${name} (${region})` : region;
        });
    }

    function reasonDialog({ title, primary, withRegion, currentRegion, onSubmit }) {
        const fields = [];
        if (withRegion) {
            fields.push({
                fieldname: "region", label: __("Interview Region"), fieldtype: "Link",
                options: "Region", default: currentRegion || "",
                description: __("Leave blank to send the candidate back to the region they applied under."),
            });
        }
        fields.push({
            fieldname: "reason", label: __("Reason"), fieldtype: "Small Text",
            description: __("Recorded on the candidate's timeline."),
        });
        const d = new frappe.ui.Dialog({
            title, fields, primary_action_label: primary,
            primary_action(v) { d.hide(); onSubmit(v); },
        });
        d.show();
    }

    function call(method, args, frm, message) {
        frappe.call({
            method: `${API}.${method}`, args, freeze: true,
            freeze_message: __("Updating…"),
            callback: () => {
                frappe.show_alert({ message, indicator: "green" });
                frm.reload_doc();
            },
        });
    }

    frappe.ui.form.on("Job Applicant", {
        refresh(frm) {
            if (frm.is_new()) return;
            const doc = frm.doc;
            if (!isCampusCandidate(doc)) return;

            // A pending suggestion is the one thing HR must not miss, so it gets a
            // dashboard banner rather than only a button tucked under a menu.
            if (doc.custom_region_suggestion_status === "Pending" && doc.custom_suggested_region) {
                const who = doc.custom_region_suggested_by || __("an interviewer");
                const why = doc.custom_region_suggestion_reason
                    ? `<br><i>${frappe.utils.escape_html(doc.custom_region_suggestion_reason)}</i>`
                    : "";
                regionLabel(doc.custom_suggested_region).then((label) => {
                    frm.dashboard.clear_headline();
                    frm.dashboard.set_headline(
                        __("Interview panel suggested region <b>{0}</b> ({1}). The candidate has not been moved.", [
                            frappe.utils.escape_html(label), frappe.utils.escape_html(who),
                        ]) + why,
                        "orange"
                    );
                });

                frm.add_custom_button(__("Accept Region Suggestion"), () => {
                    reasonDialog({
                        title: __("Accept region suggestion"),
                        primary: __("Accept & Move"),
                        onSubmit: (v) => call("accept_region_suggestion",
                            { job_applicant: doc.name, reason: v.reason }, frm,
                            __("Interview region updated.")),
                    });
                }, __("Region"));

                frm.add_custom_button(__("Dismiss Suggestion"), () => {
                    reasonDialog({
                        title: __("Dismiss region suggestion"),
                        primary: __("Dismiss"),
                        onSubmit: (v) => call("dismiss_region_suggestion",
                            { job_applicant: doc.name, reason: v.reason }, frm,
                            __("Suggestion dismissed — candidate unchanged.")),
                    });
                }, __("Region"));
            }

            // Always available on a campus candidate: their own request for another
            // region, or HR overriding an earlier decision.
            frm.add_custom_button(__("Change Interview Region"), () => {
                reasonDialog({
                    title: __("Change interview region"),
                    primary: __("Update"),
                    withRegion: true,
                    currentRegion: doc.custom_interview_region,
                    onSubmit: (v) => call("set_interview_region",
                        { job_applicant: doc.name, region: v.region, reason: v.reason }, frm,
                        v.region ? __("Interview region updated.")
                                 : __("Interview region cleared.")),
                });
            }, __("Region"));
        },
    });
})();

frappe.ui.form.on("Job Applicant", {
    refresh(frm) {

        if (!frm.doc.email_id) return;

        frm.add_custom_button(__('Send Onboarding Form'), function () {

            frappe.call({
                method: "recruitment.job_offer_utils.send_onboarding_form",
                args: {
                    job_applicant: frm.doc.name
                },
                callback: function(r) {
                    if (!r.exc) {
                        frappe.msgprint("Onboarding email sent successfully");
                    }
                }
            });

        });

    }
});


frappe.ui.form.on("Job Applicant", {
  refresh: function (frm) {
    // frm.events.create_custom_buttons(frm);
    // frm.remove_custom_button('Interview', 'Create');
    // if (!frm.doc.__islocal && frm.doc.status !== "Rejected" && frm.doc.status !== "Accepted") {
    //   frm.add_custom_button(
    //     __("Interview"),
    //     function () {
    //       frappe.call({
    //         method:"recruitment.customizations.job_applicant.validate_applicant",
    //         args:{
    //           "job_applicant":frm.doc.name
    //         },
    //         callback:function(r){ 
    //           console.log("message:",r.message)
    //           if(r.message){
    //             let links_text = "";
    //           links_text=`<a href="/app/job-applicant/${r.message[0]}">${r.message[0]}</a>`
                
    //             links_text = `<ul>${links_text}</ul>`;
    //             let confirm_message = __("Duplicate {0} {1} is Present. You Want To Continue?", [
    //               __("Job Applicant").bold(),
    //              links_text
    //             ]);
    //             frappe.confirm(__(confirm_message), () => {
    //               frm.events.create_dialog(frm);
    //             },() => {
                  
    //             })
    //           }else{
    //             frm.events.create_dialog(frm);
    //           }
    //         }
    //       })
          
    //     },
    //     __("Create"),
    //   );
    // }
    frm.events.make_dashboard(frm);
    if (!frm.is_new()) {
      if (frappe.user.has_role("Hr Group Admin")) {
        // frm.add_custom_button(__("Request For Offer"), function(){
        //     frappe.call('recruitment.job_offer_utils.request_for_offer', {
        //         jo_id:frm.doc.name
        //     }).then(r => {
        //         console.log(r.message)
        //     })
        // });
      }
      let crm_notes = `
            <div class="notes-section col-xs-12">
                <div class="new-btn pb-3">
                    <button class="btn btn-sm small new-note-btn mr-1">
                        <svg class="icon icon-sm">
                            <use href="#icon-add"></use>
                            
                        </svg>
                        Add Notes
                    </button>
                </div>
                <div class="all-notes" id="all_notes_section">
                    <!-- Existing notes will be displayed here -->
                </div>
            </div>
            <style>
                .comment-content {
                    border: 1px solid var(--border-color);
                    border-bottom: none;
                }
                .comment-content:last-child {
                    border-bottom: 1px solid var(--border-color);
                }
                .new-btn {
                    text-align: right;
                }
                .notes-section .no-activity {
                    min-height: 100px;
                    text-align: center;
                }
                .notes-section .btn {
                    padding: 0.2rem 0.2rem;
                }
                .note-info {
                    display: flex;
                    justify-content: space-between;
                }
                .hide-name-column {
                display: none;
                }
            </style>`;

      document.getElementById("ctc_preview").innerHTML = crm_notes;

      let allNotesSection = document.getElementById("all_notes_section");
      if (frm.doc.custom_crm_note && frm.doc.custom_crm_note.length > 0) {
        frm.doc.custom_crm_note.forEach((note) => {
          let noteDiv = document.createElement("div");
          noteDiv.className = "comment-content p-3 row";
          noteDiv.innerHTML = `
                    <table style="width:100%">
                        <tr>
                        <td class="hide-name-column" >${note.name}</td>
                        <td style="width:20%">${note.custom_comment_type}</td>
                         
                            <td style="width:40%">${note.note}</td>
                            <td style="width:30%">${note.added_by}<br>
                            
                            ${frappe.datetime.global_date_format(
                              note.added_on
                            )}</td>

                            
                            
                            <td style="width:5%"><button class="edit-note-btn btn btn-sm btn-primary" data-note="${
                              note.note
                            }"><svg class="icon icon-sm"><use xlink:href="#icon-edit"></use></svg></button></td>

                        </tr>

                    </table>`;
          allNotesSection.appendChild(noteDiv);
        });
      }
      // <td style="width:5%"><button class="delete-note-btn btn btn-sm btn-primary" data-note="${note.note}"><svg class="icon icon-sm"><use xlink:href="#icon-delete"></use></svg></button></td>

      let newNoteBtn = frm
        .get_field("custom_notes_html")
        .wrapper.querySelector(".new-note-btn");
      newNoteBtn.addEventListener("click", () => {
        frappe.prompt(
          [
            {
              fieldname: "comment_type",
              fieldtype: "Select",
              label: "Comment Type",
              options: [
                "Candidate Response",
                "Call",
                "CTC Confirmation",
                "CTC approvals",
                "Interview comments and approvals",
                "Notice period buy out approval",
                "Notice Period approval",
                "Personal Interaction",
                "Zoom call",
                "Interview Schedule",
                "CTC Discussion",
                "Others",
                "Interviewer Feedback",
                "General Review",
                "Management Approval",
              ],
            },
            {
              fieldname: "notes",
              fieldtype: "Text",
              label: "Notes",
              reqd: true,
            },
          ],
          (values) => {
            var child = frm.add_child("custom_crm_note");

            frappe.model.set_value(
              child.doctype,
              child.name,
              "note",
              values.notes
            );
            frappe.model.set_value(
              child.doctype,
              child.name,
              "added_by",
              frappe.session.user
            );
            frappe.model.set_value(
              child.doctype,
              child.name,
              "added_on",
              frappe.datetime.now_datetime()
            );
            frappe.model.set_value(
              child.doctype,
              child.name,
              "custom_comment_type",
              values.comment_type
            );
            frm.refresh_field("custom_crm_note");
            frm.save();
          },
          "Add Notes",
          "Submit"
        );
      });

      allNotesSection.querySelectorAll(".edit-note-btn").forEach((btn, idx) => {
        btn.addEventListener("click", (event) => {
          let noteValue = event.target.getAttribute("data-note");
          let nameValue = event.target
            .closest("tr")
            .querySelector("td:nth-child(1)").innerText;
          // console.log("Name:", nameValue);

          $.each(frm.doc.custom_crm_note, function (i, v) {
            if (v.name == nameValue) {
              frappe.prompt(
                [
                  {
                    fieldname: "notes",
                    fieldtype: "Text",
                    label: "Notes",
                    reqd: true,
                    default: v.note,
                  },
                ],
                (values) => {
                  let childDoc = frm.doc.custom_crm_note.find(
                    (child) => child.name == nameValue
                  );

                  if (childDoc) {
                    childDoc.note = values.notes;
                    frm.refresh_field("custom_crm_note");
                  }

                  if (frm.doc.custom_check == 0) {
                    frm.set_value("custom_check", 1);
                  } else {
                    frm.set_value("custom_check", 0);
                  }

                  frm.save();
                },
                "Edit Note",
                "Submit"
              );
            }
          });
        });
      });

      allNotesSection
        .querySelectorAll(".delete-note-btn")
        .forEach((btn, idx) => {
          btn.addEventListener("click", (event) => {
            let noteValue = event.target.getAttribute("data-note");
            let nameValue = event.target
              .closest("tr")
              .querySelector("td:nth-child(1)").innerText;
            // console.log("Name:", nameValue);

            $.each(frm.doc.custom_crm_note, function (i, v) {
              if (v.name == nameValue) {
                // console.log(v.note)

                frm.doc.custom_crm_note.splice(i, 1);

                frm.refresh_field("custom_crm_note");

                if (frm.doc.custom_check == 0) {
                  frm.set_value("custom_check", 1);
                } else {
                  frm.set_value("custom_check", 0);
                }

                frm.save();

                return false;
              }
            });
          });
        });
    }
    applicant_details(frm);
    // frm.events.applicant_datails(frm);
  },

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
                                <td class="text-left">${value["interview_round"]}</td>
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

                    $(frm.fields_dict.custom_interview_feedback.wrapper).html(table);

                    // Attach click event to buttons
                    $(frm.fields_dict.custom_interview_feedback.wrapper).find('button').on('click', function () {
                        let interview_id = $(this).data('interview');
                        show_feedback(interview_id);
                    });

                } else {
                    $(frm.fields_dict.custom_interview_feedback.wrapper).html('<p style="margin-top: 30px;">No Interview has been scheduled.</p>');
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
// create_custom_buttons: function (frm) {
//   if (!frm.doc.__islocal && frm.doc.status !== "Rejected" && frm.doc.status !== "Accepted" && !frm.doc.custom_blacklist) {
//     frm.add_custom_button(
//       __("Interview"),
//       function () {
//         frappe.call({
//           method:"recruitment.customizations.job_applicant.validate_applicant",
//           args:{
//             "job_applicant":frm.doc.name
//           },
//           callback:function(r){
//             if(r.message){
//               let links_text = "";
//             links_text=`<a href="/app/job-applicant/${r.message[0]}">${r.message[0]}</a>`
              
//               links_text = `<ul>${links_text}</ul>`;
//               let confirm_message = __("Duplicate {0} {1} is Present. You Want To Continue?", [
//                 __("Job Applicant").bold(),
//                links_text
//               ]);
//               frappe.confirm(__(confirm_message), () => {
//                 frm.events.create_dialog(frm);
//               },() => {
                
//               })
//             }
//           }
//         })
        
//       },
//       __("Create"),
//     );
//   }

//   if (!frm.doc.__islocal && frm.doc.status == "Accepted" && !frm.doc.custom_blacklist) {
//     if (frm.doc.__onload && frm.doc.__onload.job_offer) {
//       $('[data-doctype="Employee Onboarding"]').find("button").show();
//       $('[data-doctype="Job Offer"]').find("button").hide();
//       frm.add_custom_button(
//         __("Job Offer"),
//         function () {
//           frappe.set_route("Form", "Job Offer", frm.doc.__onload.job_offer);
//         },
//         __("View"),
//       );
//     } else {
//       $('[data-doctype="Employee Onboarding"]').find("button").hide();
//       $('[data-doctype="Job Offer"]').find("button").show();
//       frm.add_custom_button(
//         __("Job Offer"),
//         function () {
//           frappe.route_options = {
//             job_applicant: frm.doc.name,
//             applicant_name: frm.doc.applicant_name,
//             designation: frm.doc.job_opening || frm.doc.designation,
//           };
//           frappe.new_doc("Job Offer");
//         },
//         __("Create"),
//       );
//     }
//   }
// },
// create_dialog: function (frm) {
//   let d = new frappe.ui.Dialog({
//     title: "Enter Interview Round",
//     fields: [
//       {
//         label: "Interview Round",
//         fieldname: "interview_round",
//         fieldtype: "Link",
//         options: "Interview Round",
//       },
//     ],
//     primary_action_label: __("Create Interview"),
//     primary_action(values) {
//       frm.events.create_interview(frm, values);
//       d.hide();
//     },
//   });
//   d.show();
// },
// applicant_datails(frm) {
//   frappe.require('recruitment.recruitment.public.css.job_applicant.css'); 
//   let job_applicant_html = `
//   <div class="section-heading">APPLICANT INFORMATION</div>
// <table class="custom-table">
//     <tr>
//         <th>Applicant Name</th>
//         <td>${frm.doc.applicant_name || '-'}</td>
//         <th>Email ID</th>
//         <td>${frm.doc.email_id || '-'}</td>
//     </tr>
//     <tr>
//         <th>Phone Number</th>
//         <td>${frm.doc.phone_number || '-'}</td>
//         <th>Country</th>
//         <td>${frm.doc.country || '-'}</td>
//     </tr>
//     <tr>
//         <th>Job Title</th>
//         <td>${frm.doc.job_title || '-'}</td>
//         <th>Designation</th>
//         <td>${frm.doc.designation || '-'}</td>
//     </tr>
//     <tr>
//         <th>Status</th>
//         <td>${frm.doc.status || '-'}</td>
//         <th>Shortlisted by Hiring Manager</th>
//         <td>${frm.doc.custom_shortlisted_by_hiring_manager || '-'}</td>
//     </tr>
//     <tr>
//         <th>Expected Date of Joining</th>
//         <td>${frm.doc.custom_expected_doj || '-'}</td>
//         <th>Approval Pending from Management</th>
//         <td><input type="checkbox" ${frm.doc.custom_approval_pending_from_management ? 'checked' : ''} disabled class="checkbox-disabled"></td>
//     </tr>
//     <tr>
//         <th>Current Salary CTC</th>
//         <td>${frm.doc.custom_current_salaryctc || '-'}</td>
//         <th>CTC Finalized</th>
//         <td>${frm.doc.custom_ctc_finalized || '-'}</td>
//     </tr>
// </table>

//   <div class="section-heading">SOURCE AND RATING</div>
//   <table class="custom-table">
//       <tr>
//           <th class="bold">Source</th>
//           <td>${frm.doc.source || '-'}</td>
//           <th class="bold">Source Name</th>
//           <td>${frm.doc.source_name || '-'}</td>
//       </tr>
//       <tr>
//           <th class="bold">Employee Referral</th>
//           <td>${frm.doc.employee_referral || '-'}</td>
//           <th class="bold">Applicant Rating</th>
//           <td>${frm.doc.applicant_rating || '-'}</td>
//       </tr>
//       <tr>
//           <th class="bold">Resume Attachment</th>
//           <td>${frm.doc.resume_attachment ? `<a href="${frm.doc.resume_attachment}" target="_blank">Download</a>` : '-'}</td>
//           <th class="bold">Resume Link</th>
//           <td>${frm.doc.resume_link || '-'}</td>
//       </tr>
//   </table>
//   `;

//   // Fetch Interview Details
//   frappe.call({
//       method: 'frappe.client.get_list',
//       args: {
//           doctype: 'Interview',
//           filters: {
//               job_applicant: frm.doc.name
//           },
//           fields: [
//               'custom_interview_type',
//               'interview_round',
//               'job_applicant',
//               'status',
//               'scheduled_on',
//               'from_time',
//               'to_time',
//               'custom_interview_location',
//               'custom_zoom_link',
//               'custom_zoom_password'
//           ]
//       },
//       callback: function(response) {
//           if (response.message && response.message.length > 0) {
//               let interviews = response.message;
//               let interview_html = `<div class="section-heading">INTERVIEW DETAILS</div>`;

//               interviews.forEach(function(interview) {
//                   interview_html += `
//                   <table class="custom-table">
//                       <tr>
//                           <th class="bold">Interview Type</th>
//                           <td>${interview.custom_interview_type || '-'}</td>
//                           <th class="bold">Interview Round</th>
//                           <td>${interview.interview_round || '-'}</td>
//                       </tr>
//                       <tr>
//                           <th class="bold">Job Applicant</th>
//                           <td>${interview.job_applicant || '-'}</td>
//                       </tr>
//                       <tr>
//                           <th class="bold">Status</th>
//                           <td>${interview.status || '-'}</td>
//                           <th class="bold">Scheduled On</th>
//                           <td>${interview.scheduled_on || '-'}</td>
//                       </tr>
//                       <tr>
//                           <th class="bold">From Time</th>
//                           <td>${interview.from_time || '-'}</td>
//                           <th class="bold">To Time</th>
//                           <td>${interview.to_time || '-'}</td>
//                       </tr>
//                       <tr>
//                           <th class="bold">Interview Location</th>
//                           <td>${interview.custom_interview_location || '-'}</td>
//                           <th class="bold">Zoom Link</th>
//                           <td>${interview.custom_zoom_link || '-'}</td>
//                       </tr>
//                       <tr>
//                           <th class="bold">Zoom Password</th>
//                           <td>${interview.custom_zoom_password || '-'}</td>
//                           <td colspan="2"></td>
//                       </tr>
//                   </table>
//                   `;
//               });

//               job_applicant_html += interview_html;
//           } else {
//               job_applicant_html += `
//               <div class="section-heading">INTERVIEW DETAILS</div>
//               <table class="custom-table">
//                   <tr>
//                       <td colspan="4">No interview details available.</td>
//                   </tr>
//               </table>
//               `;
//           }

//           // Fetch Interview Feedback
//           frappe.call({
//               method: 'frappe.client.get_list',
//               args: {
//                   doctype: 'Interview Feedback',
//                   filters: {
//                       job_applicant: frm.doc.name
//                   },
//                   fields: [
//                       'interview',
//                       'interview_round',
//                       'job_applicant',
//                       'interviewer',
//                       'result',
//                       'feedback'
//                   ]
//               },
//               callback: function(response) {
//                   if (response.message && response.message.length > 0) {
//                       let feedbacks = response.message;
//                       let feedback_html = `<div class="section-heading">INTERVIEW FEEDBACK</div>`;

//                       feedbacks.forEach(function(feedback) {
//                           feedback_html += `
//                           <table class="custom-table">
//                               <tr>
//                                   <th class="bold">Interview</th>
//                                   <td>${feedback.interview || '-'}</td>
//                                   <th class="bold">Interview Round</th>
//                                   <td>${feedback.interview_round || '-'}</td>
//                               </tr>
//                               <tr>
//                                   <th class="bold">Job Applicant</th>
//                                   <td>${feedback.job_applicant || '-'}</td>
//                                   <th class="bold">Interviewer</th>
//                                   <td>${feedback.interviewer || '-'}</td>
//                               </tr>
//                               <tr>
//                                   <th class="bold">Result</th>
//                                   <td>${feedback.result || '-'}</td>
//                                   <th class="bold">Feedback</th>
//                                   <td>${feedback.feedback || '-'}</td>
//                               </tr>
//                           </table>
//                           `;
//                       });

//                       job_applicant_html += feedback_html;
//                   } else {
//                       job_applicant_html += `
//                       <div class="section-heading">INTERVIEW FEEDBACK</div>
//                       <table class="custom-table">
//                           <tr>
//                               <td colspan="4">No interview feedback available.</td>
//                           </tr>
//                       </table>
//                       `;
//                   }

//                   frm.fields_dict.custom_custom_table.$wrapper.html(job_applicant_html);
//               }
//           });
//       }
//   });
// }
});
function applicant_details(frm) {
//   frappe.require('recruitment.recruitment.public.css.job_applicant.css'); 
  let job_applicant_html = `
  <div class="section-heading">APPLICANT INFORMATION</div>
<table class="custom-table">
    <tr>
        <th>Applicant Name</th>
        <td>${frm.doc.applicant_name || '-'}</td>
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
  frappe.call({
      method: 'frappe.client.get_list',
      args: {
          doctype: 'Interview',
          filters: {
              job_applicant: frm.doc.name
          },
          fields: [
              'custom_interview_type',
              'interview_round',
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
                          <td>${interview.interview_round || '-'}</td>
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
                      'interview_round',
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
                                  <td>${feedback.interview_round || '-'}</td>
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
                  frm.fields_dict.custom_custom_table.$wrapper.html(job_applicant_html);
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


// frappe.ui.form.on('Job Applicant', {
//     refresh: function(frm) {
//         let job_applicant_html = `
//         <style>
//             .custom-table {
//                 width: 100%;
//                 border-collapse: collapse;
//                 margin: 20px 0;
//                 font-family: Arial, sans-serif;
//             }
//             .custom-table, .custom-table th, .custom-table td {
//                 border: 1px solid black;
//                 padding: 8px;
//                 text-align: left;
//             }
//             .table-heading {
//                 background-color: #000;
//                 color: white;
//                 text-align: center;
//                 font-size: 16px;
//                 font-weight: bold;
//             }
//             .section-heading {
//                 background-color: #000;
//                 color: white;
//                 font-weight: bold;
//                 padding: 8px;
//             }
//             .bold {
//                 font-weight: bold;
//             }
//         </style>

//         <div class="section-heading">APPLICANT INFORMATION</div>
//         <table class="custom-table">
//             <tr>
//                 <th class="bold">Applicant Name</th>
//                 <td>${frm.doc.applicant_name || '-'}</td>
//                 <th class="bold">Email ID</th>
//                 <td>${frm.doc.email_id || '-'}</td>
//             </tr>
//             <tr>
//                 <th class="bold">Phone Number</th>
//                 <td>${frm.doc.phone_number || '-'}</td>
//                 <th class="bold">Country</th>
//                 <td>${frm.doc.country || '-'}</td>
//             </tr>
//             <tr>
//                 <th class="bold">Job Title</th>
//                 <td>${frm.doc.job_title || '-'}</td>
//                 <th class="bold">Designation</th>
//                 <td>${frm.doc.designation || '-'}</td>
//             </tr>
//             <tr>
//                 <th class="bold">Status</th>
//                 <td>${frm.doc.status || '-'}</td>
//                 <th class="bold">Shortlisted by Hiring Manager</th>
//                 <td>${frm.doc.custom_shortlisted_by_hiring_manager || '-'}</td>
//             </tr>
//             <tr>
//                 <th class="bold">Expected Date of Joining</th>
//                 <td>${frm.doc.custom_expected_doj || '-'}</td>
//                 <th class="bold">Approval Pending from Management</th>
//                 <td><input type="checkbox" ${frm.doc.custom_approval_pending_from_management ? 'checked' : ''} disabled></td>
//             </tr>
//         </table>

//         <div class="section-heading">SOURCE AND RATING</div>
//         <table class="custom-table">
//             <tr>
//                 <th class="bold">Source</th>
//                 <td>${frm.doc.source || '-'}</td>
//                 <th class="bold">Source Name</th>
//                 <td>${frm.doc.source_name || '-'}</td>
//             </tr>
//             <tr>
//                 <th class="bold">Employee Referral</th>
//                 <td>${frm.doc.employee_referral || '-'}</td>
//                 <th class="bold">Applicant Rating</th>
//                 <td>${frm.doc.applicant_rating || '-'}</td>
//             </tr>
//             <tr>
//                 <th class="bold">Resume Attachment</th>
//                 <td>${frm.doc.resume_attachment ? `<a href="${frm.doc.resume_attachment}" target="_blank">Download</a>` : '-'}</td>
//                 <th class="bold">Resume Link</th>
//                 <td>${frm.doc.resume_link || '-'}</td>
//             </tr>
//         </table>
//         `;

//         // Fetch Interview details
//         frappe.call({
//             method: 'frappe.client.get_list',
//             args: {
//                 doctype: 'Interview',
//                 filters: {
//                     job_applicant: frm.doc.name
//                 },
//                 fields: ['custom_interview_type', 'interview_round', 'job_applicant', 'status', 'scheduled_on', 'from_time', 'to_time', 'custom_interview_location', 'custom_zoom_link', 'custom_zoom_password']
//             },
//             callback: function(response) {
//                 if (!response.message || response.message.length === 0) {

//                     let interview_html = `
//                         <div class="section-heading">INTERVIEW DETAILS</div>
//                         <div style="padding:10px;">No Interview Scheduled</div>
//                     `;

//                     frm.fields_dict.custom_custom_table.$wrapper.html(interview_html);
//                     // return;
//                 }

//                 let interview_data = response.message[0]; // Get the first record
//                 let interview_html = `
//                 <div class="section-heading">INTERVIEW DETAILS</div>
//                 <table class="custom-table">
//                     <tr>
//                         <th class="bold">Interview Type</th>
//                         <td>${interview_data.custom_interview_type || '-'}</td>
//                         <th class="bold">Interview Round</th>
//                         <td>${interview_data.interview_round || '-'}</td>
//                     </tr>
//                     <tr>
//                         <th class="bold">Job Applicant</th>
//                         <td>${interview_data.job_applicant || '-'}</td>
//                     </tr>
//                     <tr>
//                         <th class="bold">Status</th>
//                         <td>${interview_data.status || '-'}</td>
//                         <th class="bold">Scheduled On</th>
//                         <td>${interview_data.scheduled_on || '-'}</td>
//                     </tr>
//                     <tr>
//                         <th class="bold">From Time</th>
//                         <td>${interview_data.from_time || '-'}</td>
//                         <th class="bold">To Time</th>
//                         <td>${interview_data.to_time || '-'}</td>
//                     </tr>
//                     <tr>
//                         <th class="bold">Interview Location</th>
//                         <td>${interview_data.custom_interview_location || '-'}</td>
//                         <th class="bold">Zoom Link</th>
//                         <td>${interview_data.custom_zoom_link || '-'}</td>
//                     </tr>
//                     <tr>
//                         <th class="bold">Zoom Password</th>
//                         <td>${interview_data.custom_zoom_password || '-'}</td>
//                     </tr>
//                 </table>
//                 `;
                

//                 // Append Interview Details to Job Applicant
//                 job_applicant_html += interview_html;

//                 // Fetch Interview Feedback
//                 frappe.call({
//                     method: 'frappe.client.get_list',
//                     args: {
//                         doctype: 'Interview Feedback',
//                         filters: {
//                             job_applicant: frm.doc.name
//                         },
//                         fields: ['interview', 'interview_round', 'job_applicant', 'interviewer', 'result', 'feedback']
//                     },
//                     callback: function(response) {
//                         let interview_feedback_data = response.message && response.message.length 
//                         ? response.message[0] 
//                         : {};
//                         let feedback_html = `
//                         <div class="section-heading">INTERVIEW FEEDBACK</div>
//                         <table class="custom-table">
//                             <tr>
//                                 <th class="bold">Interview</th>
//                                 <td>${interview_feedback_data.interview || '-'}</td>
//                                 <th class="bold">Interview Round</th>
//                                 <td>${interview_feedback_data.interview_round || '-'}</td>
//                             </tr>
//                             <tr>
//                                 <th class="bold">Job Applicant</th>
//                                 <td>${interview_feedback_data.job_applicant || '-'}</td>
//                                 <th class="bold">Interviewer</th>
//                                 <td>${interview_feedback_data.interviewer || '-'}</td>
//                             </tr>
//                             <tr>
//                                 <th class="bold">Result</th>
//                                 <td>${interview_feedback_data.result || '-'}</td>
//                                 <th class="bold">Feedback</th>
//                                 <td>${interview_feedback_data.feedback || '-'}</td>
//                             </tr>
//                         </table>
//                         `;

//                         // Append Interview Feedback to Job Applicant
//                         job_applicant_html += feedback_html;

//                         // Insert HTML into the custom field
//                         frm.fields_dict.custom_custom_table.$wrapper.html(job_applicant_html);
//                     }
//                 });
//             }
//         });
//     }
// });




frappe.ui.form.on('Job Applicant', {
    refresh: function(frm) {
        // Only fetch if custom_job_offer field is empty
        if (!frm.doc.custom_job_offer && frm.doc.name) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Job Offer",
                    filters: {
                        job_applicant: frm.doc.name  // Check for this Job Applicant
                    },
                    fieldname: "name"
                },
                callback: function(r) {
                    if (r.message && r.message.name) {
                        // Set the field silently if Job Offer found
                        frm.set_value('custom_job_offer', r.message.name);
                        frm.save();
                    }
                    // No error or message if not found
                }
            });
        }
    }
});


// frappe.ui.form.on('Job Applicant', {
//     refresh: function(frm) {
//         let interview_html = ''; // Initialize empty HTML

//         // Fetch Interview Feedback details
//         frappe.call({
//             method: 'frappe.client.get_list',
//             args: {
//                 doctype: 'Interview Feedback',
//                 filters: {
//                     job_applicant: frm.doc.name // Use frm.doc.name since we're in Job Applicant form
//                 },
//                 fields: ['interview_round', 'interviewer', 'result', 'feedback', 'custom_ctc', 'custom_bond'],
//                 order_by: 'creation asc' // Sort by creation date
//             },
//             callback: function(feedback_response) {
//                 let feedback_list = feedback_response.message;
                
//                 // Use current form data directly (no need for additional API call)
//                 let job_applicant = frm.doc;
                
//                 // Create the new layout HTML
//                 interview_html = `
// <style>
//     .hiring-dashboard {
//         font-family: Arial, sans-serif;
//         margin: 20px 0;
//         display: flex;
//         gap: 20px;
//         align-items: flex-start;
//     }
    
//     .applicant-summary-box {
//         width: 300px;
//         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//         color: white;
//         border-radius: 15px;
//         padding: 25px;
//         box-shadow: 0 8px 25px rgba(0,0,0,0.15);
//         flex-shrink: 0;
//     }
    
//     .applicant-summary-box h3 {
//         margin: 0 0 20px 0;
//         font-size: 24px;
//         font-weight: bold;
//         text-align: center;
//         border-bottom: 2px solid rgba(255,255,255,0.3);
//         padding-bottom: 15px;
//     }
    
//     .summary-item {
//         margin-bottom: 15px;
//         display: flex;
//         align-items: center;
//     }
    
//     .summary-item .icon {
//         width: 25px;
//         height: 25px;
//         background: rgba(255,255,255,0.2);
//         border-radius: 50%;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         margin-right: 12px;
//         font-size: 12px;
//     }
    
//     .summary-item .content {
//         flex: 1;
//     }
    
//     .summary-item .label {
//         font-size: 12px;
//         opacity: 0.8;
//         margin-bottom: 2px;
//     }
    
//     .summary-item .value {
//         font-weight: bold;
//         font-size: 14px;
//         word-break: break-word;
//     }
    
//     .feedback-section {
//         flex: 1;
//         min-width: 0;
//     }
    
//     .feedback-header {
//         background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
//         color: white;
//         padding: 20px 25px;
//         border-radius: 15px 15px 0 0;
//         margin: 0;
//         font-size: 24px;
//         font-weight: bold;
//         text-align: center;
//     }
    
//     .feedback-container {
//         background: #f8f9fa;
//         border-radius: 0 0 15px 15px;
//         box-shadow: 0 8px 25px rgba(0,0,0,0.1);
//         overflow: hidden;
//     }
    
//     .feedback-item {
//         background: white;
//         margin: 15px;
//         border-radius: 10px;
//         box-shadow: 0 4px 15px rgba(0,0,0,0.1);
//         overflow: hidden;
//         transition: transform 0.2s ease;
//     }
    
//     .feedback-item:hover {
//         transform: translateY(-2px);
//     }
    
//     .feedback-round-header {
//         padding: 10px 10px;
//         color: white;
//         font-weight: bold;
//         font-size: 16px;
//         display: flex;
//         align-items: center;
//     }
    
//     .feedback-round-header .round-icon {
//         width: 30px;
//         height: 30px;
//         background: rgba(255,255,255,0.2);
//         border-radius: 50%;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         margin-right: 12px;
//         font-size: 16px;
//     }
    
//     .feedback-details {
//         padding: 20px;
//         background: white;
//     }
    
//     .feedback-grid {
//         display: grid;
//         grid-template-columns: 1fr 1fr;
//         gap: 15px;
//         margin-bottom: 15px;
//     }
    
//     .feedback-field {
//         display: flex;
//         flex-direction: column;
//     }
    
//     .feedback-field.full-width {
//         grid-column: 1 / -1;
//     }
    
    
//     .no-feedback {
//         text-align: center;
//         padding: 40px 20px;
//         color: #666;
//         font-style: italic;
//     }
    
//     @media (max-width: 768px) {
//         .hiring-dashboard {
//             flex-direction: column;
//         }
        
//         .applicant-summary-box {
//             width: 100%;
//         }
        
//         .feedback-grid {
//             grid-template-columns: 1fr;
//         }
//     }
// </style>

// <div class="hiring-dashboard">
//     <!-- Left Side: Applicant Summary Box -->
//     <div class="applicant-summary-box">
//         <h3>👤 Candidate Profile</h3>
        
//         <div class="summary-item">
//             <div class="icon">👤</div>
//             <div class="content">
//                 <div class="label">Name</div>
//                 <div class="value">${job_applicant.applicant_name || 'N/A'}</div>
//             </div>
//         </div>
        
//         <div class="summary-item">
//             <div class="icon">📧</div>
//             <div class="content">
//                 <div class="label">Email</div>
//                 <div class="value">${job_applicant.email_id || 'N/A'}</div>
//             </div>
//         </div>
        
//         <div class="summary-item">
//             <div class="icon">🏢</div>
//             <div class="content">
//                 <div class="label">Department</div>
//                 <div class="value">${job_applicant.custom_department || 'N/A'}</div>
//             </div>
//         </div>
        
//         <div class="summary-item">
//             <div class="icon">💼</div>
//             <div class="content">
//                 <div class="label">Designation</div>
//                 <div class="value">${job_applicant.designation || 'N/A'}</div>
//             </div>
//         </div>
        
//         <div class="summary-item">
//             <div class="icon">💰</div>
//             <div class="content">
//                 <div class="label">Expected CTC</div>
//                 <div class="value">${job_applicant.custom_expected_ctc || 'N/A'}</div>
//             </div>
//         </div>
        
//         <div class="summary-item">
//             <div class="icon">📊</div>
//             <div class="content">
//                 <div class="label">Status</div>
//                 <div class="value">${job_applicant.status || 'N/A'}</div>
//             </div>
//         </div>
//     </div>
    
//     <!-- Right Side: Feedback Section -->
//     <div class="feedback-section">
//         <h3 class="feedback-header">📝 Interview Feedback</h3>
//         <div class="feedback-container">
// `;

//                 const colors = ['#6A5ACD', '#FF6B6B', '#3CB371', '#FFA500', '#008B8B', '#DC143C'];
//                 const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

//                 if (feedback_list && feedback_list.length > 0) {
//                     feedback_list.forEach((feedback, index) => {
//                         let color = colors[index % colors.length];
//                         let icon = icons[index % icons.length];
                        
//                         interview_html += `
//             <div class="feedback-item">
//                 <div class="feedback-round-header" style="background-color: ${color}">
//                     <div class="round-icon">${icon}</div>
//                     <span>${feedback.interview_round || `Round ${index + 1}`}</span>
//                 </div>
//                 <div class="feedback-details">
//                     <div class="feedback-grid">
//                         <div class="feedback-field">
//                             <div class="field-label"><span class="bold">Interviewer:</span> ${feedback.interviewer || 'Not specified'}</div>
//                         </div>
//                         <div class="feedback-field">
//                             <div class="field-label"><span class="bold">Result:</span> ${feedback.result || 'Pending'}</div>
//                         </div>
//                         <div class="feedback-field">
//                             <div class="field-label"><span class="bold">Offered CTC: </span>${feedback.custom_ctc || 'Not specified'}</div>
//                         </div>
//                         <div class="feedback-field">
//                             <div class="field-label"><span class="bold">Bond Period: </span>${feedback.custom_bond || 'Not specified'}</div>
//                         </div>
//                         <div class="feedback-field full-width">
//                             <div class="field-label"><span class="bold">Feedback Details: </span>${feedback.feedback || 'No feedback provided'}</div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//                         `;
//                     });
//                 } else {
//                     interview_html += `
//             <div class="no-feedback">
//                 <h4>📋 No Feedback Available</h4>
//                 <p>No interview feedback has been recorded for this candidate yet.</p>
//             </div>
//                     `;
//                 }

//                 interview_html += `
//         </div>
//     </div>
// </div>
//                 `;

//                 // Insert the HTML into the custom field
//                 frm.fields_dict.custom_custom_table.$wrapper.html(interview_html);
//             }
//         });
//     }
// });
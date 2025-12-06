frappe.ui.form.on("Job Requisition", {
    refresh: function(frm){ 
		if (frappe.user.has_role("Recruiter Admin")) {
            frm.set_df_property('custom_assign_to_recruiter', 'hidden', 0); 
			frm.set_df_property('status', 'hidden', 0); 
        } else {
            frm.set_df_property('custom_assign_to_recruiter', 'hidden', 1);
			frm.set_df_property('status', 'hidden', 1); 
        }
		if (frm.is_new()){
			frappe.db.get_value('Employee', {user_id: frappe.session.user}, 'name')
		.then(r => {
			let values = r.message;
			 cur_frm.set_value("requested_by", values.name);
		})	
		}
		//cur_frm.set_value("status", "Open & Approved");
		 /*if(frm.doc.status=="Open & Approved"){
			 frm.add_custom_button(__('Job Opening'), function(){
				frappe.call({
					method: "recruitment.customizations.job_requisition.job_requisition.generate_job_opening",
					args:{
						"job_requisition": frm.doc.name
					},
					callback: function(r) {
						// code snippet
					}
				});

			},__("Create"));
		}*/
		frm.set_query("custom_salary", function() {
        return {
            "filters": {
                "disabled": 0,
            }
        };
    });
	frm.set_query("custom_division", function() {
        return {
            "filters": {
                "is_group": 1,
            }
        };
    });
	frm.set_query("department", function() {
        return {
            "filters": {
                "is_group": 0,
				"parent_department":frm.doc.custom_division
            }
        };
    });
    },
	after_save: function(frm){
		if(frm.doc.custom_assign_to_recruiter){
			frappe.call({
				method: "recruitment.customizations.job_requisition.job_requisition.assign_task",
				args:{
					"reference_doctype": "Job Requisition",
					"reference_name":frm.doc.name,
					"assign_to":frm.doc.custom_assign_to_recruiter,
					"description":"Please Do The Needful"
				},
				callback: function(r) {
				}
			});
		}
	},
	designation(frm){
    if(frm.doc.designation){

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Designation",
                name: frm.doc.designation,
                async: true
            },
            callback: (rs) => {
                let res = rs.message.skills;
                let crops = []

                for (var index in res) {         
                    crops.push(res[index]);
                }

                frm.set_value("custom_skills", crops);
                refresh_field('custom_skills');
            }
        });
    }
}
})

frappe.ui.form.on('Job Requisition', {
    custom_job_description_template: function (frm) {
        if (!frm.doc.custom_job_description_template) {
            frm.set_value('custom_jd_details', []);
            render_jd_live_preview(frm);
            return;
        }

        frappe.db.get_doc('Job Description Template', frm.doc.custom_job_description_template).then(template => {
            if (!template || !template.jd_details) return;

            frm.set_value('custom_jd_details', []);
            
            if (template.skills && template.skills.length > 0) {
                frm.set_value('custom_skills', []);
            
                template.skills.forEach(row => {
                    if (row.skill) {
                        let child = frm.add_child('custom_skills');
                        child.skill = row.skill;
                    }
                });
            
                frm.refresh_field('custom_skills');
            }

            template.jd_details.forEach(row => {
                const new_row = frm.add_child('custom_jd_details');
                new_row.label = row.label;
                new_row.description = row.description;
            });

            frm.refresh_field('custom_jd_details');
            frm.refresh_field('custom_skills');

            setTimeout(() => {
                render_jd_live_preview(frm);
            }, 200);
        });
    },

    refresh: function (frm) {
        render_jd_live_preview(frm);
    }
});

function render_jd_live_preview(frm) {
    const wrapper = frm.fields_dict.custom_job_description?.$wrapper;
    if (!wrapper) return;

    const rows = frm.doc.custom_jd_details || [];
    wrapper.empty();

    if (!rows.length) {
        wrapper.html(`<p class="text-muted">No job description added.</p>`);
        return;
    }

    let html = `
        <style>
            .frappe-jd-group {
                margin-bottom: 18px;
            }

            .frappe-jd-heading {
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 6px;
                color: var(--gray-800);
            }

            .frappe-jd-box {
                background-color: var(--control-bg);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius);
                padding: 12px;
            }

            .frappe-jd-box textarea {
                width: 100%;
                border: none;
                resize: vertical;
                font-size: 14px;
                background-color: transparent;
                font-family: inherit;
                line-height: 1.5;
                color: var(--text-color);
            }

            .frappe-jd-box textarea:focus {
                outline: none;
            }
        </style>
    `;

    rows.forEach((row, index) => {
        html += `
            <div class="frappe-jd-group">
                <div class="frappe-jd-heading">${row.label}</div>
                <div class="frappe-jd-box">
                    <textarea rows="4" data-index="${index}">${row.description || ''}</textarea>
                </div>
            </div>
        `;
    });

    wrapper.html(html);

    wrapper.find('textarea').on('input', function () {
        const i = $(this).data('index');
        frm.doc.custom_jd_details[i].description = $(this).val();
        frm.dirty();
    });
}

frappe.ui.form.on("Job Requisition", {
    refresh: function(frm) {
        if (!frm.is_new()) {
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
    }
})



frappe.ui.form.on('Job Requisition', {
    refresh: function(frm) {
        if (frm.is_new() && !frm.doc.custom_location) {
            console.log("Fetching branch for user:", frappe.session.user);
            
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Employee",
                    filters: {
                        user_id: frappe.session.user
                    },
                    fieldname: ["branch"]
                },
                callback: function(r) {
                    if (r.message && r.message.branch) {
                        console.log("Branch fetched:", r.message.branch);
                        frm.set_value("custom_location", r.message.branch);
                    } else {
                        console.log("Branch not found for this user.");
                    }
                }
            });
        }
    }
});




frappe.ui.form.on('Job Requisition', {
    refresh: function(frm) {
        let job_requisition_html = `
        <style>
            .custom-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-family: Arial, sans-serif;
            }
            .custom-table, .custom-table th, .custom-table td {
                border: 1px solid black;
                padding: 8px;
                text-align: left;
            }
            .table-heading {
                background-color: #000;
                color: white;
                text-align: center;
                font-size: 16px;
                font-weight: bold;
            }
            .section-heading {
                background-color: #000;
                color: white;
                font-weight: bold;
                padding: 8px;
            }
            .checkbox-group td {
                text-align: center;
            }
        </style>

        <div class="section-heading">GENERAL INFORMATION</div>
        <table class="custom-table">
            <tr>
                <th>Date:</th>
                <td>${frm.doc.posting_date || 'N/A'}</td>
                <th>Hiring Manager:</th>
                <td>${frm.doc.requested_by_name || 'N/A'}</td>
            </tr>
            <tr>
                <th>Position:</th>
                <td>${frm.doc.designation || 'N/A'}</td>
                <th>Department:</th>
                <td>${frm.doc.department || 'N/A'}</td>
            </tr>
            <tr>
                <th>No of Positions:</th>
                <td>${frm.doc.no_of_positions || 'N/A'}</td>
                <th>Expected Compensation:</th>
                <td>${frm.doc.expected_compensation || 'N/A'}</td>
            </tr>
            <tr>
                <th>Skills Required:</th>
                <td>${frm.doc.custom_skills || 'N/A'}</td>
                <th>Company:</th>
                <td>${frm.doc.company || 'N/A'}</td>
            </tr>
        </table>

        <div class="section-heading">REQUIRED BY</div>
        <table class="custom-table">
            <tr>
                <th>Requested By:</th>
                <td>${frm.doc.requested_by || 'N/A'}</td>
                <th>Requested By Name:</th>
                <td>${frm.doc.requested_by_name || 'N/A'}</td>
            </tr>
            <tr>
                <th>HOD:</th>
                <td>${frm.doc.custom_hod || 'N/A'}</td>
                <th>Department:</th>
                <td>${frm.doc.requested_by_dept || 'N/A'}</td>
            </tr>
            <tr>
                <th>Designation:</th>
                <td>${frm.doc.requested_by_designation || 'N/A'}</td>
                <th>How the Vacancy Arise:</th>
                <td>${frm.doc.custom_how_the_vacancy_as_arisen || 'N/A'}</td>
            </tr>
        </table>

        <div class="section-heading">TIMELINES</div>
        <table class="custom-table">
            <tr>
                <th>Posting Date:</th>
                <td>${frm.doc.posting_date || 'N/A'}</td>
                <th>Expected By:</th>
                <td>${frm.doc.expected_by || 'N/A'}</td>
            </tr>
        </table>
        `;

        // Insert HTML into the custom field
        frm.fields_dict.custom_custom_table.$wrapper.html(job_requisition_html);
    }
});

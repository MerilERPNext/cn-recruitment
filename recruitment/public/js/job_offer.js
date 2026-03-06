frappe.ui.form.on("Job Offer", {
    refresh(frm) {

        if (frm.doc.status === "Awaiting Response") {

            frm.add_custom_button(__('Send Job Offer'), function () {

                frappe.call({
                    method: "recruitment.job_offer_utils.send_job_offer",
                    args: {
                        job_offer: frm.doc.name
                    },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.msgprint("Job Offer email sent successfully");
                        }
                    }
                });

            });

        }
    }
});

frappe.ui.form.on("Job Offer", {
    // refresh: function(frm){
	// 	if(frm.doc.status=="Awaiting Response"){
	// 		  frm.add_custom_button(__('Send Job Offer'), function(){
	// 			frappe.call({
	// 				method: "recruitment.job_offer_utils.send_job_offer",
	// 				args:{
	// 					"job_offer_url": window.location.origin+"/job_offer?appl="+frm.doc.job_applicant,
	// 					"candidate":frm.doc.applicant_name,
	// 					"mail_id":frm.doc.job_applicant,
	// 					"company":frm.doc.company,
	// 					"designation":frm.doc.designation
	// 				},
	// 				callback: function(r) {
	// 					// code snippet
	// 				}
	// 			});

	// 		});
	// 	}
    // },
    offer_date: function(frm) {
        frm.trigger("filter_jo_expiry_date");
    },
	refresh: function(frm) {
		frm.trigger("filter_jo_expiry_date");
	},
    filter_jo_expiry_date: function(frm) {
        if (frm.doc.offer_date) {
            let minDate = frappe.datetime.str_to_obj(frm.doc.offer_date);
            let datepicker = frm.fields_dict.custom_jo_expiry_date?.datepicker;

            if (datepicker) {
                datepicker.update({
                    minDate: minDate
                });
            }
            if (
                frm.doc.custom_jo_expiry_date &&
                frm.doc.custom_jo_expiry_date < frm.doc.offer_date
            ) {
                frappe.msgprint(__('Job Expiry Date must be on or after Offer Date'));
                frm.set_value("custom_jo_expiry_date", null);
            }
        }
    },
	after_save(frm){
		if (frm.doc.status == "Accepted"){
			frappe.call({
				method: "recruitment.job_offer_utils.job_offer_update",
				args:{
					"status": "Accepted",
					"appl":frm.doc.job_applicant
				},
				callback: function(r) {
					// code snippet
				}
			});
		}
		if (frm.doc.status == "Rejected"){
			frappe.call({
				method: "recruitment.job_offer_utils.job_offer_update",
				args:{
					"status": "Rejected",
					"appl":frm.doc.job_applicant
				},
				callback: function(r) {
					// code snippet
				}
			});
		}
	},
	custom_ctc_per_annum:function(frm){
		if(frm.doc.custom_ctc_per_annum){
			frm.set_value("custom_ctc_per_month", Math.round(frm.doc.custom_ctc_per_annum / 12));
		}else{
			frm.set_value("custom_ctc_per_month",null)
		}
	},
	job_applicant: function(frm) {
		if (frm.doc.job_applicant) {
			if(frm.doc.job_applicant){
				frappe.call({
					method: "recruitment.auto_fetch_fields.job_applicant_fields",
					args: {
						"job_applicant": frm.doc.job_applicant,
					},
					callback: function(r) {
						if (r.message) {
							frm.set_value(r.message);
							// var doclist = frappe.model.sync(r.message);
							// frappe.set_route("Form", doclist[0].doctype, doclist[0].name);
						}
					}
				});
			}
			frappe.db.get_value("Job Applicant", frm.doc.job_applicant, "custom_ctc_finalized")
				.then(r => {
					if (r && r.message) {
						frm.set_value("custom_ctc_per_annum", r.message.custom_ctc_finalized);
					}
				});
		} else {
			frm.set_value("custom_ctc_per_annum", null);
		}
	}	
})



frappe.ui.form.on('Job Offer', {
    refresh: function(frm) {
        let interview_html = ''; // Initialize empty HTML

        // Fetch Interview Feedback details first
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Interview Feedback',
                filters: {
                    job_applicant: frm.doc.job_applicant // Fetch feedback for the same job applicant
                },
                fields: ['interview_round', 'interviewer', 'result', 'feedback','custom_ctc'],
                order_by: 'interview_round asc' // Ensure feedback is sorted by interview round
            },
            callback: function(feedback_response) {
                let feedback_list = feedback_response.message;
                let feedback_html = `
<style>
    .audit-feedback-container {
        font-family: Arial, sans-serif;
        margin: 20px 0;
    }
    .audit-block {
        display: flex;
        align-items: flex-start;
        margin-bottom: 15px;
    }
    .icon-label {
        flex: 0 0 200px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        color: white;
        font-weight: bold;
        padding: 10px 15px;
        border-radius: 0 20px 20px 0;
    }
    .icon-label i {
        margin-right: 10px;
        font-size: 20px;
    }
    .feedback-content {
        background-color: #f7f7f7;
        padding: 15px 20px;
        flex: 1;
        border-radius: 0 10px 10px 0;
        margin-left: 10px;
    }
    .feedback-content ul {
        margin: 0;
        padding-left: 18px;
    }
</style>
<div class="audit-feedback-container">
    <h3>Interview Feedback</h3>
`;

const colors = ['#6A5ACD', '#FF6B6B', '#3CB371', '#FFA500', '#008B8B']; // cycle colors
const icons = ['⚙️', '💬', '📊', '✅', '👤']; // basic icons per round

if (feedback_list && feedback_list.length > 0) {
    feedback_list.forEach((feedback, index) => {
        let color = colors[index % colors.length];
        let icon = icons[index % icons.length];
        feedback_html += `
        <div class="audit-block">
            <div class="icon-label" style="background-color:${color}">
                <span style="font-size:18px; margin-right:10px;">${icon}</span> 
                ${feedback.interview_round || 'Round ' + (index + 1)}
            </div>
            <div class="feedback-content">
                <ul>
                    <li><strong>Interviewer:</strong> ${feedback.interviewer || '-'}</li>
                    <li><strong>Result:</strong> ${feedback.result || '-'}</li>
                    <li><strong>Feedback:</strong> ${feedback.feedback || '-'}</li>
                    <li><strong>Offer CTC:</strong> ${feedback.custom_ctc || '-'}</li>
                </ul>
            </div>
        </div>`;
    });
} else {
    feedback_html += `<p>No feedback available.</p>`;
}

feedback_html += `</div>`; // Close container

// You can now assign interview_html = feedback_html if you're only showing this section
interview_html += feedback_html;


                // Now fetch Job Applicant details
                frappe.call({
                    method: 'frappe.client.get',
                    args: {
                        doctype: 'Job Applicant',
                        name: frm.doc.job_applicant
                    },
                    callback: function(response) {
                        let job_applicant = response.message;
                        let job_applicant_html = `
<style>
    .card-container {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 20px;
        font-family: Arial, sans-serif;
    }
    .summary-card {
        flex: 1;
        background-color: #f9f9f9;
        border-radius: 6px;
        box-shadow: 0 0 5px rgba(0,0,0,0.1);
        padding: 15px;
        display: flex;
        flex-direction: column;
    }
    .summary-header {
        font-weight: bold;
        padding: 10px;
        color: white;
        border-radius: 4px 4px 0 0;
        font-size: 16px;
    }
    .section-1 { background-color: #007bff; }
    .section-2 { background-color: #f0ad4e; }
    .section-3 { background-color: #5cb85c; }
    .section-4 { background-color: #5bc0de; }

    .summary-card ul {
        list-style-type: disc;
        padding-left: 18px;
        margin: 10px 0 0 0;
    }

    .summary-card li {
        margin-bottom: 6px;
    }

    .summary-card a {
        color: #007bff;
        text-decoration: underline;
    }
</style>


<div class="card-container">

    <!-- Basic Details -->
    <div class="summary-card">
        <div class="summary-header section-1">Basic Details</div>
        <!-- Profile Image in Top-Right Corner -->
    
        <ul>
            <li><strong>Name:</strong> ${job_applicant.applicant_name || '-'}</li>
            <li><strong>Email:</strong> ${job_applicant.email_id || '-'}</li>
            <li><strong>Department:</strong> ${job_applicant.custom_department || '-'}</li>
            <li><strong>Division:</strong> ${job_applicant.custom_division_finalized || '-'}</li>
            <li><strong>Designation:</strong> ${job_applicant.designation || '-'}</li>
            <li><strong>Job Title:</strong> 
                <span class="clickable" onclick="frappe.set_route('Form', 'Job Opening', '${job_applicant.job_title || ''}')">
                    ${job_applicant.job_title || '-'}
                </span>
            </li>
        </ul>
    </div>

    <!-- Education Details -->
    <div class="summary-card">
    <div class="summary-header section-2">Education</div>
    <ul>
        ${
            job_applicant.custom_educational_qualification && job_applicant.custom_educational_qualification.length > 0
            ? job_applicant.custom_educational_qualification.map(edu => `
                <li>
                    <strong>School/Univ:</strong> ${edu.school_univ || '-'} |
                    <strong>Level:</strong> ${edu.level || '-'} |
                    <strong>Year:</strong> ${edu.year_of_passing || '-'} |
                    <strong>Percentage:</strong> ${edu.class_per || '-'} 
                    <br><strong>Additional Details:</strong> ${edu.custom_additional_details || '_'}
                </li>
            `).join('')
            : '<li>No educational qualifications provided.</li>'
        }
    </ul>
</div>

    <!-- Compensation & Attachments -->
    <div class="summary-card">
        <div class="summary-header section-3">CTC & Documents</div>
        <ul>
            <li><strong>Current CTC:</strong> ${job_applicant.custom_previous_salary || '-'}</li>
            <li><strong>Expected CTC:</strong> ${job_applicant.custom_expected_ctc || '-'}</li>
            <li><strong>Resume:</strong><br/>
                <a href="https://erpprd.microcrispr.com/${job_applicant.resume_attachment}" target="_blank">
                    ${job_applicant.resume_attachment || 'Not Uploaded'}
                </a>
            </li>
            <li><strong>MAT Attachment:</strong><br/>
                <a href="https://erpprd.microcrispr.com/${job_applicant.custom_mat_report}" target="_blank">
                    ${job_applicant.custom_mat_report || 'Not Uploaded'}
                </a>
            </li>
        </ul>
    </div>

    <!-- Additional -->
    <div class="summary-card">
        <div class="summary-header section-4">Additional</div>
        <ul>
            <li><strong>Status:</strong> ${job_applicant.status || '-'}</li>
            <li><strong>Source:</strong> ${job_applicant.source || '-'}</li>
            <li><strong>Recruiter:</strong> ${job_applicant.custom_recruiter_name || '-'}</li>
            <li><strong>Hiring Manager:</strong> ${job_applicant.custom_recruit__hiring_manager || '-'}</li>
        </ul>
    </div>

</div>
`;


                        // Append Job Applicant Details after Feedback
                        interview_html += job_applicant_html;

                        

                        // Finally, insert the HTML into the custom field
                        frm.fields_dict.custom_custom_table.$wrapper.html(interview_html);
                    }
                });
            }
        });
    }
});

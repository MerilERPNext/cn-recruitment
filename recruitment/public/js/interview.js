frappe.ui.form.on("Interview", {
    refresh: function(frm){
		// if (frm.is_new()){
		// 	let currentTime = new Date();
		// 	frm.set_value("from_time", formattime(currentTime));
		// 	refresh_field('from_time');
		// 	let laterTime = new Date(currentTime.getTime() + (1 * 60 + 30) * 60 * 1000);
		// 	frm.set_value("to_time", formattime(laterTime));
		// 	refresh_field('to_time');
		// }
		if(frm.doc.status=="Pending"){
			  frm.add_custom_button(__('Travel Request'), function(){
				//frappe.msgprint("Page Will Redirect In 6 Seconds.Please Wait")
				var interviewers = [];
				var description="Applicant Name: ";
				frappe.db.get_value('Job Applicant', {"name":frm.doc.job_applicant}, 'applicant_name', (r) => {
					description+=r.applicant_name+"\nInterview Date: "+frm.doc.scheduled_on+"\nCreated By: "
				})
				frappe.db.get_value(
					"Employee",
					{"user_id": frappe.session.user},
					["employee_name"],(r)=>{
						description+=r.employee_name
					}
				)
				/*frm.doc.interview_details.forEach(function (item) {
					frappe.db.get_value(
						"Employee",
						{"user_id": item.interviewer},
						["employee_name"],(r)=>{
							interviewers.push(r.employee_name)
						}
					)
					console.log(interviewers)
				})*/
				
				//setTimeout(() => {
				 frappe.db.get_value('Employee', {"user_id":frappe.session.user}, 'name', (r) => {
					frappe.new_doc("Travel Request", {
						travel_type: "Domestic",
						employee:r.name,
						purpose_of_travel:"Interview",
						description:description
					}).then(doc => {
						frappe.set_route("Form", doc.doctype, doc.name);
					});
				});
				//}, "6000");
				

				
				

			},__("Create"));
		}
   
	setup_teams_buttons(frm, {
            scheduled_on_field: 'scheduled_on',
            from_time_field: 'from_time',
            to_time_field: 'to_time',
            zoom_link_field: 'custom_zoom_link',
            event_id_field: 'custom_calendar_event_id',
            meeting_status_field: 'custom_meeting_status'
        }, {
            candidate_email_field: 'job_applicant',
            interviewers_field: 'interview_details',
            interviewers_fieldtype: 'Table'
        });
    }
	// after_save(frm){
	// 	frappe.call('recruitment.customizations.interview.interview.assign_interviews_to_interviewer', {
	// 		docname: frm.doc.name
	// 	   }).then(r => {
	// 		console.log(r.message)
	// 	   })
	// }
})
function formattime(isoTimestamp){
	const date = new Date(isoTimestamp);

	const istDate = new Date(date.getTime());

	const hours = istDate.getHours().toString().padStart(2, '0');
	const minutes = istDate.getMinutes().toString().padStart(2, '0');
	const seconds = istDate.getSeconds().toString().padStart(2, '0');
	
	const time = `${hours}:${minutes}:${seconds}`;
	return time
}
frappe.ui.form.on('Interview Detail', {
	interview_details_remove: function(frm, cdt, cdn) {
		frappe.db.get_list('User Permission', {
			fields: ['name'],
			filters: {"allow":"Interview","for_value":frm.doc.name}
		}).then(records => {
			records.forEach(element => {
				frappe.db.delete_doc("User Permission",element.name)
			});
		})
		
        // frappe.db.delete_doc("User Permission",{"allow":"Interview","for_value":frm.doc.name})
	}
})




// Hiring Manager table

frappe.ui.form.on('Interview', {
    refresh: function (frm) {
        let interview_html = ''; // Initialize empty HTML

        // Fetch Job Applicant details
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Job Applicant',
                name: frm.doc.job_applicant
            },
            callback: function (response) {
                let job_applicant = response.message;
                let education_html = '';

                // Handle educational qualifications safely
                if (Array.isArray(job_applicant.custom_educational_qualification) && job_applicant.custom_educational_qualification.length > 0) {
                    education_html = job_applicant.custom_educational_qualification.map(edu => `
                        <li>
                            <strong>School/Univ:</strong> ${edu.school_univ || '-'} |
                            <strong>Level:</strong> ${edu.level || '-'} |
                            <strong>Year:</strong> ${edu.year_of_passing || '-'} |
                            <strong>Percentage:</strong> ${edu.class_per || '-'} 
                            <br><strong>Additional Details:</strong> ${edu.custom_additional_details || '-'}
                        </li>
                    `).join('');
                } else {
                    education_html = '<li>No educational qualifications provided.</li>';
                }

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
        position: relative;
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

    .profile-img {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 130px;
        height: 130px;
        border-radius: 50%;
        object-fit: cover;
        box-shadow: 0 0 5px rgba(0,0,0,0.2);
    }
</style>

<div class="card-container">

    <!-- Basic Details -->
    <div class="summary-card">
        <div class="summary-header section-1">Basic Details</div>
        
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
            ${education_html}
        </ul>
    </div>

    <!-- Compensation & Attachments -->
    <div class="summary-card">
        <div class="summary-header section-3">CTC & Documents</div>
        <ul>
            <li><strong>Current CTC:</strong> ${job_applicant.custom_current_salaryctc || '-'}</li>
            <li><strong>Expected CTC:</strong> ${job_applicant.custom_expected_ctc || '-'}</li>
            <li><strong>Resume:</strong><br/>
                <a href="https://erpprd.microcrispr.com/${job_applicant.resume_attachment}" target="_blank">
                    ${job_applicant.resume_attachment ? 'View Resume' : 'Not Uploaded'}
                </a>
            </li>
            <li><strong>MAT Attachment:</strong><br/>
                <a href="https://erpprd.microcrispr.com/${job_applicant.custom_mat_report}" target="_blank">
                    ${job_applicant.custom_mat_report ? 'View MAT Report' : 'Not Uploaded'}
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

                // Inject the HTML
                frm.fields_dict.custom_hiring_manager_table.$wrapper.html(job_applicant_html);
            }
        });
    }
});



// Custom Table Interview

frappe.ui.form.on('Interview', {
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
                fields: ['interview_round', 'interviewer', 'result', 'feedback', 'custom_ctc', 'custom_bond'],
                order_by: 'feedback desc' // Ensure feedback is sorted by interview round
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
                    <li><strong>Offered CTC:</strong> ${feedback.custom_ctc || '-'}</li>
                    <li><strong>Bond:</strong> ${feedback.custom_bond || '-'}</li>
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

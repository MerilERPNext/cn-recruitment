frappe.ui.form.on('Interview Feedback', {
    refresh: function(frm) {
        render_applicant_and_feedback(frm);
    },
    job_applicant: function(frm) {
        render_applicant_and_feedback(frm);
    },
    interview: function(frm) {
        if (!frm.doc.job_applicant && frm.doc.interview) {
            frappe.db.get_value('Interview', frm.doc.interview, 'job_applicant').then(r => {
                if (r && r.message && r.message.job_applicant) {
                    frm.set_value('job_applicant', r.message.job_applicant);
                } else {
                    render_applicant_and_feedback(frm);
                }
            });
        } else {
            render_applicant_and_feedback(frm);
        }
    }
});

function render_applicant_and_feedback(frm) {
    const target_field = frm.fields_dict.custom_custom_table || frm.fields_dict.custom_table;
    if (!target_field || !target_field.$wrapper) {
        return;
    }

    const applicant_id = frm.doc.job_applicant;
    if (!applicant_id) {
        target_field.$wrapper.html(`
            <div style="font-family: inherit; margin: 25px 0; padding: 40px; text-align: center; background: var(--bg-light-gray, #f8f9fa); border-radius: 12px; border: 1px dashed var(--border-color, #d1d5db);">
                <div style="font-size: 38px; margin-bottom: 12px;">👤</div>
                <h4 style="font-size: 18px; font-weight: 600; color: var(--text-color, #111827); margin-bottom: 6px;">No Job Applicant Selected</h4>
                <p style="font-size: 13px; color: var(--text-muted, #6b7280); margin: 0;">Please select an Interview or Job Applicant to view candidate details and previous round feedbacks.</p>
            </div>
        `);
        return;
    }

    // 1. Fetch Job Applicant Details
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Job Applicant',
            name: applicant_id
        },
        callback: function(app_res) {
            const applicant = app_res.message || {};

            // 2. Fetch Interview Feedback records for this applicant
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Interview Feedback',
                    filters: {
                        job_applicant: applicant_id,
                        docstatus: ['<', 2] // Exclude cancelled feedbacks
                    },
                    fields: [
                        'name',
                        'interview',
                        'interview_round',
                        'interviewer',
                        'result',
                        'feedback',
                        'custom_ctc',
                        'custom_bond',
                        'average_rating',
                        'creation',
                        'docstatus'
                    ],
                    order_by: 'creation asc'
                },
                callback: function(fb_res) {
                    const all_feedbacks = fb_res.message || [];

                    // Filter only PREVIOUS feedbacks for this applicant:
                    // If creating a new feedback, all existing feedbacks are previous rounds.
                    // If viewing an existing feedback, show feedbacks created strictly before this document.
                    let prev_feedbacks = [];
                    if (frm.is_new() || !frm.doc.name) {
                        prev_feedbacks = all_feedbacks;
                    } else {
                        prev_feedbacks = all_feedbacks.filter(fb => {
                            if (fb.name === frm.doc.name) {
                                return false;
                            }
                            if (frm.doc.creation && fb.creation) {
                                return new Date(fb.creation) < new Date(frm.doc.creation);
                            }
                            return true;
                        });
                    }

                    const html = build_dashboard_html(applicant, prev_feedbacks);
                    target_field.$wrapper.html(html);
                }
            });
        }
    });
}

function build_dashboard_html(applicant, feedbacks) {
    const colors = ['#4F46E5', '#059669', '#D97706', '#7C3AED', '#2563EB', '#DC2626'];
    const icons = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

    let feedbacks_html = '';

    if (feedbacks && feedbacks.length > 0) {
        feedbacks.forEach((fb, idx) => {
            const color = colors[idx % colors.length];
            const icon = icons[idx % icons.length];
            const round_name = fb.interview_round || `Round ${idx + 1}`;
            const creation_date = fb.creation ? frappe.datetime.str_to_user(fb.creation) : 'N/A';

            let result_badge = '';
            if (fb.result === 'Cleared') {
                result_badge = `<span class="badge" style="background-color: #ECFDF5; color: #047857; font-weight: 600; padding: 4px 10px; border-radius: 9999px; font-size: 12px; border: 1px solid #A7F3D0;">Cleared</span>`;
            } else if (fb.result === 'Rejected') {
                result_badge = `<span class="badge" style="background-color: #FEF2F2; color: #B91C1C; font-weight: 600; padding: 4px 10px; border-radius: 9999px; font-size: 12px; border: 1px solid #FECACA;">Rejected</span>`;
            } else {
                result_badge = `<span class="badge" style="background-color: #FFFBEB; color: #B45309; font-weight: 600; padding: 4px 10px; border-radius: 9999px; font-size: 12px; border: 1px solid #FDE68A;">${fb.result || 'Pending'}</span>`;
            }

            let rating_html = '';
            if (fb.average_rating) {
                rating_html = `
                    <div class="feedback-field">
                        <div class="field-label"><span class="bold">Rating:</span> ${fb.average_rating} ⭐</div>
                    </div>
                `;
            }

            feedbacks_html += `
                <div class="feedback-item">
                    <div class="feedback-round-header" style="background-color: ${color}">
                        <div class="round-left">
                            <span class="round-icon">${icon}</span>
                            <span class="round-title">${frappe.utils.escape_html(round_name)}</span>
                        </div>
                        <div class="round-right">
                            <span class="round-date">📅 ${creation_date}</span>
                        </div>
                    </div>
                    <div class="feedback-details">
                        <div class="feedback-grid">
                            <div class="feedback-field">
                                <div class="field-label"><span class="bold">Interviewer:</span> ${frappe.utils.escape_html(fb.interviewer || 'Not specified')}</div>
                            </div>
                            <div class="feedback-field">
                                <div class="field-label"><span class="bold">Result:</span> ${result_badge}</div>
                            </div>
                            ${rating_html}
                            <div class="feedback-field">
                                <div class="field-label"><span class="bold">Offered CTC:</span> ${fb.custom_ctc ? frappe.format(fb.custom_ctc, {fieldtype: 'Currency'}) : 'Not specified'}</div>
                            </div>
                            <div class="feedback-field">
                                <div class="field-label"><span class="bold">Bond Period:</span> ${frappe.utils.escape_html(fb.custom_bond || 'Not specified')}</div>
                            </div>
                            <div class="feedback-field full-width">
                                <div class="field-label"><span class="bold">Feedback Details:</span></div>
                                <div class="feedback-text-box">${frappe.utils.escape_html(fb.feedback || 'No feedback details recorded.')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        feedbacks_html = `
            <div class="no-feedback">
                <div style="font-size: 36px; margin-bottom: 10px;">📋</div>
                <h4 style="font-weight: 600; margin-bottom: 6px;">No Previous Feedback Available</h4>
                <p style="margin: 0; color: #6b7280; font-size: 13px;">No previous interview feedback has been recorded for this candidate yet. (Initial Round)</p>
            </div>
        `;
    }

    // Resume download/view button
    let resume_html = '-';
    if (applicant.resume_attachment) {
        resume_html = `<a href="${frappe.utils.escape_html(applicant.resume_attachment)}" target="_blank" style="color: #4F46E5; font-weight: 600; text-decoration: underline;">📄 View Resume</a>`;
    } else if (applicant.resume_link) {
        resume_html = `<a href="${frappe.utils.escape_html(applicant.resume_link)}" target="_blank" style="color: #4F46E5; font-weight: 600; text-decoration: underline;">🔗 Resume Link</a>`;
    }

    // MAT Report
    let mat_html = '';
    if (applicant.custom_mat_report) {
        mat_html = `
            <div class="summary-item">
                <div class="icon">📑</div>
                <div class="content">
                    <div class="label">MAT Report</div>
                    <div class="value"><a href="${frappe.utils.escape_html(applicant.custom_mat_report)}" target="_blank" style="color: #fff; text-decoration: underline;">View Report</a></div>
                </div>
            </div>
        `;
    }

    return `
<style>
    .hiring-dashboard {
        font-family: inherit;
        margin: 15px 0;
        display: flex;
        gap: 20px;
        align-items: flex-start;
    }
    
    .applicant-summary-box {
        width: 320px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
        flex-shrink: 0;
    }
    
    .applicant-summary-box h3 {
        margin: 0 0 16px 0;
        font-size: 20px;
        font-weight: 700;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.25);
        padding-bottom: 12px;
        color: white;
    }
    
    .summary-item {
        margin-bottom: 12px;
        display: flex;
        align-items: center;
    }
    
    .summary-item .icon {
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
        font-size: 13px;
        flex-shrink: 0;
    }
    
    .summary-item .content {
        flex: 1;
        min-width: 0;
    }
    
    .summary-item .label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.85;
        margin-bottom: 2px;
    }
    
    .summary-item .value {
        font-weight: 600;
        font-size: 13.5px;
        word-break: break-word;
        color: #ffffff;
    }
    
    .feedback-section {
        flex: 1;
        min-width: 0;
    }
    
    .feedback-header {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 14px 14px 0 0;
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .feedback-container {
        background: var(--bg-light-gray, #f8f9fa);
        border: 1px solid var(--border-color, #e5e7eb);
        border-top: none;
        border-radius: 0 0 14px 14px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        padding: 15px;
    }
    
    .feedback-item {
        background: white;
        margin-bottom: 15px;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        border: 1px solid var(--border-color, #e5e7eb);
        overflow: hidden;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    
    .feedback-item:last-child {
        margin-bottom: 0;
    }
    
    .feedback-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
    }
    
    .feedback-round-header {
        padding: 10px 16px;
        color: white;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    .feedback-round-header .round-left {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .feedback-round-header .round-icon {
        font-size: 15px;
    }
    
    .feedback-round-header .round-title {
        font-size: 14px;
        letter-spacing: 0.3px;
    }
    
    .feedback-round-header .round-date {
        font-size: 12px;
        opacity: 0.9;
        font-weight: normal;
    }
    
    .feedback-details {
        padding: 16px;
        background: white;
    }
    
    .feedback-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }
    
    .feedback-field {
        display: flex;
        flex-direction: column;
    }
    
    .feedback-field.full-width {
        grid-column: 1 / -1;
    }
    
    .feedback-field .field-label {
        font-size: 13px;
        color: #374151;
    }
    
    .feedback-field .bold {
        font-weight: 600;
        color: #111827;
    }
    
    .feedback-text-box {
        margin-top: 6px;
        padding: 10px 14px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        font-size: 13px;
        color: #1f2937;
        line-height: 1.5;
        white-space: pre-wrap;
    }
    
    .no-feedback {
        text-align: center;
        padding: 35px 20px;
        color: #6b7280;
    }
    
    @media (max-width: 860px) {
        .hiring-dashboard {
            flex-direction: column;
        }
        
        .applicant-summary-box {
            width: 100%;
        }
        
        .feedback-grid {
            grid-template-columns: 1fr;
        }
    }
</style>

<div class="hiring-dashboard">
    <!-- Left Column: Candidate Profile -->
    <div class="applicant-summary-box">
        <h3>👤 Candidate Profile</h3>
        
        <div class="summary-item">
            <div class="icon">👤</div>
            <div class="content">
                <div class="label">Name</div>
                <div class="value">${frappe.utils.escape_html(applicant.applicant_name || 'N/A')}</div>
            </div>
        </div>
        
        <div class="summary-item">
            <div class="icon">📧</div>
            <div class="content">
                <div class="label">Email</div>
                <div class="value">${frappe.utils.escape_html(applicant.email_id || 'N/A')}</div>
            </div>
        </div>

        <div class="summary-item">
            <div class="icon">📱</div>
            <div class="content">
                <div class="label">Phone</div>
                <div class="value">${frappe.utils.escape_html(applicant.phone_number || 'N/A')}</div>
            </div>
        </div>
        
        <div class="summary-item">
            <div class="icon">🏢</div>
            <div class="content">
                <div class="label">Department</div>
                <div class="value">${frappe.utils.escape_html(applicant.custom_department || 'N/A')}</div>
            </div>
        </div>
        
        <div class="summary-item">
            <div class="icon">💼</div>
            <div class="content">
                <div class="label">Designation</div>
                <div class="value">${frappe.utils.escape_html(applicant.designation || applicant.job_title || 'N/A')}</div>
            </div>
        </div>

        <div class="summary-item">
            <div class="icon">⏳</div>
            <div class="content">
                <div class="label">Total Experience</div>
                <div class="value">${frappe.utils.escape_html(applicant.custom_total_experience || 'N/A')}</div>
            </div>
        </div>

        <div class="summary-item">
            <div class="icon">💵</div>
            <div class="content">
                <div class="label">Current CTC</div>
                <div class="value">${applicant.custom_current_salaryctc || applicant.custom_previous_salary || 'N/A'}</div>
            </div>
        </div>
        
        <div class="summary-item">
            <div class="icon">💰</div>
            <div class="content">
                <div class="label">Expected CTC</div>
                <div class="value">${applicant.custom_expected_ctc || 'N/A'}</div>
            </div>
        </div>

        <div class="summary-item">
            <div class="icon">📅</div>
            <div class="content">
                <div class="label">Notice Period</div>
                <div class="value">${frappe.utils.escape_html(applicant.custom_notice_period || 'N/A')}</div>
            </div>
        </div>
        
        <div class="summary-item">
            <div class="icon">📊</div>
            <div class="content">
                <div class="label">Applicant Status</div>
                <div class="value">${frappe.utils.escape_html(applicant.status || 'N/A')}</div>
            </div>
        </div>

        <div class="summary-item">
            <div class="icon">📎</div>
            <div class="content">
                <div class="label">Resume</div>
                <div class="value">${resume_html}</div>
            </div>
        </div>

        ${mat_html}
    </div>
    
    <!-- Right Column: Previous Interview Feedback -->
    <div class="feedback-section">
        <div class="feedback-header">
            <span>📝 Previous Interview Feedback</span>
            <span style="font-size: 13px; font-weight: normal; opacity: 0.9;">Total Rounds: ${feedbacks.length}</span>
        </div>
        <div class="feedback-container">
            ${feedbacks_html}
        </div>
    </div>
</div>
    `;
}

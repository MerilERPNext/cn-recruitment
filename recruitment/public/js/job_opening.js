frappe.ui.form.on("Job Opening", {
  refresh: function (frm) {
    render_jd_live_preview(frm);
    frm.set_query("custom_division", function () {
      return {
        filters: {
          is_group: 1,
        },
      };
    });
    frm.set_query("department", function () {
      return {
        filters: {
          is_group: 0,
          parent_department: frm.doc.custom_division,
        },
      };
    });
  },
  after_save: function (frm) {
    frappe.call({
      method:
        "recruitment.customizations.job_opening.job_opening.generate_job_applicant",
      args: {
        docname: frm.doc.name,
      },
      callback: function (r) {
        // code snippet
      },
    });
    if (frm.is_new()) {
      // Perform actions only if the document is new
      frappe.db
        .set_value(
          "Job Requisition",
          frm.doc.job_requisition,
          "status",
          "Job Opening Created"
        )
        .then((r) => {});
    }
  },
  job_requisition: function (frm) {
    if (frm.doc.job_requisition) {
      frappe.call({
        method:
          "recruitment.customizations.job_opening.job_opening.get_job_title",
        args: {
          job_requisition: frm.doc.job_requisition,
        },
        callback: function (r) {
          if (r.message) {
            frm.clear_table("custom_qualifications");

            r.message.forEach(function (row) {
              var new_row = frm.add_child("custom_qualifications");
              new_row.schooluniversity = row.schooluniversity;
              new_row.qualification = row.qualification;
              new_row.level = row.level;
              new_row.year_of_passing = row.year_of_passing;
            });

            frm.refresh_field("custom_qualifications");
          }
        },
      });
    } else {
      frm.clear_table("custom_qualifications");
      frm.refresh_field("custom_qualifications");
    }
  },
  custom_job_description_template: function (frm) {
    if (!frm.doc.custom_job_description_template) {
      frm.set_value("custom_jd_details", []);
      render_jd_live_preview(frm);
      return;
    }

    frappe.db
      .get_doc(
        "Job Description Template",
        frm.doc.custom_job_description_template
      )
      .then((template) => {
        if (!template || !template.jd_details) return;

        frm.set_value("custom_jd_details", []);

        template.jd_details.forEach((row) => {
          const new_row = frm.add_child("custom_jd_details");
          new_row.label = row.label;
          new_row.description = row.description;
        });

        frm.refresh_field("custom_jd_details");

        setTimeout(() => {
          render_jd_live_preview(frm);
        }, 200);
      });
  },
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
                    <textarea rows="4" data-index="${index}">${
      row.description || ""
    }</textarea>
                </div>
            </div>
        `;
  });

  wrapper.html(html);

  wrapper.find("textarea").on("input", function () {
    const i = $(this).data("index");
    frm.doc.custom_jd_details[i].description = $(this).val();
    frm.dirty();
  });
}

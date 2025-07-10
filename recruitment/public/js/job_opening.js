frappe.ui.form.on("Job Opening", {
  refresh: function (frm) {
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
  before_save: function (frm) {
        if (frm.is_new()) {
            let designation = frm.doc.designation
            let posted_on = frm.doc.posted_on
            
            frm.set_value('route', `${posted_on}-${designation}`);
    }
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
      update_description_field(frm)
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
          update_description_field(frm);
        }, 200);
      });
  },
});


function update_description_field(frm) {
    const rows = frm.doc.custom_jd_details || [];
    if (!rows.length) {
        frm.set_value("description", "");
        return;
    }

    let html = "";

    rows.forEach(row => {
        if (row.label) {
            html += `<p><strong>${frappe.utils.escape_html(row.label.trim())}</strong></p>`;
        }
        if (row.description) {
            const lines = row.description.trim().split("\n");
            lines.forEach(line => {
                if (line.trim()) {
                    html += `<p>${frappe.utils.escape_html(line.trim())}</p>`;
                }
            });
        }
        html += `<p><br></p>`;  // Spacer between sections
    });

    frm.set_value("description", html);
}

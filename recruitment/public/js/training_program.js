frappe.ui.form.on('Training Program Day Plan', {
    training_material: function(frm, cdt, cdn) {
        update_day_numbers(frm);
    },
    custom__day_wise_plan_add: function(frm, cdt, cdn) {
        update_day_numbers(frm);
    }
});

frappe.ui.form.on('Training Program', {
    onload_post_render(frm) {
        frm.fields_dict.custom__day_wise_plan.grid.wrapper.on('mouseup', function() {
            update_day_numbers(frm);
        });
    },
    validate(frm) {
        update_day_numbers(frm);
    }
});

function update_day_numbers(frm) {
    frm.doc.custom__day_wise_plan.forEach((row, index) => {
        row.day_number = index + 1;
    });
    frm.refresh_field('custom__day_wise_plan');
}

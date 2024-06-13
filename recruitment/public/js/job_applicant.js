frappe.ui.form.on('Job Applicant', {
    refresh(frm) {


        if (!frm.is_new())
            {
                



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
            frm.doc.custom_crm_note.forEach(note => {
                let noteDiv = document.createElement('div');
                noteDiv.className = "comment-content p-3 row";
                noteDiv.innerHTML = `
                    <table style="width:100%">
                        <tr>
                        <td class="hide-name-column" >${note.name}</td>
                        <td style="width:20%">${note.custom_comment_type}</td>
                         
                            <td style="width:40%">${note.note}</td>
                            <td style="width:30%">${note.added_by}<br>
                            
                            ${frappe.datetime.global_date_format(note.added_on)}</td>

                            
                            
                            <td style="width:5%"><button class="edit-note-btn btn btn-sm btn-primary" data-note="${note.note}"><svg class="icon icon-sm"><use xlink:href="#icon-edit"></use></svg></button></td>
                            <td style="width:5%"><button class="delete-note-btn btn btn-sm btn-primary" data-note="${note.note}"><svg class="icon icon-sm"><use xlink:href="#icon-delete"></use></svg></button></td>

                        </tr>

                    </table>`;
                allNotesSection.appendChild(noteDiv);
            });
        }

        let newNoteBtn = frm.get_field("custom_notes_html").wrapper.querySelector('.new-note-btn');
        newNoteBtn.addEventListener('click', () => {
            frappe.prompt([

                {
                    fieldname: 'comment_type',
                    fieldtype: 'Select',
                    label: 'Comment Type',
                    options:["Recruitment","CTC Discussion","Educational Qualification Discussion"]
                },
                {
                    fieldname: 'notes',
                    fieldtype: 'Text',
                    label: 'Notes',
                    reqd: true,
                }
            ], (values) => {
                var child = frm.add_child("custom_crm_note");

                
                frappe.model.set_value(child.doctype, child.name, "note", values.notes);
                frappe.model.set_value(child.doctype, child.name, "added_by", frappe.session.user);
                frappe.model.set_value(child.doctype, child.name, "added_on", frappe.datetime.now_datetime());
                frappe.model.set_value(child.doctype, child.name, "custom_comment_type", values.comment_type);
                frm.refresh_field("custom_crm_note");
                frm.save()
            }, 'Add Notes', 'Submit');
        });

        allNotesSection.querySelectorAll('.edit-note-btn').forEach((btn,idx) => {
            btn.addEventListener('click', (event) => {
                let noteValue = event.target.getAttribute('data-note');
                let nameValue = event.target.closest('tr').querySelector('td:nth-child(1)').innerText;
                // console.log("Name:", nameValue);


                $.each(frm.doc.custom_crm_note,function(i,v)
            {
                if (v.name == nameValue) {
                    frappe.prompt([{
                        fieldname: 'notes',
                        fieldtype: 'Text',
                        label: 'Notes',
                        reqd: true,
                        'default': v.note
                    }], (values) => {
                        let childDoc = frm.doc.custom_crm_note.find(child => child.name == nameValue);
            
                        if (childDoc) {
                            childDoc.note = values.notes;
                            frm.refresh_field('custom_crm_note');
                        }

                        if(frm.doc.custom_check==0)
                            {
                                frm.set_value("custom_check",1)
                            }
                            else{
                                frm.set_value("custom_check",0)
                            }
    
                            frm.save()



                    }, 'Edit Note', 'Submit');


                    




                }

                           
                        
                    })



                
                
            });
        }); 



        

                allNotesSection.querySelectorAll('.delete-note-btn').forEach((btn,idx) => {
                    btn.addEventListener('click', (event) => {
                        let noteValue = event.target.getAttribute('data-note');
                        let nameValue = event.target.closest('tr').querySelector('td:nth-child(1)').innerText;
                        // console.log("Name:", nameValue);


                        $.each(frm.doc.custom_crm_note,function(i,v)
                    {
                        if(v.name==nameValue)
                            {
                                // console.log(v.note)

                                frm.doc.custom_crm_note.splice(i, 1);
                                    
                                    frm.refresh_field('custom_crm_note');
                                    

                                    


                                    if(frm.doc.custom_check==0)
                                        {
                                            frm.set_value("custom_check",1)
                                        }
                                        else{
                                            frm.set_value("custom_check",0)
                                        }

                                        frm.save()

                                        return false;

                            }
                        })






                    });
                });
                


            }        
               
    }
});

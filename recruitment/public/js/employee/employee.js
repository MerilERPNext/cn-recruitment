frappe.ui.form.on('Employee', {
    refresh: function(frm) {
        if (!frm.doc.docstatus) { // Only apply if document is not submitted
            // Hide the "Status" column in the table view
            frm.fields_dict['custom_documents_for_verification'].grid.wrapper
                .find('.grid-static-col[data-fieldname="status"]').remove();

            
        }
    }
});

frappe.ui.form.on('custom_documents_for_verification', {
    form_render: function(frm, cdt, cdn) {
        // Hide "Status" field inside the row edit popup
        frappe.meta.get_docfield("custom_documents_for_verification", "status", frm).hidden = 1;
        frm.refresh_field("custom_documents_for_verification");
    }
});



frappe.ui.form.on('Employee', {
    async before_save(frm) {
        console.log('Employee Form Refresh:', {
            image_url: frm.doc.image,
            from_date: frm.doc.custom_from_date,
            to_date: frm.doc.custom_to_date,
            employee_id: frm.doc.employee
        });
        
        // Show image preview
        if (frm.doc.image && frm.fields_dict.custom_photo) {
            frm.fields_dict.custom_photo.$wrapper.html(`
                <div style="margin-top: 10px;">
                    <img src="${frm.doc.image}" style="max-height: 150px; border-radius: 8px;" />
                </div>
            `);
        } else if (frm.fields_dict.custom_photo) {
            frm.fields_dict.custom_photo.$wrapper.html(`<p>No image available</p>`);
        }
        
        if (!frm.doc.custom_from_date || !frm.doc.custom_to_date) {
            console.warn('Date fields incomplete:', {
                from_date: frm.doc.custom_from_date,
                to_date: frm.doc.custom_to_date
            });
            return;
        }
        
        const parseExtraHours = (str) => {
            if (!str || str === '0') return 0;
            let hours = 0, minutes = 0;
            const hrMatch = str.match(/(\d+)\s*hrs?/i);
            const minMatch = str.match(/(\d+)\s*mins?/i);
            if (hrMatch) hours = parseInt(hrMatch[1]);
            if (minMatch) minutes = parseInt(minMatch[1]);
            return hours + (minutes / 60);
        };
        
        const calculateWorkingHours = (checkins) => {
            const checkinsGrouped = {};
            checkins.forEach(checkin => {
                const date = checkin.time.split(' ')[0];
                if (!checkinsGrouped[date]) {
                    checkinsGrouped[date] = [];
                }
                checkinsGrouped[date].push(checkin);
            });
            const dailyHours = {};
            let totalWorkingHours = 0;
            let totalExtraHours = 0;
            const dailyThreshold = 8.5;
            Object.keys(checkinsGrouped).forEach(date => {
                const logs = checkinsGrouped[date];
                logs.sort((a, b) => new Date(a.time) - new Date(b.time));
                if (logs.length >= 2) {
                    const first = new Date(logs[0].time);
                    const last = new Date(logs[logs.length - 1].time);
                    const hours = (last - first) / (1000 * 60 * 60);
                    dailyHours[date] = {
                        attendanceId: logs[0].attendance || null,
                        checkInTime: logs[0].time,
                        checkOutTime: logs[logs.length - 1].time,
                        hours
                    };
                    totalWorkingHours += hours;
                    if (hours > dailyThreshold) {
                        totalExtraHours += (hours - dailyThreshold);
                    }
                }
            });
            return {
                totalWorkingHours,
                totalExtraHours,
                dailyHours
            };
        };
        
        const fetchRecords = async (doctype, filters, fields) => {
            try {
                const response = await frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype,
                        filters,
                        fields,
                        limit_page_length: 0
                    }
                });
                return response.message || [];
            } catch (err) {
                console.error(`Error fetching ${doctype}:`, err);
                return [];
            }
        };
        
        // Helper function to calculate days between two dates
        const calculateDaysBetween = (fromDate, toDate, includeHolidays = false) => {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            
            // Calculate total days (inclusive)
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
            
            return diffDays;
        };
        
        const fetchAttendance = async () => {
            const attendanceRecords = await fetchRecords('Attendance', {
                employee: frm.doc.employee,
                attendance_date: ['between', [frm.doc.custom_from_date, frm.doc.custom_to_date]],
                status: 'Present'
            }, ['name', 'attendance_date', 'status', 'custom_extra_working_hrs']);
            const checkins = await fetchRecords('Employee Checkin', {
                employee: frm.doc.employee,
                time: ['between', [frm.doc.custom_from_date, frm.doc.custom_to_date]]
            }, ['time', 'shift', 'log_type', 'device_id', 'attendance']);
            const workingData = calculateWorkingHours(checkins);
            const hrs = Math.floor(workingData.totalWorkingHours);
            const mins = Math.round((workingData.totalWorkingHours - hrs) * 60);
            const formattedTotal = `${hrs}h ${mins}m`;
            
            console.log("formattedTotal", formattedTotal);
            if (frm.fields_dict.custom_total_working_hours) {
                await frm.set_value('custom_total_working_hours', formattedTotal);
            }
            const extraHrs = Math.floor(workingData.totalExtraHours);
            const extraMins = Math.round((workingData.totalExtraHours - extraHrs) * 60);
            const formattedExtra = `${extraHrs}h ${extraMins}m`;
            
            console.log("formattedExtra", formattedExtra);
            await frm.set_value('custom_total_extra_working_hrs', formattedExtra);
            console.log('Daily Working Hours:', workingData.dailyHours);
            console.log('Attendance Details:', Object.entries(workingData.dailyHours).map(([date, data]) => ({
                date,
                attendance_id: data.attendanceId,
                check_in: data.checkInTime,
                check_out: data.checkOutTime,
                working_hours: data.hours.toFixed(2)
            })));
        };
        
        const fetchLeaveApplications = async () => {
            const filters = {
                employee: frm.doc.employee,
                from_date: ['between', [frm.doc.custom_from_date, frm.doc.custom_to_date]],
                status: 'Approved'
            };
            const records = await fetchRecords('Leave Application', filters, ['name', 'from_date', 'to_date', 'status', 'total_leave_days']);
            console.log('Fetch Filters:', filters);
            console.log('Fetched Leave Applications:', records);
            if (records.length === 0) {
                console.warn('No leave applications found. Check date range or status.');
            }
            // Sum the total_leave_days instead of counting applications
            window.leaveApplications = records.reduce((sum, rec) => sum + (rec.total_leave_days || 0), 0);
            console.log('Total Leave Days:', window.leaveApplications);
        };
        
        const fetchAttendanceRequests = async () => {
            const records = await fetchRecords('Attendance Request', {
                employee: frm.doc.employee,
                from_date: ['between', [frm.doc.custom_from_date, frm.doc.custom_to_date]],
                workflow_state: ['in', ['Approved By Department HOD', 'Approved By HR Head']]
            }, ['name', 'from_date', 'to_date', 'half_day', 'include_holidays']);
            
            console.log('Fetched Attendance Requests:', records);
            
            // Calculate total days for all attendance requests
            let totalOnDutyDays = 0;
            records.forEach(rec => {
                const days = calculateDaysBetween(rec.from_date, rec.to_date, rec.include_holidays);
                const finalDays = rec.half_day ? days * 0.5 : days;
                totalOnDutyDays += finalDays;
                
                console.log(`Attendance Request ${rec.name}:`, {
                    from_date: rec.from_date,
                    to_date: rec.to_date,
                    calculated_days: days,
                    half_day: rec.half_day,
                    final_days: finalDays
                });
            });
            
            window.attendanceRequests = totalOnDutyDays;
            console.log('Total OnDuty Days:', totalOnDutyDays);
        };
        
        const fetchAbsentAttendance = async () => {
            const records = await fetchRecords('Attendance', {
                employee: frm.doc.employee,
                attendance_date: ['between', [frm.doc.custom_from_date, frm.doc.custom_to_date]],
                status: 'Absent'
            }, ['name']);
            window.absentAttendances = records.length;
            console.log('Total Absent Days:', records.length);
        };
        
        try {
            await Promise.all([
                fetchAttendance(),
                fetchLeaveApplications(),
                fetchAttendanceRequests(),
                fetchAbsentAttendance()
            ]);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
        
        const leaveApplications = window.leaveApplications || 0;
        const attendanceRequests = window.attendanceRequests || 0;
        const absentAttendances = window.absentAttendances || 0;
        
        console.log('Final Summary:', {
            total_leave: leaveApplications,
            total_onduty: attendanceRequests,
            total_absent: absentAttendances
        });
        
        frm.clear_table('custom_details');
        frm.add_child('custom_details', {
            total_leave: leaveApplications,
            total_onduty: attendanceRequests,
            total_absent: absentAttendances
        });
        frm.refresh_field('custom_details');
    }
});
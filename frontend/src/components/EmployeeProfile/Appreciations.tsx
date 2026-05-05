import { useState } from "react";
import toast from "react-hot-toast";
import { useAppreciateAnEmployeeMutation, useGetEmployeeAppreciations } from "../../hooks/useEmployee";
import CustomDropdown from "../shared/CustomDropdown";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import CircularLoader from "../shared/atoms/CircularLoader";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { CustomError } from "../../types/attendance";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { useQueryClient } from "@tanstack/react-query";

const Appreciations = () => {
    const [modal, setModal] = useState({
        open: false,
        reason: "",
        type: ""
    });

    // Get effective target employee
    const { targetEmployeeId } = useTargetUser();
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const queryClient = useQueryClient();
    const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;
    const { data: employeeAppreciations } = useGetEmployeeAppreciations();
    const { mutate: appreciateEmployee, isPending: isSubmitting } = useAppreciateAnEmployeeMutation();

    const handleSubmit = () => {
        if (!modal.reason.trim()) {
            toast.error("Please enter a reason for appreciation");
            return;
        }

        if (!effectiveEmployeeId) {
            toast.error("Employee information not found");
            return;
        }

        appreciateEmployee(
            {
                employee: effectiveEmployeeId,
                recognition_type: modal.type,
                reason: modal.reason
            },
            {
                onSuccess: () => {
                    toast.success("Appreciation sent successfully!");
                    setModal({ open: false, reason: "", type: "" });
                    queryClient.invalidateQueries({ queryKey: ['all-emp-appreciations-badges'] })
                },
                onError: (error: CustomError) => {
                    const err = errorResponseFormater(error);
                    toast.error(err || "Failed to send appreciation");
                }
            }
        );
    };

    return (
        <div>
            <div className="flex items-center gap-2">
                <CustomDropdown
                    label="Appreciate"
                    value={""}
                    position="bottom-right"
                    contentAlign="start"
                    onChange={(e) => {
                        setModal({ open: true, reason: "", type: e.target.value })
                    }}
                    options={employeeAppreciations?.badges?.map((item) => ({
                        label: item?.recognition_type_name,
                        value: item?.recognition_type_code,
                    })) || []}
                />
            </div>

            <Modal
                size="sm"
                isOpen={modal.open}
                onClose={() => setModal({ ...modal, open: false })}
            >
                <div className="space-y-4 p-2">
                    {/* Badge Typ Display */}
                    <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                        <Typography variant="label" color="primary" className="block mb-1 font-semibold">
                            Appreciation Type
                        </Typography>
                        <Typography variant="bodyMedium" className="font-bold text-primary-900">
                            {modal.type}
                        </Typography>
                    </div>

                    {/* Reason Input */}
                    <div>
                        <Typography variant="label" className="block mb-2 font-medium">
                            Reason *
                        </Typography>
                        <textarea
                            value={modal.reason}
                            onChange={(e) => setModal({ ...modal, reason: e.target.value })}
                            placeholder="Why are you appreciating this employee? (e.g., Outstanding performance on Project X)"
                            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="subtle"
                            onClick={() => setModal({ ...modal, open: false })}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contain"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="min-w-[100px]"
                        >
                            {isSubmitting ? <CircularLoader size="sm" color="white" /> : "Submit"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default Appreciations
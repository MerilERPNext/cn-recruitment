import { Form } from "@tsed/react-formio";
import Modal from "../shared/Modal"
import { X } from "lucide-react"
import formSchema from "./employmentHistoryFormSchema.json"
import Button from "../shared/atoms/Button";
const EmploymentHistoryForm = ({ isModalOpen, setIsModalOpen }: { isModalOpen: string | null, setIsModalOpen: (value: string | null) => void }) => {

    const title = isModalOpen === 'edit' ? 'Edit Employment History' : 'Add Employment History'
    return (
        <Modal isOpen={!!isModalOpen} onClose={() => { setIsModalOpen(null) }} size="sm">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
                <h2 className="text-xl font-semibold">{title}</h2>
                <button
                    onClick={() => setIsModalOpen(null)}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                >
                    <X />
                </button>
            </div>
            <div className="p-6">
                <Form
                    form={formSchema}
                    // submission={initialSubmission}
                    options={{
                        submitButton: false,
                    }}


                />
            </div>
            <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 border-t">
                <Button
                    onClick={() => { setIsModalOpen(null) }}
                    fullWidth
                    size="lg"
                    variant="contain"
                    bgColor="blue-600"
                    textColor="white"
                    className="hover:bg-blue-700 font-medium"
                >
                    {"Submit Request"}
                </Button>
            </div>
        </Modal>
    )
}

export default EmploymentHistoryForm
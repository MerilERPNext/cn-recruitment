"use client"

import { useState } from "react"
import { useScreenSize } from "../../../../hooks/useScreenSize"
import { FormIOComponent, FormIOSchema } from "../../../../types/formio"
import { createPortal } from "react-dom"
import { Form } from "@tsed/react-formio"
import { X } from "lucide-react"

interface ApprovalStage {
  stage_name: string | null
  user: string | null
  role: string | null
  status: string
  form_json?: {
    components: FormIOComponent[]
  }
}

interface ApprovalStagesProps {
  stages: ApprovalStage[]
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Approved":
      return (
        <div className="w-6 h-6 bg-green-500  text-white rounded-full">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )
    case "Pending":
      return (
        <div className="w-6 h-6 bg-yellow-500  text-white rounded-full ">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )
    case "Rejected":
      return (
        <div className="w-6 h-6 bg-red-500  text-white rounded-full">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )
    default:
      return null
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Approved":
      return "text-green-600"
    case "Pending":
      return "text-yellow-600"
    case "Rejected":
      return "text-red-600"
    default:
      return "text-slate-600"
  }
}

const getStatusBgColor = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-green-500"
    case "Pending":
      return "bg-yellow-500"
    case "Rejected":
      return "bg-red-500"
    default:
      return "bg-slate-500"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "Approved":
      return "Approved"
    case "Pending":
      return "Pending"
    case "Rejected":
      return "Rejected"
    default:
      return status
  }
}

export default function SeparationApprovalStages({ stages }: ApprovalStagesProps) {


  const { isDesktop } = useScreenSize();
  const [formSchema, setFormSchema] = useState<FormIOSchema | null>(null);
  const [show, setShow] = useState(false);

  const handleShowForm = (schema: FormIOComponent[] | undefined) => {
    setFormSchema((prev) => {
      if (!schema)
        return prev;
      return ({
        display: "form",
        components: [
          ...schema
        ]
      })
    });
    setShow(true);
  }

  return (
    <div className={`space-y-4 ${isDesktop ? "flex w-full items-baseline" : ""}`}>
      {stages.map((stage, index) => !isDesktop ? (
        <div key={index} className="relative">
          {index < stages.length - 1 && <div className="absolute left-3 top-12  w-0.5 h-8 bg-slate-200" />}

          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-start gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-1">{getStatusIcon(stage.status)}</div>

              {/* Content */}
              <div className="flex-grow">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">Stage {index + 1}</p>
                    <p className={`text-sm font-semibold ${getStatusColor(stage.status)}`}>
                      {getStatusLabel(stage.status)}
                    </p>
                  </div>
                  {stage?.form_json?.components && stage.status !== "Pending" &&
                    <button className="rounded-lg text-white bg-blue-500 px-2 py-1 text-sm"
                      onClick={() => handleShowForm(stage?.form_json?.components)}> show form </button>}
                </div>
                {/* Details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {stage.user && (
                    <div>
                      <span className="text-slate-500">Assigned To:</span>
                      <p className="font-medium text-slate-900">{stage.user}</p>
                    </div>
                  )}
                  {stage.role && (
                    <div>
                      <span className="text-slate-500">Role:</span>
                      <p className="font-medium text-slate-900">{stage.role}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : <StageCardDesktop key={index} isLast={index + 1 === stages.length} index={index} stage={stage} handleShowForm={handleShowForm} />
      )}
      {formSchema && show &&
        createPortal(<div className="fixed inset-0 z-50 bg-black/10 flex justify-center items-center">
          <div className="max-w-[500px] mx-2 w-full rounded-xl bg-white p-6">
            <div className="flex border-b pb-2 mb-2">
              <p className="text-xl font-semibold">Review Form</p>
              <X className="ml-auto text-gray-500 hover:text-gray-800 cursor-pointer rounded-lg bg-gray-100 hover:bg-gray-200 w-8 h-8" onClick={() => setShow(false)} />
            </div>
            <div>
              <Form
                form={formSchema}
                options={{
                  readOnly: true, // This makes the entire form read-only
                  viewAsHtml: false // Set to true to render as plain HTML instead of form inputs
                }}
                submit={false}
              />
            </div>
          </div>
        </div>, document.body)
      }

    </div>
  )
}


const StageCardDesktop = ({ index, isLast, stage, handleShowForm }: { index: number, isLast: boolean, stage: ApprovalStage, handleShowForm: (schema: FormIOComponent[] | undefined) => void }) => {

  return (
    <div className="flex-1">
      <div className="flex  flex-col items-start gap-4">
        {/* Status Icon */}
        <div className="flex items-center w-full">
          <div className="flex-shrink-0 mt-1">{getStatusIcon(stage.status)}</div>
          {!isLast && <div className={`w-full h-1 mt-1 bg-gray-400 ${getStatusBgColor(stage.status)}`} />}
        </div>
        {/* Content */}
        <div className="flex-grow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">Stage {index + 1}</p>
              <p className={`text-sm font-semibold ${getStatusColor(stage.status)}`}>
                {getStatusLabel(stage.status)}
              </p>

            </div>

          </div>
          {/* Details */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {stage.user && (
              <div >
                <span className="text-slate-500">Assigned To:</span>
                <p className="font-medium text-slate-900">{stage.user}</p>
              </div>
            )}
            {stage.role && (
              <div >
                <span className="text-slate-500">Role:</span>
                <p className="font-medium text-slate-900">{stage.role}</p>
              </div>
            )}
          </div>
          {stage?.form_json?.components && stage.status !== "Pending" &&
            <button className={`rounded-lg mt-2 opacity-85 hover:opacity-100 text-white ${getStatusBgColor(stage.status)} px-2 py-1 text-sm`}
              onClick={() => handleShowForm(stage?.form_json?.components)}> Show Review </button>}
        </div>

      </div>
    </div>
  );
}

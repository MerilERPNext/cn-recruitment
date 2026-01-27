import CardTable from '../../shared/CardTable'
import { ApprovalStage } from '../../../types/todos'


interface FlowDetailsProps {
    data: any
}

const titles = ["Stage Number",
    "Stage Name",
    "Assigned To",
    "Action Taken By",
    "Status",
    "Trigger Date",
    "Due Date",
    "Completed Date",
    "Actions"
]

const FlowDetails = ({ data }: FlowDetailsProps) => {
    console.log(data)
    return (
        <div>
            <CardTable
                titles={titles}
            >
                {data?.approval_stages_status.map((stage: ApprovalStage) => (
                    <div>
                        {stage?.stage_name}
                    </div>
                ))}
            </CardTable>
        </div>
    )
}

export default FlowDetails
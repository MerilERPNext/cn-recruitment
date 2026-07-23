import React, { Dispatch, SetStateAction } from 'react'
import { Typography } from './atoms/Typography'
import { VisibilityOption, VisibilitySetting } from '../Performance/GoalCreation/component/VisibilityAndSubmit'

const VisibleSettingCards = ({ setting, setSelectedVisibility, selectedVisibility }: {
    setting: VisibilitySetting, setSelectedVisibility: Dispatch<SetStateAction<VisibilityOption>>
    , selectedVisibility: VisibilityOption
}) => {
    const Icon = setting.icon;
    const isSelected = selectedVisibility === setting.label;
    return (

        <label
            key={setting.label}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${isSelected
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
                }`}
        >
            <input
                aria-label={`Set goal visibility to ${setting.label}`}
                checked={isSelected}
                className="mt-1 h-4 w-4 accent-blue-600"
                name="goal-visibility"
                type="radio"
                onChange={() => setSelectedVisibility(setting.label)}
            />
            <span className="min-w-0">
                <span className="mb-1 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    <Typography variant="bodyMedium" className="text-sm font-semibold text-gray-900">
                        {setting.title}
                    </Typography>
                </span>
                <Typography variant="caption" className="block text-gray-500">
                    {setting.description}
                </Typography>
                <Typography variant="caption" className="mt-2 block text-gray-400">
                    {setting.sees}
                </Typography>
            </span>
        </label>

    )
}

export default React.memo(VisibleSettingCards)
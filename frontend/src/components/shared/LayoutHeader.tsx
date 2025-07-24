import { ChevronLeft, X } from 'lucide-react'
import { useNavigate } from 'react-router'

interface LayoutHeaderProps {
    tab: string
    path?: string
    onBack?: () => void // Optional function instead of default navigation
    icon?: 'chevron' | 'x' // Optional: choose icon style
}

const LayoutHeader = ({ path, tab, onBack, icon = 'chevron' }: LayoutHeaderProps) => {
    const navigate = useNavigate()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else if (path) {
            navigate(path)
        } else {
            navigate(-1)
        }
    }

    const BackIcon = icon === 'x' ? X : ChevronLeft

    return (
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative h-16 flex items-center justify-center">
                    <button
                        onClick={handleBack}
                        className="absolute left-0 flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                    >
                        <BackIcon className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <span>{tab}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LayoutHeader

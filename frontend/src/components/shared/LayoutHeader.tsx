import { ChevronLeft, X } from 'lucide-react'
import { useNavigate } from 'react-router'

interface LayoutHeaderProps {
    tab: string
    path?: string
    onBack?: () => void
    icon?: 'chevron' | 'x'
    children?: React.ReactNode
}

const LayoutHeader = ({ path, tab, onBack, icon = 'chevron', children }: LayoutHeaderProps) => {
    const navigate = useNavigate()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else if (path) {
            navigate(path)
        } else {
            navigate("/webapp")
        }
    }

    const BackIcon = icon === 'x' ? X : ChevronLeft

    return (
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="mx-auto px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between relative">
                    {/* Left: Icon */}
                    <div className="flex items-center">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                        >
                            <BackIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Center: Tab Title */}
                    <div className=" text-lg font-semibold text-gray-800">
                        {tab}
                    </div>

                    {/* Right: Children */}
                    {<div className="flex items-center justify-end overflow-hidden max-w-20">
                        {children}
                    </div>}
                </div>
            </div>
        </div>
    )
}

export default LayoutHeader

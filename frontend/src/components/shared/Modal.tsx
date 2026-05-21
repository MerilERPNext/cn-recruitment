import { FC, ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    size?: ModalSize;
    className?: string;
};

const Modal: FC<ModalProps> = ({ isOpen, onClose, children, size = 'md', className = '' }) => {
    const { isDesktop } = useScreenSize();

    if (!isOpen) return null;

    const getSizeClasses = () => {
        if (size === 'full') return 'max-w-full w-full h-full';

        const sizeMap = {
            sm: isDesktop ? 'max-w-md' : 'max-w-xs',
            md: isDesktop ? 'max-w-2xl' : 'max-w-md',
            lg: isDesktop ? 'max-w-4xl' : 'max-w-lg',
            xl: isDesktop ? 'max-w-6xl' : 'max-w-xl',
            '2xl': isDesktop ? 'max-w-[90vw]' : 'max-w-2xl'
        };

        return `${sizeMap[size]} w-full`;
    };

    const heightClasses = size === 'full' ? '' : isDesktop ? 'max-h-[90vh]' : 'max-h-[95vh]';

    // For mobile full-screen modals, remove backdrop and padding
    const isFullScreenMobile = size === 'full' && !isDesktop;

    if (isFullScreenMobile) {
        return (
            <div className="fixed inset-0 z-50 bg-white">
                <div className={`w-full h-full overflow-auto ${className}`}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-lg shadow-lg ${getSizeClasses()} ${heightClasses} overflow-auto ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export default Modal;
export type { ModalSize };

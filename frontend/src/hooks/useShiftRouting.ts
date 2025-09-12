import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScreenSize } from './useScreenSize';

export const useShiftRouting = () => {
    const { isDesktop } = useScreenSize();
    const navigate = useNavigate();
    const location = useLocation();
    const previousIsDesktop = useRef<boolean | null>(null);

    useEffect(() => {
        // Skip on first render
        if (previousIsDesktop.current === null) {
            previousIsDesktop.current = isDesktop;
            return;
        }

        // Screen size changed
        if (previousIsDesktop.current !== isDesktop) {
            const currentPath = location.pathname;

            // Check if we're in shift-request routes
            if (currentPath.startsWith('/webapp/shift-request')) {

                if (isDesktop) {
                    // Switched to desktop - always show dashboard
                    navigate('/webapp/shift-request/all-shifts-dashboard', { replace: true });
                } else {
                    // Switched to mobile - always show first tab (MyShiftAssignment)
                    navigate('/webapp/shift-request/my-shift-assignment', { replace: true });
                }
            }

            previousIsDesktop.current = isDesktop;
        }
    }, [isDesktop, navigate, location.pathname]);

    return { isDesktop };
};
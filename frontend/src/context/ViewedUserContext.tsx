import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentEmployee } from '../hooks/useEmployee';

interface ViewedUserContextType {
    targetEmployeeId: string | null;
    setTargetEmployee: (employeeId: string | null) => void;
    clearTargetEmployee: () => void;
    isViewingOtherUser: boolean;
}

const ViewedUserContext = createContext<ViewedUserContextType | undefined>(undefined);

const TARGET_USER_PARAM = 'target_user';
const SESSION_STORAGE_KEY = 'viewed_employee_id';

export const ViewedUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { data: currentEmployee } = useCurrentEmployee();
    const isClearing = useRef(false);

    const [targetEmployeeId, setTargetEmployeeIdState] = useState<string | null>(() => {
        // Initialize from URL first, then session storage
        const urlParam = searchParams.get(TARGET_USER_PARAM);
        if (urlParam) {
            sessionStorage.setItem(SESSION_STORAGE_KEY, urlParam);
            return urlParam;
        }
        return sessionStorage.getItem(SESSION_STORAGE_KEY);
    });

    // Sync URL -> State when URL changes manually (e.g., bookmark, back button)
    useEffect(() => {
        // If we're in the process of clearing, don't do anything
        // This prevents race conditions where the effect runs before state updates complete
        if (isClearing.current) {
            return;
        }

        const urlParam = searchParams.get(TARGET_USER_PARAM);

        // Check if we're on an employee profile route and extract the ID
        const profileMatch = location.pathname.match(/\/employee-profile\/([^/]+)/);
        const profileEmployeeId = profileMatch ? profileMatch[1] : null;

        // If we're on a profile page, sync that ID
        if (profileEmployeeId && profileEmployeeId !== targetEmployeeId) {
            setTargetEmployeeIdState(profileEmployeeId);
            sessionStorage.setItem(SESSION_STORAGE_KEY, profileEmployeeId);

            // Also update URL query param if missing
            if (!urlParam) {
                const newParams = new URLSearchParams(searchParams);
                newParams.set(TARGET_USER_PARAM, profileEmployeeId);
                navigate(
                    {
                        pathname: location.pathname,
                        search: newParams.toString(),
                    },
                    { replace: true }
                );
            }
            return;
        }

        if (urlParam && urlParam !== targetEmployeeId) {
            // URL has a different target user, update state
            setTargetEmployeeIdState(urlParam);
            sessionStorage.setItem(SESSION_STORAGE_KEY, urlParam);
        } else if (!urlParam && targetEmployeeId && !profileEmployeeId) {
            // URL is missing the param but we have a target user in state
            // This is the "Sticky Session" logic - append the param to URL
            // But only if we're NOT on a profile page (which handles its own ID)
            const newParams = new URLSearchParams(searchParams);
            newParams.set(TARGET_USER_PARAM, targetEmployeeId);

            navigate(
                {
                    pathname: location.pathname,
                    search: newParams.toString(),
                },
                { replace: true }
            );
        } else if (!urlParam && !targetEmployeeId) {
            // Both are null, we're in a clean state
            isClearing.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, searchParams.toString(), targetEmployeeId]);

    const setTargetEmployee = (employeeId: string | null) => {
        if (employeeId) {
            // Only update if the value actually changed
            if (employeeId === targetEmployeeId) {
                return;
            }

            isClearing.current = false;
            setTargetEmployeeIdState(employeeId);
            sessionStorage.setItem(SESSION_STORAGE_KEY, employeeId);

            // Update URL immediately
            const newParams = new URLSearchParams(searchParams);
            newParams.set(TARGET_USER_PARAM, employeeId);

            navigate(
                {
                    pathname: location.pathname,
                    search: newParams.toString(),
                },
                { replace: true }
            );
        } else {
            clearTargetEmployee();
        }
    };

    const clearTargetEmployee = () => {
        isClearing.current = true;
        setTargetEmployeeIdState(null);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);

        // Remove param from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(TARGET_USER_PARAM);

        navigate(
            {
                pathname: location.pathname,
                search: newParams.toString(),
            },
            { replace: true }
        );
    };

    const isViewingOtherUser = targetEmployeeId !== null &&
        currentEmployee?.name !== undefined &&
        targetEmployeeId !== currentEmployee.name;

    return (
        <ViewedUserContext.Provider
            value={{
                targetEmployeeId,
                setTargetEmployee,
                clearTargetEmployee,
                isViewingOtherUser,
            }}
        >
            {children}
        </ViewedUserContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useViewedUser = () => {
    const context = useContext(ViewedUserContext);
    if (context === undefined) {
        throw new Error('useViewedUser must be used within a ViewedUserProvider');
    }
    return context;
};

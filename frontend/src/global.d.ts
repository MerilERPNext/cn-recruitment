declare global {
    interface Window {
        __chunkReloaded?: boolean;
        __first80DSelected?: boolean;
        __second80DSelected?: boolean;
        target_pw_user_id?: string | null;
        isApp?: boolean;
        nativeInterface?: {
            execute: (action: string) => Promise<any>;
        };
    }
}

export { };

import { FC, useCallback, useEffect, useState } from "react";
import MyMicroApp, { CNMicroapp } from "./AppsCard";


interface MicroAppGridProps {
    apps: CNMicroapp[];
    onOrderChange?: (apps: CNMicroapp[]) => void;
}

const MicroAppGrid: FC<MicroAppGridProps> = ({
    apps,
    onOrderChange,
}) => {
    const [items, setItems] = useState<CNMicroapp[]>([]);

    useEffect(() => {
        setItems(
            [...apps]
                .filter(a => a.is_visible)
                .sort((a, b) => a.display_order - b.display_order)
        );
    }, [apps]);

    const moveApp = useCallback((from: number, to: number) => {
        setItems(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(from, 1);
            updated.splice(to, 0, moved);

            return updated.map((app, index) => ({
                ...app,
                display_order: index,
            }));
        });
    }, []);

    useEffect(() => {
        onOrderChange?.(items);
    }, [items, onOrderChange]);

    return (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-4 gap-4">
            {items.map((item, index) => (
                <MyMicroApp
                    key={item.name}
                    item={item}
                    index={index}
                    moveApp={moveApp}
                />
            ))}
        </div>
    );
};

export default MicroAppGrid;

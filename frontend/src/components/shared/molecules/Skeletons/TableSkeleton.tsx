function TableSkeleton({
    columns = 4,
    rows = 5,
}) {
    return (
        <div className="overflow-x-auto animate-pulse">
            <table className="min-w-full border border-gray-200 rounded-lg">
                <thead>
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th
                                key={i}
                                className="px-4 py-3 border-b"
                            >
                                <div className="h-4 w-24 bg-gray-200 rounded" />
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <tr key={rowIndex} className="border-b">
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <td key={colIndex} className="px-4 py-3">
                                    <div className="h-4 w-full bg-gray-200 rounded" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default TableSkeleton;

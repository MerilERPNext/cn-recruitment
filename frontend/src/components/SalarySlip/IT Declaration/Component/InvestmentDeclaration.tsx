import React from 'react';

interface InvestmentDeclarationProps {
    investments: {
        name: string;
        amount: number;
    }[];
}

const InvestmentDeclaration: React.FC<InvestmentDeclarationProps> = ({ investments }) => {
    return (
        <div>
            <h2>Investment Declaration</h2>
            <table>
                <thead>
                    <tr>
                        <th>Investment Name</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {investments.map((investment, index) => (
                        <tr key={index}>
                            <td>{investment.name}</td>
                            <td>{investment.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default InvestmentDeclaration;
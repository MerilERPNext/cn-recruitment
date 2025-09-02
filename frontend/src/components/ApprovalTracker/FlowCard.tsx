import React from "react";
import { useNavigate } from "react-router-dom";

type FlowCardProps = {
  category: string;
  items: string[];
};

const FlowCard: React.FC<FlowCardProps> = ({ category, items }) => {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{category}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <button
            key={item}
            className="border rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-100"
            onClick={() =>
              navigate("/webapp/tracker-app/initiate-form", {
                state: { title: item },
              })
            }
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlowCard;

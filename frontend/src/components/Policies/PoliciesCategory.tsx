import React from "react";
import { useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { CategoryCardSkeleton } from "./PolicySkeletons";
import { useFrappeDocuments } from "../../hooks/useFrappeQuery";
import { usePolicyCountsByCategory } from "../../hooks/usePolicy";

type CategoryCardProps = {
  name: string;
  count: number;
};

type CategoryDoc = {
  name: string;
};

const CategoryCard: React.FC<CategoryCardProps> = ({ name, count }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() =>
        navigate("/webapp/policies-app/policies-list", {
          state: { name },
        })
      }
      className="flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 my-2 cursor-pointer"
    >
      <span className="font-medium text-gray-900">{name}</span>
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-semibold">
        <span className="uppercase leading-none">{count}</span>
      </div>
    </div>
  );
};

const PoliciesCategory: React.FC = () => {
  const { data: counts, isLoading: isCountsLoading, error: countsError } =
    usePolicyCountsByCategory();

  console.log("🏷️ PoliciesCategory - counts:", counts);
  console.log("🏷️ PoliciesCategory - loading:", isCountsLoading);
  console.log("🏷️ PoliciesCategory - error:", countsError);

  if (isCountsLoading) {
    return (
      <>
        {[...Array(5)].map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </>
    );
  }

  // Handle errors gracefully
  if (countsError) {
    console.warn("Failed to load policy counts:", countsError);
  }

  // Create categories from the counts data
  const categories = counts ? Object.keys(counts).map(name => ({ name })) : [];
  console.log("🏷️ Generated categories:", categories);

  return (
    <div className="h-full w-full">
      {categories && categories.length > 0 ? (
        categories.map((item: CategoryDoc) => (
          <CategoryCard
            key={item.name}
            name={item.name}
            count={counts?.[item.name] ?? 0}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Policy Categories Found
          </h3>
          <p className="text-gray-500 text-sm">
            Policy categories will appear here when they are available.
          </p>
        </div>
      )}
    </div>
  );
};

export default PoliciesCategory;

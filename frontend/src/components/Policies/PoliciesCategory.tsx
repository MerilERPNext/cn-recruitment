import React from "react";
import { useNavigate } from "react-router";
import { CategoryCardSkeleton } from "./PolicySkeletons";
import { usePolicyCountsByCategory } from "../../hooks/usePolicy";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";

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
      className="flex border  border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl p-2 my-2 cursor-pointer"
    >
      <span className="font-medium text-gray-900">{name}</span>
      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-semibold">
        <span className="uppercase leading-none">{count}</span>
      </div>
    </div>
  );
};

const PoliciesCategory: React.FC = () => {
  const { data: userId } = useLoggedInUser();
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const {
    data: counts,
    isLoading: isCountsLoading,
    error: countsError,
  } = usePolicyCountsByCategory(employeeId);

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
  const categories = counts
    ? Object.keys(counts).map((name) => ({ name }))
    : [];
  console.log("🏷️ Generated categories:", categories);

  return (
    <div className="bg-white h-full w-full p-2 md:p-4">
      {isDesktop && (
        <HeaderBar title="Policy Categories" onBack={() => navigate(-1)} />
      )}
      {categories.length === 0 ? (
        <p className="text-gray-500 text-center mt-4">No categories found.</p>
      ) : (
        categories.map((item: CategoryDoc) => (
          <CategoryCard
            key={item.name}
            name={item.name}
            count={counts?.[item.name] ?? 0}
          />
        ))
      )}
    </div>
  );
};

export default PoliciesCategory;

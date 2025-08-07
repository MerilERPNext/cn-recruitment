import React from "react";
import { useNavigate } from "react-router";
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
  const { data: categories, isLoading: isCategoriesLoading } =
    useFrappeDocuments(
      {
        doctype: "HR Category",
        pageParam: 0,
        pageSize: 1000,
        filters: {},
        searchTerm: "",
        fields: ["name"],
        searchFields: ["name"],
      },
      {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      }
    );

  const { data: counts, isLoading: isCountsLoading } =
    usePolicyCountsByCategory();
  const isLoading = isCategoriesLoading || isCountsLoading;
  if (isLoading) {
    return (
      <>
        {[...Array(5)].map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </>
    );
  }

  return (
    <div className="h-full w-full">
      {categories?.data?.map((item: CategoryDoc) => (
        <CategoryCard
          key={item.name}
          name={item.name}
          count={counts?.[item.name] ?? 0}
        />
      ))}
    </div>
  );
};

export default PoliciesCategory;

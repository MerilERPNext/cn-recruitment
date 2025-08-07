import React from "react";
import { useNavigate } from "react-router";
import FrappeListView from "../ListView";
import { useFrappeDocumentCount } from "../../hooks/useFrappeQuery";
import { CategoryCardSkeleton } from "./PolicySkeletons";
type CategoryCardProps = {
  name: string;
  count: number;
  isLoading?: boolean;
};

const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  count,
  isLoading,
}) => {
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
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="uppercase leading-none">{count}</span>
        )}
      </div>
    </div>
  );
};

interface HrCategoryItem {
  name: string;
}

const PoliciesCategory: React.FC = () => {
  return (
    <div className="h-full w-full">
      <FrappeListView
        doctype="HR Category"
        ItemComponent={({ item }: { item: HrCategoryItem }) => {
          const { data: count, isLoading } = useFrappeDocumentCount({
            doctype: "HR Policies",
            filters: [
              ["policy_category", "=", item.name],
              ["archive", "=", "0"],
            ],
          });
          return (
            <CategoryCard
              name={item.name}
              count={count ?? 0}
              isLoading={isLoading}
            />
          );
        }}
        defaultFields={["name"]}
        isSearch={true}
        searchFields={["name"]}
        infiniteScroll={true}
        showRefereshButton={true}
        SkeletonComponent={CategoryCardSkeleton}
      />
    </div>
  );
};

export default PoliciesCategory;

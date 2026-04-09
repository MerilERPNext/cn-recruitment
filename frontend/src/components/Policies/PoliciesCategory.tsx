import React from "react";
import { useNavigate } from "react-router";
import { CategoryCardSkeleton } from "./PolicySkeletons";
import { usePolicyCountsByCategory } from "../../hooks/usePolicy";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import { NoDataFound } from "../shared/atoms/NoDataFound";

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
    <Card
      onClick={() =>
        navigate("/webapp/policies-app/policies-list", {
          state: { name },
        })
      }
      padding="sm"
      radius="xl"
      className="w-full flex justify-between items-center my-2 hover:shadow-md cursor-pointer"
    >
      <Typography variant="bodyMedium">{name}</Typography>

      <div
        className={`flex items-center justify-center w-12 h-12 rounded-xl font-semibold
          ${count > 0 ? "bg-green-100" : "bg-transparent"}
        `}
      >
        {count > 0 && (
          <Typography variant="bodyMedium" color="success" component="span">
            {count}
          </Typography>
        )}
      </div>
    </Card>
  );
};

const PoliciesCategory: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const { data: employee, isLoading: employeeLoading } = useCurrentEmployeeAllDetails(undefined, undefined, ["name"]);

  const {
    data: counts,
    isLoading: isCountsLoading,
    error: countsError,
  } = usePolicyCountsByCategory(employee?.name);

  const isLoading = employeeLoading || isCountsLoading;

  if (isLoading) {
    return (
      <>
        {[...Array(5)].map((_, i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </>
    );
  }

  if (countsError) {
    console.warn("Failed to load policy counts:", countsError);
  }

  const categories = counts
    ? Object.keys(counts).map((name) => ({ name }))
    : [];
  console.log("🏷️ Generated categories:", categories);

  return (
    <div className=" h-full w-full p-2">
      {isDesktop && (
        <Typography
          variant="subheading"
          className="border-b border-gray-200 pb-2 mt-2"
        >
          Policy Category
        </Typography>
      )}
      {categories.length === 0 ? (
        <NoDataFound
          title="No Policy Categories"
          subtitle="No categories found."
        />
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

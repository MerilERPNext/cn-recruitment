import React from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { RecognitionMetrics as RecognitionMetricsType } from "../../types/recognition";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Users, Award, TrendingUp } from "lucide-react";

interface RecognitionMetricsProps {
  metrics: RecognitionMetricsType;
  isLoading?: boolean;
}

export const RecognitionMetrics: React.FC<RecognitionMetricsProps> = ({
  metrics,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card radius="xl" className="border p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "60%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: metrics.chart_data.map((d) => d.month),
      labels: {
        style: {
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
        },
      },
    },
    fill: {
      opacity: 1,
      colors: ["#3B82F6"],
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} recognitions`,
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
  };

  const chartSeries = [
    {
      name: "Recognitions",
      data: metrics.chart_data.map((d) => d.count),
    },
  ];

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <Typography variant="subheading" className="font-semibold mb-4">
        Recognition Metrics
      </Typography>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div className="mb-2">
            <Typography variant="bodySmall" color="body2">
              Span wise recognition given
            </Typography>
          </div>
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={250}
          />
        </div>

        {/* Summary Metrics */}
        <div className="space-y-4">
          {/* Eligible to Give */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="size-5 text-blue-600" />
              <Typography variant="bodySmall" className="font-medium text-blue-900">
                ELIGIBLE TO GIVE
              </Typography>
            </div>
            <div className="flex items-baseline gap-2">
              <Typography variant="subheading" className="font-bold text-blue-900">
                {metrics.eligible_to_give.percentage}%
              </Typography>
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  metrics.eligible_to_give.change_type === "increase"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                <TrendingUp
                  className={`size-3 ${
                    metrics.eligible_to_give.change_type === "decrease"
                      ? "rotate-180"
                      : ""
                  }`}
                />
                <span>
                  {metrics.eligible_to_give.change > 0 ? "+" : ""}
                  {metrics.eligible_to_give.change}% vs last month
                </span>
              </div>
            </div>
          </div>

          {/* Average Recognition */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Award className="size-5 text-purple-600" />
              <Typography variant="bodySmall" className="font-medium text-purple-900">
                AVG RECOGNITION
              </Typography>
            </div>
            <Typography variant="subheading" className="font-bold text-purple-900">
              {metrics.avg_recognition} per employee
            </Typography>
          </div>
        </div>
      </div>
    </Card>
  );
};

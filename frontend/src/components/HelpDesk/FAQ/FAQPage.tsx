import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronDown } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  useCategories,
  useCategoryArticles,
  useSearchArticles,
} from "../../../hooks/useFAQ";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import FAQAccordion from "../FAQ/FAQAccordion";
import RequestIssueModal from "../RequestIssueModal";
import emptyStateImage from "../../../assets/helpdesk-empty-state.png";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../utils/uiPermission";

const FAQPage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const { data: userUiPermission } = useGetUiPermission("Help Desk");
  const canRequestIssue = isActionEnabled(
    userUiPermission,
    "request_issue",
    "Help Desk",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();

  // Set default category when categories load
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories, selectedCategory]);

  // Fetch articles for selected category
  const { data: articles = [], isLoading: articlesLoading } =
    useCategoryArticles(selectedCategory);

  // Search articles
  const { data: searchResults = [] } = useSearchArticles(searchTerm);

  // Get current category info
  const currentCategory = useMemo(() => {
    return categories.find((c) => c.name === selectedCategory);
  }, [categories, selectedCategory]);

  // Display articles (search results or category articles)
  const displayArticles = useMemo(() => {
    if (searchTerm.length > 2 && searchResults.length > 0) {
      return searchResults;
    }
    return articles;
  }, [searchTerm, searchResults, articles]);

  const handleViewRequests = () => {
    navigate("/webapp/helpdesk");
  };

  const handleRequestIssue = () => {
    setIsRequestModalOpen(true);
  };

  const renderContent = () => (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row lg:items-start lg:justify-between gap-4">
          {/* Title */}
          <div className="max-lg:hidden">
            <Typography
              variant={isDesktop ? "h2" : "h4"}
              color="primary"
              className="mb-1"
            >
              Frequently Asked Questions
            </Typography>
            <Typography variant="bodySmall" color="body2">
              Common questions by users
            </Typography>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-col sm:flex-row max-lg:w-full gap-3">
            {/* Search Input */}
            <div className="relative max-lg:w-full ml-auto">
              <Search className="absolute left-3  top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search.."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full lg:w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            {/* Category Dropdown */}
            <div className="ml-auto relative">
              <button
                onClick={() =>
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                }
                className="flex items-center justify-between gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm min-w-[160px] hover:bg-primary-700 transition-colors"
              >
                <span className="truncate">
                  {currentCategory?.category_name || "Select Category"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isCategoryDropdownOpen && (
                <div className="absolute  right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
                  <ul className="max-h-60 overflow-auto p-1">
                    {categories.map((category) => (
                      <li
                        key={category.name}
                        onClick={() => {
                          setSelectedCategory(category.name);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm transition ${category.name === selectedCategory
                          ? "bg-primary-50 text-primary-600 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        {category.category_name} ({category.article_count})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-8 py-4 pb-24 overflow-y-auto">
        {categoriesLoading || articlesLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Illustration (desktop only) */}
            {isDesktop && (
              <div className="lg:w-2/5 flex-shrink-0">
                <img
                  src={emptyStateImage}
                  alt="FAQ Illustration"
                  className="w-full h-auto max-w-md mx-auto"
                />
              </div>
            )}

            {/* Right: FAQ Accordion (with background image on mobile) */}
            <div className="lg:w-3/5 relative">
              {/* Mobile background image - fixed to viewport */}
              {!isDesktop && (
                <div
                  className="fixed inset-0 bg-no-repeat bg-center bg-contain opacity-10 pointer-events-none z-0"
                  style={{ backgroundImage: `url(${emptyStateImage})` }}
                />
              )}
              <div className="relative z-10">
                {displayArticles.length > 0 ? (
                  <FAQAccordion
                    categoryName={currentCategory?.category_name || ""}
                    articleCount={displayArticles.length}
                    articles={displayArticles}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Typography variant="body" color="body2">
                      No FAQs found for this category.
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Buttons - transparent background */}
      <div className="max-sm:bg-white max-sm:left-0 right-0 bottom-0 max-sm:px-4 max-sm:pb-4 flex  fixed sm:bottom-4 sm:right-4 flex gap-3 z-50">
        <Button
          variant="outline"
          bgColor="primary"
          size="lg"
          onClick={handleViewRequests}
          className="max-sm:w-full bg-white"
        >
          View Requests
        </Button>
        {canRequestIssue &&
          <Button
            variant="contain"
            bgColor="primary"
            size="lg"
            onClick={handleRequestIssue}
            className="max-sm:w-full"
          >
            <Plus className="w-4 h-4" />
            Request Issue
          </Button>
        }
      </div>
    </div>
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".relative")) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  if (!isDesktop) {
    return (
      <>
        <div className="flex flex-col min-h-screen bg-white">
          <header className="sticky top-0 z-50 bg-white shadow-sm">
            <HeaderBar
              title="FAQs"
            />
          </header>
          <main className="flex-1 overflow-y-auto bg-app">
            {renderContent()}
          </main>
        </div>
        <RequestIssueModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <DesktopLayoutWrapper title="FAQs">
        <div className="flex flex-col h-full bg-white rounded-lg">
          {renderContent()}
        </div>
      </DesktopLayoutWrapper>
      <RequestIssueModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </>
  );
};

export default FAQPage;

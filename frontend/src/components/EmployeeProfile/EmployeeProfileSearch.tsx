import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  List,
  ArrowUp,
  ArrowDown,
  Check,
} from "lucide-react";
import { Typography } from "../shared/atoms/Typography";

export interface MatchItem {
  index: number;
  element: HTMLElement;
  section: string;
  snippetBefore: string;
  snippetMatch: string;
  snippetAfter: string;
}

interface EmployeeProfileSearchProps {
  containerRef: React.RefObject<HTMLElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Clean all previous highlights
function clearHighlights(container: HTMLElement) {
  const marks = container.querySelectorAll("mark[data-profile-search]");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(
        document.createTextNode(mark.textContent || ""),
        mark
      );
      parent.normalize();
    }
  });
}

// Convert section identifier to readable string
function formatSectionTitle(rawSection: string, subHeading?: string | null): string {
  const sectionMap: Record<string, string> = {
    overview: "Overview",
    "personal-information": "Personal Information",
    "employment-history": "Employment History",
    "reporting-details": "Reporting Details",
    "employee-documents": "Employee Documents",
    "employee-holidays": "Holidays",
  };

  const main = sectionMap[rawSection] || rawSection.replace(/-/g, " ");
  const capitalizedMain = main.charAt(0).toUpperCase() + main.slice(1);

  if (subHeading && subHeading.trim() && subHeading.trim() !== capitalizedMain) {
    return `${capitalizedMain} › ${subHeading.trim()}`;
  }
  return capitalizedMain;
}

const EmployeeProfileSearch: React.FC<EmployeeProfileSearchProps> = ({
  containerRef,
  isOpen,
  onClose,
  isMobile = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showListSheet, setShowListSheet] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      // Clear highlights when search closes
      if (containerRef.current) {
        clearHighlights(containerRef.current);
      }
      setMatches([]);
      setActiveIndex(0);
      setShowListSheet(false);
    }
  }, [isOpen, containerRef]);

  // Apply search highlights across DOM text nodes
  const performSearch = useCallback(
    (query: string) => {
      const container = containerRef.current;
      if (!container) return;

      clearHighlights(container);

      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 1) {
        setMatches([]);
        setActiveIndex(0);
        return;
      }

      const foundMatches: MatchItem[] = [];
      const regex = new RegExp(escapeRegExp(trimmed), "gi");

      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            // Ignore search toolbar itself or items marked with data-search-ignore
            if (parent.closest("[data-search-ignore]")) {
              return NodeFilter.FILTER_REJECT;
            }
            if (
              ["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "NOSCRIPT"].includes(
                parent.tagName
              )
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!node.textContent || !node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
      }

      let matchIndex = 0;

      for (const node of textNodes) {
        const text = node.textContent || "";
        if (!regex.test(text)) continue;
        regex.lastIndex = 0;

        const parent = node.parentNode;
        if (!parent) continue;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        // Extract containing section info
        const sectionEl = node.parentElement?.closest(
          "[data-section]"
        ) as HTMLElement | null;
        const subSectionHeading = node.parentElement
          ?.closest("section, [data-subsection], .space-y-6, .grid")
          ?.querySelector("h2, h3, h4, .font-semibold, .font-bold")?.textContent;

        const sectionName = sectionEl?.getAttribute("data-section") || "Profile";
        const formattedSection = formatSectionTitle(sectionName, subSectionHeading);

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex, match.index))
            );
          }

          const mark = document.createElement("mark");
          mark.className =
            "profile-search-match bg-amber-200 text-gray-900 rounded-[2px] px-0.5 transition-colors duration-150";
          mark.setAttribute("data-profile-search", "true");
          mark.setAttribute("data-match-index", String(matchIndex));
          mark.textContent = match[0];
          fragment.appendChild(mark);

          // Build snippet
          const snippetStart = Math.max(0, match.index - 25);
          const snippetEnd = Math.min(
            text.length,
            match.index + match[0].length + 25
          );
          const snippetBefore =
            (snippetStart > 0 ? "..." : "") +
            text.substring(snippetStart, match.index);
          const snippetMatch = match[0];
          const snippetAfter =
            text.substring(match.index + match[0].length, snippetEnd) +
            (snippetEnd < text.length ? "..." : "");

          foundMatches.push({
            index: matchIndex,
            element: mark,
            section: formattedSection,
            snippetBefore,
            snippetMatch,
            snippetAfter,
          });

          matchIndex++;
          lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }

        parent.replaceChild(fragment, node);
      }

      setMatches(foundMatches);
      setActiveIndex(0);
    },
    [containerRef]
  );

  // Update active mark styling & scroll into view
  useEffect(() => {
    if (matches.length === 0) return;

    matches.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.element.className =
          "profile-search-match profile-search-active bg-primary-500 text-white font-semibold rounded-[2px] px-1 ring-2 ring-primary-600 shadow-md transition-all duration-150";
        item.element.setAttribute("data-active-match", "true");

        // Scroll to active match with centering
        setTimeout(() => {
          item.element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 30);
      } else {
        item.element.className =
          "profile-search-match bg-amber-200 text-gray-900 rounded-[2px] px-0.5 transition-colors duration-150";
        item.element.removeAttribute("data-active-match");
      }
    });
  }, [activeIndex, matches]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    performSearch(val);
  };

  const handleClear = () => {
    setSearchTerm("");
    if (containerRef.current) {
      clearHighlights(containerRef.current);
    }
    setMatches([]);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      goToNext();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Search Bar: Sticky under Header */}
      {isMobile ? (
        <div
          data-search-ignore="true"
          className="sticky top-[60px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-md px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search
                size={16}
                className="absolute left-3 text-gray-400 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search in profile..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-700 active:bg-gray-200"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Match Counter Badge */}
            {searchTerm && (
              <Typography
                variant="label"
                className="font-semibold px-2 py-1 bg-gray-100 rounded-md text-gray-600 whitespace-nowrap"
              >
                {matches.length > 0
                  ? `${activeIndex + 1}/${matches.length}`
                  : "0/0"}
              </Typography>
            )}

            {/* Previous & Next Navigation */}
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-xl border border-gray-200/70">
              <button
                type="button"
                onClick={goToPrev}
                disabled={matches.length === 0}
                className="p-1.5 rounded-lg text-gray-700 hover:bg-white active:bg-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Previous match"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={matches.length === 0}
                className="p-1.5 rounded-lg text-gray-700 hover:bg-white active:bg-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Next match"
              >
                <ArrowDown size={16} />
              </button>
            </div>

            {/* Match List Button (Option 2) */}
            <button
              type="button"
              onClick={() => setShowListSheet(true)}
              disabled={matches.length === 0}
              className={`p-2 rounded-xl border transition-all ${
                showListSheet
                  ? "bg-primary-500 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 active:bg-gray-100"
              } disabled:opacity-30 disabled:pointer-events-none shadow-sm`}
              title="Show all matches in list"
              aria-label="Show all matches in list"
            >
              <List size={16} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 active:bg-gray-100 transition-colors"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Search Bar: Floating Find Bar */
        <div
          data-search-ignore="true"
          className="fixed top-20 right-8 z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/80 p-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 min-w-[340px] max-w-[440px]"
        >
          <div className="relative flex-1 flex items-center">
            <Search
              size={16}
              className="absolute left-3 text-gray-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Find in profile..."
              className="w-full pl-9 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 p-0.5 rounded-full text-gray-400 hover:text-gray-700"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Match Counter */}
          <Typography
            variant="label"
            className="font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg whitespace-nowrap min-w-[45px] text-center"
          >
            {searchTerm
              ? matches.length > 0
                ? `${activeIndex + 1}/${matches.length}`
                : "0/0"
              : "0"}
          </Typography>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={goToPrev}
              disabled={matches.length === 0}
              className="p-1 rounded-lg text-gray-700 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={matches.length === 0}
              className="p-1 rounded-lg text-gray-700 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next match (Enter)"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Match List toggle */}
          <button
            type="button"
            onClick={() => setShowListSheet(!showListSheet)}
            disabled={matches.length === 0}
            className={`p-1.5 rounded-xl border transition-all ${
              showListSheet
                ? "bg-primary-500 text-white border-primary-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            } disabled:opacity-30 disabled:pointer-events-none`}
            title="Show match list"
          >
            <List size={16} />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Match List Bottom Sheet (Mobile) & Popover (Desktop) - Option 2 */}
      {showListSheet && matches.length > 0 && (
        <>
          {/* Backdrop for mobile */}
          <div
            data-search-ignore="true"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
            onClick={() => setShowListSheet(false)}
          />

          {/* Content container */}
          <div
            data-search-ignore="true"
            className={
              isMobile
                ? "fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-250 border-t border-gray-200"
                : "fixed top-[135px] right-8 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-[380px] max-h-[500px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
            }
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              {isMobile && (
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute top-2 inset-x-0" />
              )}
              <div className="mt-1">
                <Typography variant="bodyMedium" className="font-bold text-gray-900">
                  Search Results ({matches.length})
                </Typography>
                <Typography variant="label" color="disabled" className="text-xs">
                  Matches for &ldquo;{searchTerm}&rdquo;
                </Typography>
              </div>
              <button
                type="button"
                onClick={() => setShowListSheet(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-gray-50">
              {matches.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveIndex(idx);
                      setShowListSheet(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                      isActive
                        ? "bg-primary-50 border border-primary-200/80 shadow-xs"
                        : "hover:bg-gray-50 active:bg-gray-100 border border-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Typography
                          variant="label"
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isActive
                              ? "bg-primary-500 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.section}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="disabled"
                          className="font-medium"
                        >
                          #{idx + 1}
                        </Typography>
                      </div>
                      <Typography
                        variant="bodySmall"
                        className="leading-snug break-words text-gray-700 block"
                      >
                        <Typography
                          variant="bodySmall"
                          component="span"
                          color="disabled"
                        >
                          {item.snippetBefore}
                        </Typography>
                        <span className="bg-amber-200 text-gray-900 font-semibold px-0.5 rounded-[2px] mx-0.5">
                          {item.snippetMatch}
                        </span>
                        <Typography
                          variant="bodySmall"
                          component="span"
                          color="disabled"
                        >
                          {item.snippetAfter}
                        </Typography>
                      </Typography>
                    </div>

                    {isActive && (
                      <Check
                        size={16}
                        className="text-primary-600 mt-1 shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default EmployeeProfileSearch;

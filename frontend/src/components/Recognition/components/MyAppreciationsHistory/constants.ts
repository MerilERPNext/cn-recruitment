import type { AppreciationHistoryItem } from "./types";

const badgeSvg = (from: string, to: string, icon: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${from}" />
          <stop offset="1" stop-color="${to}" />
        </linearGradient>
      </defs>
      <path d="M32 3 57 17.5v29L32 61 7 46.5v-29L32 3Z" fill="url(#g)" stroke="white" stroke-width="2"/>
      <circle cx="32" cy="32" r="18" fill="rgba(255,255,255,.18)" />
      <text x="32" y="39" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="white">${icon}</text>
    </svg>
  `)}`;

const BADGE_IMAGES = {
  bestBuddyGreen: badgeSvg("#34d399", "#22c55e", "★"),
  bestBuddyWarm: badgeSvg("#fb7185", "#f97316", "♥"),
  thankYou: badgeSvg("#e879f9", "#8b5cf6", "✦"),
  outOfBox: badgeSvg("#fb923c", "#b45309", "◆"),
};

export const TABLE_TITLES = [
  "Appreciations",
  "Values",
  "Received From",
  "Received Date",
  "Actions",
];

export const TABLE_WIDTHS = [
  "minmax(180px, 0.75fr)",
  "minmax(210px, 1.05fr)",
  "minmax(190px, 0.9fr)",
  "minmax(150px, 0.7fr)",
  "minmax(130px, 0.55fr)",
];

export const APPRECIATIONS: AppreciationHistoryItem[] = [
  {
    id: "best-buddy-vaibhav",
    title: "Best Buddy",
    value: "Spread happiness always",
    person: "Vaibhav Mishra",
    date: "23-04-2025",
    imageUrl: BADGE_IMAGES.bestBuddyGreen,
    tab: "received",
  },
  {
    id: "best-buddy-eeshika",
    title: "Best Buddy",
    value: "Spread happiness always",
    person: "Eeshika Gupta",
    date: "29-12-2023",
    imageUrl: BADGE_IMAGES.bestBuddyWarm,
    tab: "received",
  },
  {
    id: "thank-you-sudhakar",
    title: "Thank you",
    value: "Customer obsession",
    person: "Sudhakar Pandey",
    date: "14-12-2023",
    imageUrl: BADGE_IMAGES.thankYou,
    tab: "received",
  },
  {
    id: "out-of-box-rajnikant",
    title: "Out of box",
    value: "Optimize Resources Maximization",
    person: "Rajnikant Dhyani",
    date: "25-05-2023",
    imageUrl: BADGE_IMAGES.outOfBox,
    tab: "received",
  },
  {
    id: "best-buddy-given",
    title: "Best Buddy",
    value: "Spread happiness always",
    person: "Nisha Singh",
    date: "11-02-2024",
    imageUrl: BADGE_IMAGES.bestBuddyGreen,
    tab: "given",
  },
  {
    id: "thank-you-given",
    title: "Thank you",
    value: "Ownership with empathy",
    person: "Aman Verma",
    date: "05-01-2024",
    imageUrl: BADGE_IMAGES.thankYou,
    tab: "given",
  },
];

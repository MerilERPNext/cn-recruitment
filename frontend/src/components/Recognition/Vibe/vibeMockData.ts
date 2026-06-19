/**
 * Static mock data for the Vibe (Recognition) sub-sections.
 * This only powers the uploaded UI screens — no backend wiring.
 */

export interface LeaderboardPerson {
  rank: number;
  name: string;
  designation: string;
  medals: number;
}

export const LEADERBOARD_TOP3: LeaderboardPerson[] = [
  { rank: 2, name: "Ruchin .", designation: "Academics Vidyapeeth …", medals: 18 },
  { rank: 1, name: "Dheeraj Dixit", designation: "Academics Vidyapeeth …", medals: 20 },
  { rank: 3, name: "Lakshmi R", designation: "Vidyapeeth Digital Ope…", medals: 16 },
];

export const LEADERBOARD_REST: LeaderboardPerson[] = [
  {
    rank: 4,
    name: "Rishabh Bhartiya",
    designation:
      "Next Gen Media & Content | Studio – Noida(Pegasus Tower) – UP,Noida, Uttar Pradesh, India, (Corporate)",
    medals: 15,
  },
  {
    rank: 5,
    name: "Faizan Hussain",
    designation:
      "Academics R&D | Corporate – Noida – (WFH) – UP,Noida, Uttar Pradesh, India, (Corporate - Remote)",
    medals: 14,
  },
  {
    rank: 6,
    name: "Prashant Chauhan",
    designation:
      "Vidyapeeth Marketing | Vidyapeeth – SCO 34 – Faridabad – HR,Faridabad, Haryana, India, (NCR + Uttarakhand)",
    medals: 14,
  },
];

export interface BadgeItem {
  label: string;
  count: number;
  color: string;
}

export const MY_APPRECIATION_BADGES: BadgeItem[] = [
  { label: "Best Buddy", count: 1, color: "bg-green-500" },
  { label: "Best Buddy", count: 1, color: "bg-rose-400" },
  { label: "Thank you", count: 1, color: "bg-purple-400" },
  { label: "Out of box", count: 1, color: "bg-orange-400" },
];

export interface AppreciationNote {
  name: string;
  date: string;
  message: string;
  tag: string;
}

export const MY_APPRECIATION_NOTE: AppreciationNote = {
  name: "Vaibhav Mishra",
  date: "23-04-2025",
  message: "In office vibes are always top-tier with you!",
  tag: "Spread happiness always",
};

export interface AwardWinner {
  name: string;
  designation: string;
  initials?: string;
}

export interface AwardProgram {
  title: string;
  closedOn: string;
  winners: AwardWinner[];
  moreMembers: number;
}

export const AWARD_PROGRAMS: AwardProgram[] = [
  {
    title: "Star Academic Performer of April 2026",
    closedOn: "12-05-2026",
    winners: [
      { name: "Utkarsh Tiwari", designation: "Associate Professor" },
      { name: "Subhash Sharma", designation: "Associate Professor" },
      { name: "Rohit Chandola", designation: "Professor" },
    ],
    moreMembers: 65,
  },
  {
    title: "Star Performer of Apr 2026",
    closedOn: "12-05-2026",
    winners: [
      { name: "Afshana Basheer", designation: "Senior Associate" },
      { name: "Vipul Gehlot", designation: "Senior Associate", initials: "VG" },
      { name: "Ujwal Tambakhe", designation: "General Manager", initials: "UT" },
    ],
    moreMembers: 13,
  },
  {
    title: "Star performer of April Month 2026",
    closedOn: "12-05-2026",
    winners: [],
    moreMembers: 0,
  },
];

export interface MyAward {
  title: string;
  org: string;
  date: string;
  message: string;
  values: string[];
}

export const MY_AWARDS: MyAward[] = [
  {
    title: "Star Performer of February 2026",
    org: "PhysicsWallah Limited",
    date: "19-03-2026",
    message:
      "I would like to nominate Anjali for her consistent dedication and strong ownership towards her responsibilities. she has demonstrated a proactive approach in handling tasks.",
    values: [
      "Adapt Improve Evolve",
      "Be Honest and Transparent …",
      "Optimize Resources Maximi…",
    ],
  },
  {
    title: "Star Performer of December 20…",
    org: "PhysicsWallah Limited",
    date: "19-01-2026",
    message:
      "I would like to nominate Anjali for Star Performer of the Month in recognition of their outstanding performance and consistent ownership during the month.",
    values: [
      "Be Honest and Transparent …",
      "Adapt Improve Evolve",
      "Optimize Resources Maximi…",
    ],
  },
];

export interface AwardHistoryRow {
  title: string;
  values: string[];
  receivedFrom: string;
  receivedDate: string;
}

export const AWARD_HISTORY: AwardHistoryRow[] = [
  {
    title: "Star Performer of February 2…",
    values: ["Adapt Improve Evolve", "Be Honest and Transparent …", "Optimize Resources Maximi…"],
    receivedFrom: "PhysicsWallah Limited",
    receivedDate: "19-03-2026",
  },
  {
    title: "Star Performer of December …",
    values: ["Be Honest and Transparent …", "Adapt Improve Evolve", "Optimize Resources Maximi…"],
    receivedFrom: "PhysicsWallah Limited",
    receivedDate: "19-01-2026",
  },
  {
    title: "Star Performer of the July 2025",
    values: ["Be Honest and Transparent …", "Adapt Improve Evolve", "Optimize Resources Maximi…"],
    receivedFrom: "PhysicsWallah Limited",
    receivedDate: "19-08-2025",
  },
  {
    title: "Star Performers of Human Re…",
    values: ["Be Honest and Transparent …", "Be committed and treat ev…"],
    receivedFrom: "PhysicsWallah Limited",
    receivedDate: "08-08-2025",
  },
  {
    title: "Star Performer of the May M…",
    values: ["Be Honest and Transparent …", "Adapt Improve Evolve"],
    receivedFrom: "PhysicsWallah Limited",
    receivedDate: "16-06-2025",
  },
  {
    title: "Star Performer of the April M…",
    values: ["Adapt Improve Evolve", "Optimize Resources Maximi…"],
    receivedFrom: "PhysicsWallah Limited",
    receivedDate: "19-05-2025",
  },
];

export interface NominationRow {
  id: string;
  program: string;
  nominatedBy: string;
  nominationDate: string;
  lastActionDate: string;
  status: string;
}

export const NOMINATIONS: NominationRow[] = [
  {
    id: "NOM_14982",
    program: "Star Performer of February 2026 (2026-Star-Feb)",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "06-03-2026",
    lastActionDate: "19-03-2026",
    status: "Published",
  },
  {
    id: "NOM_13989",
    program: "Star Performer of December 2025 (2025-Non Aca…",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "09-01-2026",
    lastActionDate: "19-01-2026",
    status: "Published",
  },
  {
    id: "NOM_10953",
    program: "Star Performer of the July 2025 (2025-SPOM-July)",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "11-08-2025",
    lastActionDate: "19-08-2025",
    status: "Published",
  },
  {
    id: "NOM_10685",
    program: "Star Performers of Human Resource Team (Star Per…",
    nominatedBy: "BHAWNA JAIN (PW19950)",
    nominationDate: "07-08-2025",
    lastActionDate: "08-08-2025",
    status: "Published",
  },
  {
    id: "NOM_9334",
    program: "Star Performer of the May Month 2025 (2025-SPO…",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "09-06-2025",
    lastActionDate: "16-06-2025",
    status: "Published",
  },
  {
    id: "NOM_8817",
    program: "Star Performer of the April Month 2025 (2025-SPO…",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "01-05-2025",
    lastActionDate: "19-05-2025",
    status: "Published",
  },
  {
    id: "NOM_8280",
    program: "Star Performer of the February Month 2025 (PW-F…",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "10-03-2025",
    lastActionDate: "18-03-2025",
    status: "Published",
  },
  {
    id: "NOM_6477",
    program: "Star Performer of the September Month 2024 (PW…",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "14-10-2024",
    lastActionDate: "22-10-2024",
    status: "Published",
  },
  {
    id: "NOM_4265",
    program: "Star Performer Of The Month October-2023 (SPO…",
    nominatedBy: "Gopal Kumar (PW3029)",
    nominationDate: "02-11-2023",
    lastActionDate: "20-11-2023",
    status: "Published",
  },
];

export interface FeedPost {
  id: number;
  from: string;
  to: string;
  badge: string;
  badgeColor: string;
  message: string;
  values: string[];
  time: string;
  likes: number;
  comments: number;
}

export const FEED_POSTS: FeedPost[] = [
  {
    id: 1,
    from: "Vaibhav Mishra",
    to: "Anjali Sharma",
    badge: "Best Buddy",
    badgeColor: "bg-green-500",
    message: "In office vibes are always top-tier with you! Thanks for always being supportive.",
    values: ["Spread happiness always", "Be Honest and Transparent"],
    time: "2h ago",
    likes: 24,
    comments: 5,
  },
  {
    id: 2,
    from: "Gopal Kumar",
    to: "Rishabh Bhartiya",
    badge: "Thank you",
    badgeColor: "bg-purple-400",
    message:
      "Huge thanks for jumping in on the launch over the weekend — we shipped on time because of you.",
    values: ["Adapt Improve Evolve", "Optimize Resources"],
    time: "5h ago",
    likes: 41,
    comments: 9,
  },
  {
    id: 3,
    from: "Bhawna Jain",
    to: "Faizan Hussain",
    badge: "Out of box",
    badgeColor: "bg-orange-400",
    message: "Loved the creative approach you took on the campaign. Truly out of the box thinking!",
    values: ["Adapt Improve Evolve"],
    time: "1d ago",
    likes: 18,
    comments: 3,
  },
  {
    id: 4,
    from: "Dheeraj Dixit",
    to: "Lakshmi R",
    badge: "Best Buddy",
    badgeColor: "bg-rose-400",
    message: "Always a pleasure collaborating with you. Your energy keeps the whole team going!",
    values: ["Be committed and treat everyone with respect"],
    time: "2d ago",
    likes: 33,
    comments: 7,
  },
];

export interface RedemptionRow {
  date: string;
  orderId: string;
  transactionId: string;
  points: string;
  source: string;
  comments: string;
}

export const REDEMPTION_HISTORY: RedemptionRow[] = [
  { date: "03-04-2026", orderId: "", transactionId: "37812349", points: "500", source: "xoxoday", comments: "" },
  { date: "26-02-2026", orderId: "", transactionId: "37053410", points: "500", source: "xoxoday", comments: "" },
  { date: "23-11-2025", orderId: "", transactionId: "34984582", points: "1.3K", source: "xoxoday", comments: "" },
  { date: "04-09-2025", orderId: "", transactionId: "33259392", points: "520", source: "xoxoday", comments: "" },
  { date: "31-08-2025", orderId: "", transactionId: "33160642", points: "600", source: "xoxoday", comments: "" },
  { date: "12-08-2025", orderId: "", transactionId: "32782548", points: "991", source: "xoxoday", comments: "" },
];

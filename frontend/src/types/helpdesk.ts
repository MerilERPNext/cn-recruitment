
export interface TicketStatsV2 {
    all_issues: number;
    in_progress: number;
    closed: number;
    archived: number;
    team_size: number;
    avg_tat_hrs: number;
    avg_frt_hrs: number;
    resolution_within_sla_pct: number;
}
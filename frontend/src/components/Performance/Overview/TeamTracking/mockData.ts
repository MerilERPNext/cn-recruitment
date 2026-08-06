export const employees = [
  { id: 'emp_01', name: 'Alice Smith', designation: 'Software Engineer', department: 'Engineering' },
  { id: 'emp_02', name: 'Bob Jones', designation: 'Product Manager', department: 'Product' },
  { id: 'emp_03', name: 'Charlie Brown', designation: 'UX Designer', department: 'Design' },
  { id: 'emp_04', name: 'Diana Prince', designation: 'Data Scientist', department: 'Data' },
  { id: 'emp_05', name: 'Evan Wright', designation: 'DevOps Engineer', department: 'Engineering' },
  { id: 'emp_06', name: 'Fiona Gallagher', designation: 'Marketing Specialist', department: 'Marketing' },
  { id: 'emp_07', name: 'George Miller', designation: 'Sales Executive', department: 'Sales' },
  { id: 'emp_08', name: 'Hannah Abbott', designation: 'HR Business Partner', department: 'HR' },
  { id: 'emp_09', name: 'Ian Malcolm', designation: 'Backend Developer', department: 'Engineering' },
  { id: 'emp_10', name: 'Jessica Jones', designation: 'QA Engineer', department: 'Engineering' },
  { id: 'emp_11', name: 'Kevin Durant', designation: 'Account Manager', department: 'Sales' },
  { id: 'emp_12', name: 'Laura Palmer', designation: 'Content Writer', department: 'Marketing' },
];

const generateKeyResults = () => [
  { title: 'Research and Analysis', weightage: 30, achievement: 100 },
  { title: 'Implementation and Testing', weightage: 50, achievement: 60 },
  { title: 'Deployment and Monitoring', weightage: 20, achievement: 0 },
];

export const goals = {
  emp_01: [
    { id: 'g_01', title: 'Improve Backend Performance', description: 'Reduce API response times by optimizing database queries.', goal_type: 'OKR', status: 'On Track', progress: 75, start_date: '2026-06-01', dueDate: '2026-09-30', weightage: 40, score: 80, key_results: generateKeyResults() },
    { id: 'g_02', title: 'Implement GraphQL API', description: 'Transition legacy REST endpoints to GraphQL.', goal_type: 'KPI', status: 'At Risk', progress: 40, start_date: '2026-07-01', dueDate: '2026-10-15', weightage: 40, score: 45, key_results: generateKeyResults() },
    { id: 'g_03', title: 'Migrate to Node 20', description: 'Upgrade all microservices to Node 20.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-01-01', dueDate: '2026-07-01', weightage: 20, score: 100, key_results: generateKeyResults() },
  ],
  emp_02: [
    { id: 'g_04', title: 'Launch Q3 Product Features', description: 'Deliver all planned Q3 features to production.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-04-01', dueDate: '2026-08-01', weightage: 50, score: 95, key_results: generateKeyResults() },
    { id: 'g_05', title: 'Customer Discovery Interviews', description: 'Interview 20 key customers.', goal_type: 'KPI', status: 'On Track', progress: 60, start_date: '2026-07-01', dueDate: '2026-09-15', weightage: 30, score: 65, key_results: generateKeyResults() },
    { id: 'g_06', title: 'Define Q4 Roadmap', description: 'Finalize Q4 roadmap with stakeholders.', goal_type: 'OKR', status: 'At Risk', progress: 20, start_date: '2026-08-01', dueDate: '2026-10-01', weightage: 10, score: 25, key_results: generateKeyResults() },
    { id: 'g_07', title: 'Competitive Analysis for Q4', description: 'Analyze 3 major competitors.', goal_type: 'KPI', status: 'On Track', progress: 50, start_date: '2026-07-15', dueDate: '2026-09-20', weightage: 10, score: 50, key_results: generateKeyResults() },
  ],
  emp_03: [
    { id: 'g_08', title: 'Revamp User Onboarding', description: 'Redesign onboarding flow to improve activation.', goal_type: 'OKR', status: 'On Track', progress: 85, start_date: '2026-06-01', dueDate: '2026-08-30', weightage: 40, score: 88, key_results: generateKeyResults() },
    { id: 'g_09', title: 'Conduct Accessibility Audit', description: 'Ensure platform meets WCAG 2.1 AA.', goal_type: 'KPI', status: 'On Track', progress: 50, start_date: '2026-07-01', dueDate: '2026-11-01', weightage: 30, score: 55, key_results: generateKeyResults() },
    { id: 'g_10', title: 'Design System Update', description: 'Add new components to Figma library.', goal_type: 'OKR', status: 'At Risk', progress: 30, start_date: '2026-08-01', dueDate: '2026-10-15', weightage: 30, score: 35, key_results: generateKeyResults() },
  ],
  emp_04: [
    { id: 'g_11', title: 'Build Churn Prediction Model', description: 'Develop ML model to predict customer churn.', goal_type: 'OKR', status: 'On Track', progress: 65, start_date: '2026-05-01', dueDate: '2026-09-20', weightage: 50, score: 70, key_results: generateKeyResults() },
    { id: 'g_12', title: 'Automate Daily Data Pipeline', description: 'Migrate manual cron jobs to Airflow.', goal_type: 'KPI', status: 'Completed', progress: 100, start_date: '2026-01-01', dueDate: '2026-06-15', weightage: 30, score: 100, key_results: generateKeyResults() },
    { id: 'g_13', title: 'Analyze A/B Test Results', description: 'Compile results for sign-up flow variants.', goal_type: 'KPI', status: 'On Track', progress: 90, start_date: '2026-08-01', dueDate: '2026-08-25', weightage: 20, score: 92, key_results: generateKeyResults() },
  ],
  emp_05: [
    { id: 'g_14', title: 'Implement Zero-Downtime Deployments', description: 'Set up Blue-Green deployment strategy.', goal_type: 'OKR', status: 'On Track', progress: 90, start_date: '2026-06-01', dueDate: '2026-08-20', weightage: 40, score: 92, key_results: generateKeyResults() },
    { id: 'g_15', title: 'Optimize AWS Costs', description: 'Reduce monthly AWS bill by 15%.', goal_type: 'KPI', status: 'On Track', progress: 30, start_date: '2026-07-01', dueDate: '2026-12-01', weightage: 30, score: 35, key_results: generateKeyResults() },
    { id: 'g_16', title: 'Upgrade CI/CD Pipelines', description: 'Migrate to GitHub Actions.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-04-01', dueDate: '2026-07-15', weightage: 20, score: 98, key_results: generateKeyResults() },
    { id: 'g_17', title: 'Set up Disaster Recovery', description: 'Implement cross-region replication.', goal_type: 'KPI', status: 'At Risk', progress: 10, start_date: '2026-08-01', dueDate: '2026-11-30', weightage: 10, score: 15, key_results: generateKeyResults() },
  ],
  emp_06: [
    { id: 'g_18', title: 'Launch Fall Email Campaign', description: 'Design and execute fall campaign.', goal_type: 'OKR', status: 'On Track', progress: 45, start_date: '2026-07-01', dueDate: '2026-09-10', weightage: 40, score: 50, key_results: generateKeyResults() },
    { id: 'g_19', title: 'Increase Social Media Engagement', description: 'Grow LinkedIn followers by 20%.', goal_type: 'KPI', status: 'On Track', progress: 70, start_date: '2026-05-01', dueDate: '2026-10-31', weightage: 30, score: 75, key_results: generateKeyResults() },
    { id: 'g_20', title: 'Q3 Webinar Execution', description: 'Host the Q3 product webinar.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-06-01', dueDate: '2026-07-25', weightage: 30, score: 100, key_results: generateKeyResults() },
  ],
  emp_07: [
    { id: 'g_21', title: 'Close Enterprise Accounts (Target: 5)', description: 'Sign 5 new enterprise logos.', goal_type: 'KPI', status: 'At Risk', progress: 40, start_date: '2026-01-01', dueDate: '2026-12-31', weightage: 60, score: 45, key_results: generateKeyResults() },
    { id: 'g_22', title: 'Attend Industry Conferences', description: 'Represent company at 3 major events.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-02-01', dueDate: '2026-07-20', weightage: 20, score: 95, key_results: generateKeyResults() },
    { id: 'g_23', title: 'Develop Q4 Sales Pitch', description: 'Create new pitch deck for Q4.', goal_type: 'OKR', status: 'On Track', progress: 60, start_date: '2026-08-01', dueDate: '2026-09-15', weightage: 20, score: 65, key_results: generateKeyResults() },
  ],
  emp_08: [
    { id: 'g_24', title: 'Rollout New Performance Review Tool', description: 'Train and onboard all staff.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-05-01', dueDate: '2026-08-05', weightage: 50, score: 100, key_results: generateKeyResults() },
    { id: 'g_25', title: 'Organize Team Building Offsite', description: 'Plan annual company retreat.', goal_type: 'KPI', status: 'On Track', progress: 70, start_date: '2026-06-01', dueDate: '2026-09-25', weightage: 30, score: 75, key_results: generateKeyResults() },
    { id: 'g_26', title: 'Revise Employee Handbook', description: 'Update remote work policies.', goal_type: 'OKR', status: 'On Track', progress: 40, start_date: '2026-07-01', dueDate: '2026-10-30', weightage: 20, score: 45, key_results: generateKeyResults() },
  ],
  emp_09: [
    { id: 'g_27', title: 'Refactor Payment Gateway', description: 'Migrate Stripe integration.', goal_type: 'OKR', status: 'On Track', progress: 80, start_date: '2026-06-01', dueDate: '2026-08-25', weightage: 50, score: 85, key_results: generateKeyResults() },
    { id: 'g_28', title: 'Upgrade Database Engine', description: 'Upgrade PostgreSQL version.', goal_type: 'KPI', status: 'At Risk', progress: 10, start_date: '2026-07-01', dueDate: '2026-10-10', weightage: 30, score: 15, key_results: generateKeyResults() },
    { id: 'g_29', title: 'Implement Redis Caching', description: 'Add caching to user feeds.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-05-01', dueDate: '2026-07-30', weightage: 20, score: 98, key_results: generateKeyResults() },
  ],
  emp_10: [
    { id: 'g_30', title: 'Automate Regression Testing', description: 'Increase test coverage to 80%.', goal_type: 'OKR', status: 'On Track', progress: 60, start_date: '2026-06-01', dueDate: '2026-11-15', weightage: 40, score: 65, key_results: generateKeyResults() },
    { id: 'g_31', title: 'Reduce Bug Leakage to Prod', description: 'Keep critical bugs under 2%.', goal_type: 'KPI', status: 'On Track', progress: 75, start_date: '2026-01-01', dueDate: '2026-12-31', weightage: 40, score: 80, key_results: generateKeyResults() },
    { id: 'g_32', title: 'Update Test Documentation', description: 'Document all legacy test cases.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-04-01', dueDate: '2026-08-01', weightage: 20, score: 95, key_results: generateKeyResults() },
  ],
  emp_11: [
    { id: 'g_33', title: 'Increase Upsells by 20%', description: 'Pitch premium tiers to existing clients.', goal_type: 'KPI', status: 'On Track', progress: 55, start_date: '2026-01-01', dueDate: '2026-12-31', weightage: 50, score: 60, key_results: generateKeyResults() },
    { id: 'g_34', title: 'Onboard 10 New VIP Clients', description: 'Ensure smooth onboarding for top clients.', goal_type: 'OKR', status: 'At Risk', progress: 30, start_date: '2026-05-01', dueDate: '2026-11-30', weightage: 30, score: 35, key_results: generateKeyResults() },
    { id: 'g_35', title: 'Client Feedback Surveys', description: 'Achieve 80% completion rate.', goal_type: 'KPI', status: 'On Track', progress: 80, start_date: '2026-07-01', dueDate: '2026-09-01', weightage: 20, score: 85, key_results: generateKeyResults() },
  ],
  emp_12: [
    { id: 'g_36', title: 'Publish 10 Blog Posts', description: 'Create content for Q3 and Q4.', goal_type: 'OKR', status: 'On Track', progress: 70, start_date: '2026-06-01', dueDate: '2026-10-31', weightage: 40, score: 75, key_results: generateKeyResults() },
    { id: 'g_37', title: 'Revise Website Copy', description: 'Update homepage and product pages.', goal_type: 'OKR', status: 'Completed', progress: 100, start_date: '2026-05-01', dueDate: '2026-07-30', weightage: 40, score: 100, key_results: generateKeyResults() },
    { id: 'g_38', title: 'Create Video Scripts for Ads', description: 'Draft 3 new YouTube ad scripts.', goal_type: 'KPI', status: 'On Track', progress: 50, start_date: '2026-07-15', dueDate: '2026-09-15', weightage: 20, score: 55, key_results: generateKeyResults() },
  ],
};

export const checkIns = {
  g_01: [
    { id: 'c_01', date: '2026-08-01', notes: 'Optimized database queries, reducing load time by 20%.', sentiment: 'On Track', progress: 75 },
    { id: 'c_02', date: '2026-07-15', notes: 'Identified bottlenecks in the user service.', sentiment: 'At Risk', progress: 50 },
  ],
  g_02: [
    { id: 'c_03', date: '2026-08-02', notes: 'Drafted the GraphQL schema. Pending review.', sentiment: 'On Track', progress: 40 },
    { id: 'c_04', date: '2026-07-20', notes: 'Struggling with schema federation setup.', sentiment: 'At Risk', progress: 20 },
  ],
  g_03: [
    { id: 'c_05', date: '2026-06-25', notes: 'All microservices successfully running on Node 20.', sentiment: 'Completed', progress: 100 },
    { id: 'c_06', date: '2026-05-15', notes: 'Started the initial evaluation of Node 20 features.', sentiment: 'On Track', progress: 10 },
  ],
  g_04: [
    { id: 'c_07', date: '2026-07-30', notes: 'Successfully deployed Q3 features to production.', sentiment: 'Completed', progress: 100 },
    { id: 'c_08', date: '2026-07-10', notes: 'Completed final round of UAT.', sentiment: 'On Track', progress: 80 },
  ],
  g_05: [
    { id: 'c_09', date: '2026-08-05', notes: 'Completed 12 out of 20 customer interviews.', sentiment: 'On Track', progress: 60 },
    { id: 'c_10', date: '2026-07-15', notes: 'Recruited 15 participants for the discovery batch.', sentiment: 'On Track', progress: 20 },
  ],
  g_06: [
    { id: 'c_11', date: '2026-08-01', notes: 'Initial brainstorming session completed. Need stakeholder alignment.', sentiment: 'At Risk', progress: 20 },
    { id: 'c_12', date: '2026-07-20', notes: 'Gathering feedback from customer success team.', sentiment: 'On Track', progress: 10 },
  ],
  g_07: [
    { id: 'c_13', date: '2026-08-04', notes: 'Finished analyzing 3 major competitors.', sentiment: 'On Track', progress: 50 },
    { id: 'c_14', date: '2026-07-25', notes: 'Started drafting the comparative matrix.', sentiment: 'On Track', progress: 10 },
  ],
  g_08: [
    { id: 'c_15', date: '2026-08-04', notes: 'Finalized the high-fidelity mockups for onboarding.', sentiment: 'On Track', progress: 85 },
    { id: 'c_16', date: '2026-07-20', notes: 'Conducted A/B testing on initial wireframes.', sentiment: 'On Track', progress: 60 },
  ],
  g_09: [
    { id: 'c_17', date: '2026-07-10', notes: 'Started researching WCAG 2.1 guidelines.', sentiment: 'On Track', progress: 20 },
    { id: 'c_18', date: '2026-08-02', notes: 'Completed preliminary scan of the main dashboard.', sentiment: 'On Track', progress: 50 },
  ],
  g_10: [
    { id: 'c_19', date: '2026-08-01', notes: 'Updating color palettes. Facing some contrast issues.', sentiment: 'At Risk', progress: 30 },
    { id: 'c_20', date: '2026-07-15', notes: 'Gathered feedback on the old component library.', sentiment: 'On Track', progress: 10 },
  ],
  g_11: [
    { id: 'c_21', date: '2026-08-02', notes: 'Model is predicting with 82% accuracy in testing.', sentiment: 'On Track', progress: 65 },
    { id: 'c_22', date: '2026-07-15', notes: 'Finished cleaning historical user data.', sentiment: 'On Track', progress: 30 },
  ],
  g_12: [
    { id: 'c_23', date: '2026-06-10', notes: 'Pipeline is running every night without failures.', sentiment: 'Completed', progress: 100 },
    { id: 'c_24', date: '2026-05-20', notes: 'Scripted the extraction from legacy DB.', sentiment: 'On Track', progress: 50 },
  ],
  g_13: [
    { id: 'c_25', date: '2026-08-05', notes: 'Sign-up variant B showed a 15% increase in conversion.', sentiment: 'On Track', progress: 90 },
    { id: 'c_26', date: '2026-07-28', notes: 'Test concluded, compiling data now.', sentiment: 'On Track', progress: 70 },
  ],
  g_14: [
    { id: 'c_27', date: '2026-08-03', notes: 'Blue-green deployment strategy is implemented in staging.', sentiment: 'On Track', progress: 90 },
    { id: 'c_28', date: '2026-07-18', notes: 'Configuring load balancers to support zero downtime.', sentiment: 'On Track', progress: 50 },
  ],
  g_15: [
    { id: 'c_29', date: '2026-07-25', notes: 'Identified unused EC2 instances to terminate.', sentiment: 'On Track', progress: 30 },
    { id: 'c_30', date: '2026-08-02', notes: 'Need approval from leads before terminating RDS snapshots.', sentiment: 'At Risk', progress: 30 },
  ],
  g_16: [
    { id: 'c_31', date: '2026-07-10', notes: 'Pipelines now run 3x faster with caching.', sentiment: 'Completed', progress: 100 },
    { id: 'c_32', date: '2026-06-25', notes: 'Migrated to new GitHub Actions runners.', sentiment: 'On Track', progress: 60 },
  ],
  g_17: [
    { id: 'c_33', date: '2026-08-01', notes: 'Started planning cross-region replication.', sentiment: 'On Track', progress: 10 },
    { id: 'c_34', date: '2026-08-05', notes: 'Blocked by budget constraints for the secondary region.', sentiment: 'At Risk', progress: 10 },
  ],
  g_18: [
    { id: 'c_35', date: '2026-08-01', notes: 'Drafted email copy and subject lines.', sentiment: 'On Track', progress: 45 },
    { id: 'c_36', date: '2026-07-20', notes: 'Segmented the user lists for targeting.', sentiment: 'On Track', progress: 20 },
  ],
  g_19: [
    { id: 'c_37', date: '2026-08-03', notes: 'Engagement is up 10% on LinkedIn this week.', sentiment: 'On Track', progress: 70 },
    { id: 'c_38', date: '2026-07-25', notes: 'Posted 3 new video snippets.', sentiment: 'On Track', progress: 40 },
  ],
  g_20: [
    { id: 'c_39', date: '2026-07-26', notes: 'Webinar was a huge success, 500+ attendees.', sentiment: 'Completed', progress: 100 },
    { id: 'c_40', date: '2026-07-15', notes: 'Finalized the slide deck and practiced with speakers.', sentiment: 'On Track', progress: 80 },
  ],
  g_21: [
    { id: 'c_41', date: '2026-08-05', notes: 'Closed 2 out of 5 targets. Deal pipeline is dry.', sentiment: 'At Risk', progress: 40 },
    { id: 'c_42', date: '2026-07-05', notes: 'Closed the first enterprise account for the year!', sentiment: 'On Track', progress: 20 },
  ],
  g_22: [
    { id: 'c_43', date: '2026-07-15', notes: 'Attended SaaS Connect and gathered 50+ leads.', sentiment: 'Completed', progress: 100 },
    { id: 'c_44', date: '2026-07-01', notes: 'Registered for 3 upcoming events.', sentiment: 'On Track', progress: 50 },
  ],
  g_23: [
    { id: 'c_45', date: '2026-08-02', notes: 'Drafted the initial pitch deck.', sentiment: 'On Track', progress: 60 },
    { id: 'c_46', date: '2026-07-25', notes: 'Discussing messaging strategy with marketing.', sentiment: 'On Track', progress: 20 },
  ],
  g_24: [
    { id: 'c_47', date: '2026-08-04', notes: 'All employees onboarded to the new platform successfully.', sentiment: 'Completed', progress: 100 },
    { id: 'c_48', date: '2026-07-20', notes: 'Conducted 3 training sessions for managers.', sentiment: 'On Track', progress: 80 },
  ],
  g_25: [
    { id: 'c_49', date: '2026-08-02', notes: 'Venue is booked. Finalizing the catering menu.', sentiment: 'On Track', progress: 70 },
    { id: 'c_50', date: '2026-07-15', notes: 'Sent out the date-saver emails to the team.', sentiment: 'On Track', progress: 20 },
  ],
  g_26: [
    { id: 'c_51', date: '2026-08-01', notes: 'Reviewing remote work policies.', sentiment: 'On Track', progress: 40 },
    { id: 'c_52', date: '2026-07-25', notes: 'Gathering feedback from legal team.', sentiment: 'At Risk', progress: 20 },
  ],
  g_27: [
    { id: 'c_53', date: '2026-08-01', notes: 'Moved Stripe integration to the new architecture.', sentiment: 'On Track', progress: 80 },
    { id: 'c_54', date: '2026-07-15', notes: 'Refactored the webhook handlers.', sentiment: 'On Track', progress: 40 },
  ],
  g_28: [
    { id: 'c_55', date: '2026-07-10', notes: 'Migration script keeps failing due to missing primary keys.', sentiment: 'At Risk', progress: 10 },
    { id: 'c_56', date: '2026-07-01', notes: 'Set up the replica database for testing.', sentiment: 'On Track', progress: 5 },
  ],
  g_29: [
    { id: 'c_57', date: '2026-07-25', notes: 'Redis cluster is live in production.', sentiment: 'Completed', progress: 100 },
    { id: 'c_58', date: '2026-07-10', notes: 'Load testing the cache layer.', sentiment: 'On Track', progress: 80 },
  ],
  g_30: [
    { id: 'c_59', date: '2026-08-03', notes: 'Added 50 new Cypress tests for the checkout flow.', sentiment: 'On Track', progress: 60 },
    { id: 'c_60', date: '2026-07-20', notes: 'Configured Cypress to run on every PR.', sentiment: 'On Track', progress: 30 },
  ],
  g_31: [
    { id: 'c_61', date: '2026-07-25', notes: 'Leakage dropped to 2% this sprint.', sentiment: 'On Track', progress: 75 },
    { id: 'c_62', date: '2026-07-10', notes: 'Implemented stricter PR review checklists.', sentiment: 'On Track', progress: 40 },
  ],
  g_32: [
    { id: 'c_63', date: '2026-08-01', notes: 'All legacy test cases have been documented.', sentiment: 'Completed', progress: 100 },
    { id: 'c_64', date: '2026-07-15', notes: 'Created a new Confluence space for QA.', sentiment: 'On Track', progress: 50 },
  ],
  g_33: [
    { id: 'c_65', date: '2026-08-01', notes: 'Upsell metrics hit 11% this month.', sentiment: 'On Track', progress: 55 },
    { id: 'c_66', date: '2026-07-15', notes: 'Started pitching the new premium tier.', sentiment: 'On Track', progress: 30 },
  ],
  g_34: [
    { id: 'c_67', date: '2026-08-05', notes: 'Only 2 VIPs onboarded so far. Need more leads.', sentiment: 'At Risk', progress: 30 },
    { id: 'c_68', date: '2026-07-20', notes: 'Created custom VIP onboarding decks.', sentiment: 'On Track', progress: 20 },
  ],
  g_35: [
    { id: 'c_69', date: '2026-08-02', notes: 'Sent out 100 surveys. 40 responses received.', sentiment: 'On Track', progress: 80 },
    { id: 'c_70', date: '2026-07-15', notes: 'Finalized the survey questions.', sentiment: 'On Track', progress: 20 },
  ],
  g_36: [
    { id: 'c_71', date: '2026-08-05', notes: '7 blogs published. 3 currently in review.', sentiment: 'On Track', progress: 70 },
    { id: 'c_72', date: '2026-07-20', notes: 'Finished the content calendar for Q3.', sentiment: 'On Track', progress: 30 },
  ],
  g_37: [
    { id: 'c_73', date: '2026-07-28', notes: 'New copy is live on the homepage.', sentiment: 'Completed', progress: 100 },
    { id: 'c_74', date: '2026-07-10', notes: 'Finalized the hero section copy with marketing.', sentiment: 'On Track', progress: 70 },
  ],
  g_38: [
    { id: 'c_75', date: '2026-08-04', notes: 'Drafted scripts for 2 YouTube ads.', sentiment: 'On Track', progress: 50 },
    { id: 'c_76', date: '2026-07-25', notes: 'Awaiting product team approval on the messaging.', sentiment: 'At Risk', progress: 20 },
  ],
};

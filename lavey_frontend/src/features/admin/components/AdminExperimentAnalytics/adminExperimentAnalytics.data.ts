export const ANALYTICS_YEARS = [2024, 2025, 2026] as const;

export type AnalyticsYear = (typeof ANALYTICS_YEARS)[number];

export interface MonthlyRegistration {
  month: string;
  men: number;
  women: number;
}

export interface MonthlyEngagement {
  month: string;
  activeUsers: number;
  avgHours: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export type AnalyticsPeriod = 'monthly-revenue' | 'active-users' | 'new-users';

export interface DailyNewUsers {
  day: number;
  users: number;
}

/** Current mock month for “This month” spotlight (May 2026). */
export const ANALYTICS_CURRENT_MONTH = 'May';

export const REVENUE_BY_YEAR: Record<AnalyticsYear, MonthlyRevenue[]> = {
  2024: [
    { month: 'Jan', revenue: 612000 },
    { month: 'Feb', revenue: 628000 },
    { month: 'Mar', revenue: 645000 },
    { month: 'Apr', revenue: 658000 },
    { month: 'May', revenue: 672000 },
    { month: 'Jun', revenue: 688000 },
    { month: 'Jul', revenue: 701000 },
    { month: 'Aug', revenue: 715000 },
    { month: 'Sep', revenue: 708000 },
    { month: 'Oct', revenue: 724000 },
    { month: 'Nov', revenue: 738000 },
    { month: 'Dec', revenue: 752000 },
  ],
  2025: [
    { month: 'Jan', revenue: 768000 },
    { month: 'Feb', revenue: 782000 },
    { month: 'Mar', revenue: 798000 },
    { month: 'Apr', revenue: 812000 },
    { month: 'May', revenue: 826000 },
    { month: 'Jun', revenue: 842000 },
    { month: 'Jul', revenue: 858000 },
    { month: 'Aug', revenue: 872000 },
    { month: 'Sep', revenue: 864000 },
    { month: 'Oct', revenue: 878000 },
    { month: 'Nov', revenue: 892000 },
    { month: 'Dec', revenue: 908000 },
  ],
  2026: [
    { month: 'Jan', revenue: 918000 },
    { month: 'Feb', revenue: 932000 },
    { month: 'Mar', revenue: 948000 },
    { month: 'Apr', revenue: 962000 },
    { month: 'May', revenue: 842600 },
    { month: 'Jun', revenue: 0 },
    { month: 'Jul', revenue: 0 },
    { month: 'Aug', revenue: 0 },
    { month: 'Sep', revenue: 0 },
    { month: 'Oct', revenue: 0 },
    { month: 'Nov', revenue: 0 },
    { month: 'Dec', revenue: 0 },
  ],
};

export function yearlyRevenueTotal(year: AnalyticsYear): number {
  return REVENUE_BY_YEAR[year].reduce((sum, row) => sum + row.revenue, 0);
}

export function yearlyRegistrationTotals(year: AnalyticsYear): { men: number; women: number } {
  const rows = REGISTRATIONS_BY_YEAR[year];
  return {
    men: rows.reduce((sum, row) => sum + row.men, 0),
    women: rows.reduce((sum, row) => sum + row.women, 0),
  };
}

export const REGISTRATIONS_BY_YEAR: Record<AnalyticsYear, MonthlyRegistration[]> = {
  2024: [
    { month: 'Jan', men: 820, women: 940 },
    { month: 'Feb', men: 760, women: 1010 },
    { month: 'Mar', men: 910, women: 1120 },
    { month: 'Apr', men: 880, women: 1180 },
    { month: 'May', men: 940, women: 1240 },
    { month: 'Jun', men: 1020, women: 1310 },
    { month: 'Jul', men: 1080, women: 1380 },
    { month: 'Aug', men: 1120, women: 1420 },
    { month: 'Sep', men: 990, women: 1290 },
    { month: 'Oct', men: 1050, women: 1360 },
    { month: 'Nov', men: 1100, women: 1410 },
    { month: 'Dec', men: 1180, women: 1520 },
  ],
  2025: [
    { month: 'Jan', men: 1240, women: 1580 },
    { month: 'Feb', men: 1180, women: 1620 },
    { month: 'Mar', men: 1320, women: 1710 },
    { month: 'Apr', men: 1280, women: 1760 },
    { month: 'May', men: 1410, women: 1840 },
    { month: 'Jun', men: 1520, women: 1920 },
    { month: 'Jul', men: 1580, women: 2010 },
    { month: 'Aug', men: 1640, women: 2080 },
    { month: 'Sep', men: 1490, women: 1950 },
    { month: 'Oct', men: 1560, women: 2040 },
    { month: 'Nov', men: 1620, women: 2110 },
    { month: 'Dec', men: 1710, women: 2240 },
  ],
  2026: [
    { month: 'Jan', men: 1820, women: 2380 },
    { month: 'Feb', men: 1760, women: 2410 },
    { month: 'Mar', men: 1940, women: 2520 },
    { month: 'Apr', men: 1880, women: 2610 },
    { month: 'May', men: 2010, women: 2680 },
    { month: 'Jun', men: 0, women: 0 },
    { month: 'Jul', men: 0, women: 0 },
    { month: 'Aug', men: 0, women: 0 },
    { month: 'Sep', men: 0, women: 0 },
    { month: 'Oct', men: 0, women: 0 },
    { month: 'Nov', men: 0, women: 0 },
    { month: 'Dec', men: 0, women: 0 },
  ],
};

export const ENGAGEMENT_BY_YEAR: Record<AnalyticsYear, MonthlyEngagement[]> = {
  2024: [
    { month: 'Jan', activeUsers: 62400, avgHours: 3.8 },
    { month: 'Feb', activeUsers: 63800, avgHours: 3.9 },
    { month: 'Mar', activeUsers: 65200, avgHours: 4.0 },
    { month: 'Apr', activeUsers: 66800, avgHours: 4.1 },
    { month: 'May', activeUsers: 68100, avgHours: 4.2 },
    { month: 'Jun', activeUsers: 70200, avgHours: 4.3 },
    { month: 'Jul', activeUsers: 71800, avgHours: 4.4 },
    { month: 'Aug', activeUsers: 73100, avgHours: 4.5 },
    { month: 'Sep', activeUsers: 72400, avgHours: 4.4 },
    { month: 'Oct', activeUsers: 74200, avgHours: 4.6 },
    { month: 'Nov', activeUsers: 75800, avgHours: 4.7 },
    { month: 'Dec', activeUsers: 77200, avgHours: 4.8 },
  ],
  2025: [
    { month: 'Jan', activeUsers: 79800, avgHours: 4.9 },
    { month: 'Feb', activeUsers: 81200, avgHours: 5.0 },
    { month: 'Mar', activeUsers: 83400, avgHours: 5.1 },
    { month: 'Apr', activeUsers: 85100, avgHours: 5.1 },
    { month: 'May', activeUsers: 86800, avgHours: 5.2 },
    { month: 'Jun', activeUsers: 88600, avgHours: 5.3 },
    { month: 'Jul', activeUsers: 90200, avgHours: 5.4 },
    { month: 'Aug', activeUsers: 91800, avgHours: 5.5 },
    { month: 'Sep', activeUsers: 90800, avgHours: 5.4 },
    { month: 'Oct', activeUsers: 92400, avgHours: 5.6 },
    { month: 'Nov', activeUsers: 93600, avgHours: 5.7 },
    { month: 'Dec', activeUsers: 94800, avgHours: 5.8 },
  ],
  2026: [
    { month: 'Jan', activeUsers: 96200, avgHours: 5.9 },
    { month: 'Feb', activeUsers: 97800, avgHours: 6.0 },
    { month: 'Mar', activeUsers: 99100, avgHours: 6.1 },
    { month: 'Apr', activeUsers: 100400, avgHours: 6.2 },
    { month: 'May', activeUsers: 94320, avgHours: 6.3 },
    { month: 'Jun', activeUsers: 0, avgHours: 0 },
    { month: 'Jul', activeUsers: 0, avgHours: 0 },
    { month: 'Aug', activeUsers: 0, avgHours: 0 },
    { month: 'Sep', activeUsers: 0, avgHours: 0 },
    { month: 'Oct', activeUsers: 0, avgHours: 0 },
    { month: 'Nov', activeUsers: 0, avgHours: 0 },
    { month: 'Dec', activeUsers: 0, avgHours: 0 },
  ],
};

/** New user sign-ups per day for the current analytics month (May). */
export function newUsersByDay(year: AnalyticsYear): DailyNewUsers[] {
  const daysInMay = 31;
  const base = year === 2024 ? 118 : year === 2025 ? 172 : 214;

  return Array.from({ length: daysInMay }, (_, index) => {
    const day = index + 1;
    const wave = Math.round(Math.sin(index * 0.45) * 36);
    const weekend = day % 7 === 0 || day % 7 === 6 ? 28 : 0;
    const users = Math.max(72, base + wave + weekend + ((day * 7 + year) % 23));

    return { day, users };
  });
}

export function newUsersMonthTotal(year: AnalyticsYear): number {
  return newUsersByDay(year).reduce((sum, row) => sum + row.users, 0);
}

export function newUsersPeakDay(year: AnalyticsYear): DailyNewUsers {
  const rows = newUsersByDay(year);
  return rows.reduce((peak, row) => (row.users > peak.users ? row : peak), rows[0]);
}

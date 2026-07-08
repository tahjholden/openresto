import { getIsoDayFromDateString } from "@/utils/openingHours";

/**
 * Shared helpers for the walk-in-only policy. A location is walk-in only
 * either globally (`walkInOnly`) or on specific ISO days listed in
 * `walkInDays` (1=Monday … 7=Sunday, comma-separated). Walk-in-only means
 * the location stays listed publicly but the booking flow is disabled.
 */

export interface WalkInSource {
  walkInOnly?: boolean;
  walkInDays?: string | null;
}

const DAY_NAMES = [
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
];

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY__FIRST_LETTER = ["M", "T", "W", "T", "F", "Sat", "Sun"];

export function parseWalkInDays(walkInDays?: string | null): number[] {
  if (!walkInDays) return [];
  return walkInDays
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => d >= 1 && d <= 7);
}

/** True when the location takes no online bookings on the given ISO day. */
export function isWalkInOnlyOnDay(restaurant: WalkInSource, isoDay: number): boolean {
  if (restaurant.walkInOnly) return true;
  return parseWalkInDays(restaurant.walkInDays).includes(isoDay);
}

/** True when the location takes no online bookings on a "YYYY-MM-DD" date. */
export function isWalkInOnlyOnDate(restaurant: WalkInSource, date: string): boolean {
  return isWalkInOnlyOnDay(restaurant, getIsoDayFromDateString(date));
}

/** Human summary of the walk-in days, e.g. "Saturdays and Sundays". */
export function walkInDaysLabel(restaurant: WalkInSource): string | null {
  const days = [...new Set(parseWalkInDays(restaurant.walkInDays))].sort((a, b) => a - b);
  //the rules here are as follows
  //consecutive days show first day and last day, e.g. "Mon–Wed"
  //non-consecutive days show all days, e.g. "Mon, Wed and Fri" as long as its 3 or less days
  //otherwise show the first letter representations
  if (days.length === 0) return null;
  const isConsecutiveRun = days.length > 2 && days[days.length - 1] - days[0] + 1 === days.length;
  if (days.length > 3 || isConsecutiveRun) return consecutiveDaysLabel(days);
  const dayNames = days.length > 2 ? DAY_NAMES_SHORT : DAY_NAMES;
  const names = days.map((d) => dayNames[d - 1]);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Groups consecutive ISO days, e.g. "Mon–Wed, Fri" for [1,2,3,5]. */
function consecutiveDaysLabel(days: number[]): string {
  const groups = days.reduce<number[][]>((groups, day) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && day === lastGroup[lastGroup.length - 1] + 1) {
      lastGroup.push(day);
    } else {
      groups.push([day]);
    }
    return groups;
  }, []);

  return groups
    .map((group) =>
      group.length === 1
        ? DAY__FIRST_LETTER[group[0] - 1]
        : `${DAY__FIRST_LETTER[group[0] - 1]}–${DAY__FIRST_LETTER[group[group.length - 1] - 1]}`
    )
    .join(", ");
}

/**
 * Single source of truth for the top-of-card status badge. Always reflects
 * the walk-in policy regardless of whether today happens to be a walk-in
 * day, so the badge never disappears and reappears as the date changes.
 * Returns `null` when the location takes online bookings every day.
 */
export function walkInBadgeLabel(restaurant: WalkInSource): string | null {
  if (restaurant.walkInOnly) return "Walk-ins only";
  const daysLabel = walkInDaysLabel(restaurant);
  return daysLabel ? `Walk-ins on ${daysLabel}` : null;
}

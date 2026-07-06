import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { RestaurantDto } from "@/api/restaurants";
import { StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getThemeColors, COLORS } from "@/theme/theme";
import { useBrand } from "@/context/BrandContext";
import { Ionicons } from "@expo/vector-icons";
import { getHoursForDay, getIsoDayFromDateString, parseOpenDays } from "@/utils/openingHours";
import { isWalkInOnlyOnDay } from "@/utils/walkIn";
import { getNowInTimezone } from "@/utils/date";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function RestaurantDetails({ restaurant }: { restaurant: RestaurantDto }) {
  const isDark = useColorScheme() === "dark";
  const colors = getThemeColors(isDark);
  const brand = useBrand();
  const primaryColor = brand.primaryColor || COLORS.primary;
  const mutedColor = colors.muted;
  const borderColor = colors.border;
  const chipBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const timezone = restaurant.timezone || "UTC";
  const todayIsoDay = getIsoDayFromDateString(getNowInTimezone(timezone).dateStr);
  const openDaysList = parseOpenDays(restaurant.openDays);

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.name}>
        {restaurant.name}
      </ThemedText>

      {restaurant.address ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color={mutedColor} />
          <ThemedText style={[styles.address, { color: mutedColor }]}>
            {restaurant.address}
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <ThemedText type="defaultSemiBold" style={styles.sectionHeading}>
        Opening Hours
      </ThemedText>

      <ThemedView style={[styles.hoursCard, { borderColor }]}>
        {DAY_LABELS.map((label, idx) => {
          const day = idx + 1;
          const isOpenDay = openDaysList.includes(day);
          const isToday = day === todayIsoDay;
          const { open, close } = getHoursForDay(restaurant, day);
          const walkInOnly = isOpenDay && isWalkInOnlyOnDay(restaurant, day);
          return (
            <View
              key={day}
              style={[styles.hoursRow, isToday && { backgroundColor: `${primaryColor}14` }]}
            >
              <ThemedText style={[styles.hoursDay, isToday && { color: primaryColor }]}>
                {label}
                {isToday ? " · Today" : ""}
              </ThemedText>
              <ThemedText
                style={[styles.hoursValue, { color: isOpenDay ? colors.text : mutedColor }]}
              >
                {!isOpenDay ? "Closed" : walkInOnly ? "Walk-ins only" : `${open} – ${close}`}
              </ThemedText>
            </View>
          );
        })}
      </ThemedView>

      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <ThemedText type="defaultSemiBold" style={styles.sectionHeading}>
        Seating
      </ThemedText>

      {restaurant.sections.map((section) => (
        <ThemedView key={section.id} style={[styles.sectionCard, { borderColor }]}>
          <ThemedText style={styles.sectionName}>{section.name}</ThemedText>

          <View style={styles.tableGrid}>
            {section.tables.map((table) => (
              <View
                key={table.id}
                style={[styles.tableChip, { backgroundColor: chipBg, borderColor }]}
              >
                <ThemedText style={styles.tableName}>
                  {table.name ?? `Table ${table.id}`}
                </ThemedText>
                <ThemedText style={[styles.tableSeats, { color: mutedColor }]}>
                  {table.seats} seats
                </ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  name: {
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  address: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  sectionHeading: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hoursCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: "500",
  },
  hoursValue: {
    fontSize: 14,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: "600",
  },
  tableGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tableChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
  },
  tableName: {
    fontSize: 14,
    fontWeight: "500",
  },
  tableSeats: {
    fontSize: 12,
  },
});

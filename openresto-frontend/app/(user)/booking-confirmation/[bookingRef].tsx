import { ThemedText } from "@/components/themed-text";
import { getBookingByRef, getBookingById, BookingDto } from "@/api/bookings";
import { fetchRestaurantById, RestaurantDto } from "@/api/restaurants";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  COLORS,
  BORDER_RADIUS,
  BUTTON_SIZES,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
  getThemeColors,
} from "@/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import PageContainer from "@/components/layout/PageContainer";
import { useBrand } from "@/context/BrandContext";
import CalendarActions from "@/components/booking/CalendarActions";
import BookingDetailRows from "@/components/booking/BookingDetailRows";
import BookingConfirmationSkeleton from "@/components/booking/BookingConfirmationSkeleton";

export default function BookingConfirmationScreen() {
  const { bookingRef, email } = useLocalSearchParams<{ bookingRef: string; email: string }>();
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const brand = useBrand();
  const accent = brand.primaryColor || COLORS.primary;
  const isDark = useColorScheme() === "dark";
  const colors = getThemeColors(isDark);
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === "web" && width >= 768;

  useEffect(() => {
    if (!bookingRef) return;
    let cancelled = false;
    async function load() {
      const numericId = /^\d+$/.test(bookingRef) ? parseInt(bookingRef, 10) : NaN;
      const data = isNaN(numericId)
        ? await getBookingByRef(bookingRef, email ?? "")
        : await getBookingById(numericId);
      if (cancelled) return;
      setBooking(data);
      if (data?.restaurantId) {
        const r = await fetchRestaurantById(data.restaurantId);
        if (cancelled) return;
        setRestaurant(r);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [bookingRef, email]);

  if (loading) {
    return (
      <>
        {Platform.OS !== "web" && <Stack.Screen options={{ title: "Booking Confirmation" }} />}
        <BookingConfirmationSkeleton />
      </>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.page }]}>
        {Platform.OS !== "web" && <Stack.Screen options={{ title: "Not Found" }} />}
        <Ionicons name="alert-circle-outline" size={40} color={colors.muted} />
        <ThemedText style={[styles.notFoundText, { color: colors.muted }]}>
          Booking not found.
        </ThemedText>
        <Pressable
          style={[styles.retryBtn, { borderColor: colors.border }]}
          onPress={() => router.replace("/")}
        >
          <ThemedText style={[styles.retryBtnText, { color: accent }]}>Back to Home</ThemedText>
        </Pressable>
      </View>
    );
  }

  const ref = booking.bookingRef ?? bookingRef;
  const restaurantName = restaurant?.name ?? "Restaurant";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={styles.scrollContent}
    >
      {Platform.OS !== "web" && <Stack.Screen options={{ title: "Booking Confirmed" }} />}
      <PageContainer>
        <View style={[styles.successHeader, { paddingTop: isWide ? 48 : 20 }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={32} color={COLORS.white} />
          </View>
          <ThemedText style={styles.title}>Booking Confirmed</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            {booking.seats} {booking.seats === 1 ? "guest" : "guests"} at {restaurantName}. Save
            your reference below.
          </ThemedText>
        </View>

        <RefCard
          ref={ref}
          accent={accent}
          isDark={isDark}
          colors={colors}
          copied={copied}
          onCopy={() => {
            navigator.clipboard.writeText(ref);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        />

        <View style={isWide ? styles.wideRow : styles.narrowGap}>
          <View
            style={[
              styles.detailCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              isWide && styles.wideCol,
            ]}
          >
            <BookingDetailRows
              booking={booking}
              restaurant={restaurant}
              mutedColor={colors.muted}
              borderColor={colors.border}
            />
          </View>

          {Platform.OS === "web" && ref && (
            <View style={isWide && styles.wideCol}>
              <View
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <CalendarActions
                  bookingRef={ref}
                  date={booking.date}
                  seats={booking.seats}
                  specialRequests={booking.specialRequests}
                  restaurantName={restaurantName}
                  restaurantAddress={restaurant?.address ?? ""}
                  variant="full"
                />
              </View>
            </View>
          )}
        </View>

        <View style={isWide ? styles.actionsWide : styles.actions}>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.replace("/")}
          >
            <Ionicons name="home-outline" size={16} color={accent} />
            <ThemedText style={[styles.secondaryBtnText, { color: accent }]}>
              Back to Restaurants
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/(user)/lookup")}
          >
            <Ionicons name="search-outline" size={16} color={accent} />
            <ThemedText style={[styles.secondaryBtnText, { color: accent }]}>
              Find My Booking
            </ThemedText>
          </Pressable>
        </View>
      </PageContainer>
    </ScrollView>
  );
}

function RefCard({
  ref,
  accent,
  isDark,
  colors,
  copied,
  onCopy,
}: {
  ref: string;
  accent: string;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <View style={[styles.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ThemedText style={[styles.refLabel, { color: colors.muted }]}>Booking Reference</ThemedText>
      <View style={styles.refRow}>
        <View
          style={[styles.refBadge, { backgroundColor: isDark ? `${accent}22` : `${accent}14` }]}
        >
          <ThemedText style={[styles.refValue, { color: accent }]}>{ref}</ThemedText>
        </View>
        {Platform.OS === "web" && (
          <Pressable style={[styles.copyBtn, { borderColor: colors.border }]} onPress={onCopy}>
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={14}
              color={copied ? COLORS.success : accent}
            />
            <ThemedText style={[styles.copyBtnText, { color: copied ? COLORS.success : accent }]}>
              {copied ? "Copied" : "Copy"}
            </ThemedText>
          </Pressable>
        )}
      </View>
      <ThemedText style={[styles.refHint, { color: colors.muted }]}>
        Use this reference and your email to look up your booking
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  notFoundText: { fontSize: 16, marginTop: 8 },
  retryBtn: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xsm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14, fontWeight: "600" },
  successHeader: { alignItems: "center", paddingBottom: SPACING.lg, gap: SPACING.xsm },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { ...TYPOGRAPHY.h1, textAlign: "center" },
  subtitle: { ...TYPOGRAPHY.body, textAlign: "center", maxWidth: 400 },
  refCard: {
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    padding: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.md,
  },
  refLabel: {
    ...TYPOGRAPHY.labelSmall,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xsm,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  refBadge: { ...BUTTON_SIZES.secondary, borderRadius: BORDER_RADIUS.lg },
  refValue: { ...TYPOGRAPHY.h2, fontWeight: "800" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.xsm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  copyBtnText: { ...TYPOGRAPHY.caption, fontWeight: "600" },
  refHint: { ...TYPOGRAPHY.caption, textAlign: "center" },
  wideRow: {
    flexDirection: "row",
    gap: SPACING.xl,
    alignItems: "flex-start",
    marginTop: SPACING.lg,
  },
  narrowGap: { gap: SPACING.lg, marginTop: SPACING.lg },
  wideCol: { flex: 1 },
  detailCard: {
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    overflow: "hidden",
    ...SHADOWS.md,
  },
  actionCard: {
    borderRadius: BORDER_RADIUS.card,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.xsm,
    ...SHADOWS.md,
  },
  actions: { gap: SPACING.xsm, marginTop: SPACING.lg },
  actionsWide: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.lg },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 13,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    flex: 1,
  },
  secondaryBtnText: { ...TYPOGRAPHY.bodyBold },
});

import { useState } from "react";
import { View, Pressable } from "react-native";
import { ThemedText } from "@/components/themed-text";
import Input from "@/components/common/Input";
import { COLORS, getThemeColors } from "@/theme/theme";
import { TableDto, deleteTable, updateTable } from "@/api/restaurants";
import { Ionicons } from "@expo/vector-icons";
import { useBrand } from "@/context/BrandContext";
import { hexToRgba } from "@/utils/colors";
import { styles } from "./settings.styles";

export function TableRow({
  table,
  restaurantId,
  sectionId,
  isDark,
  borderColor,
  onUpdated,
  onDeleted,
  confirmAction,
}: {
  table: TableDto;
  restaurantId: number;
  sectionId: number;
  isDark: boolean;
  borderColor: string;
  onUpdated: (t: TableDto) => void;
  onDeleted: () => void;
  confirmAction: (msg: string) => Promise<boolean>;
}) {
  function tableIcon(seats: number): React.ComponentProps<typeof Ionicons>["name"] {
    if (seats <= 1) return "person-outline";
    if (seats <= 3) return "people-outline";
    if (seats <= 6) return "grid-outline";
    if (seats <= 9) return "apps-outline";
    return "albums-outline";
  }

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(table.name ?? "");
  const [draftSeats, setDraftSeats] = useState(String(table.seats));
  const [saving, setSaving] = useState(false);
  const colors = getThemeColors(isDark);
  const mutedColor = colors.muted;
  const cardBg = colors.card;
  const borderStrong = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
  const brand = useBrand();
  const primaryColor = brand.primaryColor || COLORS.primary;

  if (!editing) {
    return (
      // table-card: min ~160px wide, fills grid cell
      <View
        style={{
          width: 150,
          minHeight: 110,
          borderWidth: 1,
          borderRadius: 10,
          borderColor,
          padding: 12,
          gap: 8,
          backgroundColor: cardBg,
        }}
      >
        {/* row1: label + seats */}
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <ThemedText
            style={{ fontSize: 13, fontWeight: "600", fontFamily: "monospace" as const }}
            numberOfLines={1}
          >
            {table.name ?? `T${table.id}`}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="people-outline" size={10} color={mutedColor} />
            <ThemedText style={{ fontSize: 11, color: mutedColor }}>{table.seats}</ThemedText>
          </View>
        </View>

        {/* glyph: dashed border area with table icon */}
        <View
          style={{
            height: 44,
            borderRadius: 8,
            backgroundColor: isDark ? "#1a1b1e" : "#f2f3f5",
            borderWidth: 1,
            borderColor: borderStrong,
            borderStyle: "dashed",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={tableIcon(table.seats)} size={20} color={mutedColor} />
        </View>

        {/* row3: actions right-aligned */}
        <View style={{ flexDirection: "row", gap: 4, justifyContent: "flex-end" }}>
          <Pressable
            style={[styles.smallBtn, { padding: 6 }]}
            onPress={() => {
              setDraftName(table.name ?? "");
              setDraftSeats(String(table.seats));
              setEditing(true);
            }}
          >
            <Ionicons name="pencil-outline" size={13} color={mutedColor} />
          </Pressable>
          <Pressable
            style={[styles.smallBtn, { padding: 6 }]}
            onPress={async () => {
              const ok = await confirmAction(
                `Delete table "${table.name ?? `Table ${table.id}`}"?`
              );
              if (!ok) return;
              const success = await deleteTable(restaurantId, sectionId, table.id);
              if (success) onDeleted();
            }}
          >
            <Ionicons name="trash-outline" size={13} color={COLORS.error} />
          </Pressable>
        </View>
      </View>
    );
  }

  // Edit mode — full-width inline form
  return (
    <View
      style={{
        width: "100%",
        borderWidth: 1,
        borderRadius: 10,
        borderColor: primaryColor,
        padding: 12,
        gap: 10,
        backgroundColor: isDark ? hexToRgba(primaryColor, 0.08) : hexToRgba(primaryColor, 0.04),
      }}
    >
      <ThemedText
        style={{ fontSize: 11, fontWeight: "700", color: primaryColor, letterSpacing: 0.5 }}
      >
        EDITING · {table.name ?? `Table ${table.id}`}
      </ThemedText>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 2, gap: 4 }}>
          <ThemedText style={{ fontSize: 11, fontWeight: "600", color: mutedColor }}>
            NAME
          </ThemedText>
          <Input value={draftName} onChangeText={setDraftName} placeholder="e.g. Table 1" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText style={{ fontSize: 11, fontWeight: "600", color: mutedColor }}>
            SEATS
          </ThemedText>
          <Input
            value={draftSeats}
            onChangeText={setDraftSeats}
            placeholder="4"
            keyboardType="numeric"
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <Pressable style={styles.smallBtn} onPress={() => setEditing(false)}>
          <ThemedText style={{ color: mutedColor, fontSize: 13, fontWeight: "600" }}>
            Cancel
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: primaryColor, paddingHorizontal: 16 }]}
          disabled={saving}
          onPress={async () => {
            const seats = parseInt(draftSeats, 10);
            if (isNaN(seats) || seats < 1) return;
            setSaving(true);
            const result = await updateTable(restaurantId, sectionId, table.id, {
              name: draftName.trim() || undefined,
              seats,
            });
            setSaving(false);
            if (result) {
              onUpdated(result);
              setEditing(false);
            }
          }}
        >
          <ThemedText style={[styles.actionBtnText, { color: "#fff", fontWeight: "700" }]}>
            {saving ? "Saving…" : "Save"}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

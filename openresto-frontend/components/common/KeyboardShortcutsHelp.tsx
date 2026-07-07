import { Modal, Pressable, StyleSheet, View, TouchableWithoutFeedback } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "@/theme/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { SHORTCUTS_BY_SCOPE, ShortcutScope } from "@/constants/keyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  visible: boolean;
  scope: ShortcutScope;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({
  visible,
  scope,
  onClose,
}: KeyboardShortcutsHelpProps) {
  const { colors } = useAppTheme();
  const shortcuts = SHORTCUTS_BY_SCOPE[scope];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable testID="keyboard-shortcuts-backdrop" style={styles.backdrop} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText type="h3">Keyboard shortcuts</ThemedText>
            <View style={styles.list}>
              {shortcuts.map((s) => (
                <View key={s.keys} style={styles.row}>
                  <View
                    style={[
                      styles.keyBadge,
                      { borderColor: colors.border, backgroundColor: colors.input },
                    ]}
                  >
                    <ThemedText style={styles.keyText}>{s.keys}</ThemedText>
                  </View>
                  <ThemedText style={[styles.description, { color: colors.muted }]}>
                    {s.description}
                  </ThemedText>
                </View>
              ))}
            </View>
            <Pressable
              testID="keyboard-shortcuts-close"
              style={[styles.closeBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <ThemedText style={[styles.closeBtnText, { color: colors.muted }]}>Close</ThemedText>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xxl,
  },
  card: {
    borderRadius: BORDER_RADIUS.modal,
    borderWidth: 1,
    padding: SPACING.xxl,
    width: "100%",
    maxWidth: 420,
    gap: SPACING.md,
    ...SHADOWS.popup,
  },
  list: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  keyBadge: {
    minWidth: 56,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
  },
  keyText: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: "700",
  },
  description: {
    ...TYPOGRAPHY.caption,
    flex: 1,
  },
  closeBtn: {
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    marginTop: SPACING.sm,
    borderWidth: 1,
  },
  closeBtnText: {
    ...TYPOGRAPHY.bodyBold,
  },
});

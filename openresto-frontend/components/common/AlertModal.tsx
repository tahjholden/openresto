import { Modal, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from "@/theme/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

interface AlertModalProps {
  visible: boolean;
  title?: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}

export default function AlertModal({
  visible,
  title = "Notice",
  message,
  buttonLabel = "OK",
  onClose,
}: AlertModalProps) {
  const { colors, primaryColor } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ThemedText type="h3">{title}</ThemedText>
          <ThemedText style={[styles.message, { color: colors.muted }]}>{message}</ThemedText>
          <Pressable style={[styles.btn, { backgroundColor: primaryColor }]} onPress={onClose}>
            <ThemedText style={styles.btnText}>{buttonLabel}</ThemedText>
          </Pressable>
        </View>
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
    maxWidth: 400,
    gap: SPACING.md,
    ...SHADOWS.popup,
  },
  message: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    lineHeight: 20,
  },
  btn: {
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  btnText: {
    color: COLORS.white,
    ...TYPOGRAPHY.bodyBold,
    fontWeight: "700",
  },
});

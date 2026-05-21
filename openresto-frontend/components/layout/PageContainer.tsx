import { View, StyleSheet, type ViewProps, useWindowDimensions } from "react-native";
import { SPACING } from "@/theme/theme";

// Constrains content to a readable max-width and centres it on wide screens.
// Use on every full-page screen so content doesn't stretch across 1920px monitors.
export default function PageContainer({ children, style, ...props }: ViewProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.outer} {...props}>
      <View style={[styles.inner, isMobile && { paddingHorizontal: SPACING.lg }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 1200,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
  },
});

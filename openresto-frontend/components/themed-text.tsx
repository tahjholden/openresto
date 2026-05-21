import { StyleSheet, Text, type TextProps } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { TYPOGRAPHY } from "@/theme/theme";

export type ThemedTextType =
  // TYPOGRAPHY-aligned variants (prefer these)
  | "pageTitle"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodyBold"
  | "label"
  | "labelSmall"
  | "caption"
  | "captionSmall"
  // Legacy Expo template variants (kept for backwards compat)
  | "default"
  | "defaultSemiBold"
  | "title"
  | "subtitle"
  | "link";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemedTextType;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const { isDark, colors, primaryColor } = useAppTheme();

  let color = lightColor && !isDark ? lightColor : darkColor && isDark ? darkColor : colors.text;

  if (type === "link" && !lightColor && !darkColor) {
    color = primaryColor;
  }

  const flattenedStyle = StyleSheet.flatten([{ color }, styles[type], style]);

  return <Text style={flattenedStyle} {...rest} />;
}

const styles = StyleSheet.create({
  // TYPOGRAPHY scale variants
  pageTitle: TYPOGRAPHY.pageTitle,
  h1: TYPOGRAPHY.h1,
  h2: TYPOGRAPHY.h2,
  h3: TYPOGRAPHY.h3,
  body: TYPOGRAPHY.body,
  bodyBold: TYPOGRAPHY.bodyBold,
  label: TYPOGRAPHY.label,
  labelSmall: TYPOGRAPHY.labelSmall,
  caption: TYPOGRAPHY.caption,
  captionSmall: TYPOGRAPHY.captionSmall,

  // Legacy Expo template variants
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});

import { forwardRef } from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { FORM_SIZES, getThemeColors } from "@/theme/theme";

const Input = forwardRef<TextInput, TextInputProps>(function Input({ style, ...props }, ref) {
  const isDark = useColorScheme() === "dark";
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.container}>
      <TextInput
        ref={ref}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.input },
          style,
        ]}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  input: {
    height: FORM_SIZES.inputHeight,
    borderWidth: 1,
    borderRadius: FORM_SIZES.inputBorderRadius,
    paddingHorizontal: FORM_SIZES.inputPaddingH,
    fontSize: FORM_SIZES.inputFontSize,
  },
});

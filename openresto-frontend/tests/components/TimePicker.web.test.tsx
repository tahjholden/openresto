/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TimePickerWeb from "@/components/common/TimePicker.web";

jest.mock("@/context/BrandContext", () => ({
  useBrand: () => ({ appName: "Test App", primaryColor: "#000" }),
}));

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

describe("TimePicker Web", () => {
  const onSelect = jest.fn();

  it("renders and calls onSelect when value changes", () => {
    const { getByTestId } = render(<TimePickerWeb selectedTime="19:00" onSelect={onSelect} />);

    // Find the wrapper
    const wrapper = getByTestId("time-picker-web");
    expect(wrapper).toBeTruthy();

    // Find the input inside the wrapper's host element
    // This is a bit of a hack but should work in jsdom with RNTL
    const input = (wrapper as any).children[0];
    // fireEvent might work directly on it
    fireEvent(input, "change", { target: { value: "20:00" } });
    expect(onSelect).toHaveBeenCalledWith("20:00");
  });

  it("fires onFocus and onBlur on the time input", () => {
    const { getByTestId } = render(<TimePickerWeb selectedTime="19:00" onSelect={onSelect} />);
    const wrapper = getByTestId("time-picker-web");
    const input = (wrapper as any).children[0];
    fireEvent(input, "focus");
    fireEvent(input, "blur");
    expect(wrapper).toBeTruthy();
  });

  it("clamps value below minTime to minTime", () => {
    const localSelect = jest.fn();
    const { getByTestId } = render(
      <TimePickerWeb onSelect={localSelect} minTime="12:00" maxTime="22:00" />
    );
    const wrapper = getByTestId("time-picker-web");
    const input = (wrapper as any).children[0];
    // 08:00 is before minTime 12:00, so should be clamped to 12:00
    fireEvent(input, "change", { target: { value: "08:00" } });
    expect(localSelect).toHaveBeenCalledWith("12:00");
  });

  it("clamps value above maxTime to maxTime", () => {
    const localSelect = jest.fn();
    const { getByTestId } = render(
      <TimePickerWeb onSelect={localSelect} minTime="09:00" maxTime="18:00" />
    );
    const wrapper = getByTestId("time-picker-web");
    const input = (wrapper as any).children[0];
    // 22:00 is after maxTime 18:00, so should be clamped to 18:00
    fireEvent(input, "change", { target: { value: "22:00" } });
    expect(localSelect).toHaveBeenCalledWith("18:00");
  });

  it("does not call onSelect when value is empty (early return)", () => {
    const localSelect = jest.fn();
    const { getByTestId } = render(<TimePickerWeb onSelect={localSelect} />);
    const wrapper = getByTestId("time-picker-web");
    const input = (wrapper as any).children[0];
    fireEvent(input, "change", { target: { value: "" } });
    expect(localSelect).not.toHaveBeenCalled();
  });
});

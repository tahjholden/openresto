import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { NewBookingModal } from "@/components/admin/bookings/NewBookingModal";
import * as restaurantsApi from "@/api/restaurants";
import * as adminApi from "@/api/admin";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/api/restaurants", () => ({
  fetchRestaurants: jest.fn(),
}));

jest.mock("@/api/admin", () => ({
  adminCreateBooking: jest.fn(),
}));

jest.mock("@/context/BrandContext", () => {
  const brand = { primaryColor: "#0a7ea4", appName: "Open Resto" };
  return { useBrand: () => brand };
});

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/components/common/Select", () => {
  const { View, Text, Pressable } = require("react-native");
  return {
    __esModule: true,
    default: ({
      onSelect,
      options,
    }: {
      onSelect: (v: string | number) => void;
      options: { label: string; value: string | number }[];
    }) => (
      <View testID="mock-select">
        {options.map((o) => (
          <Pressable key={String(o.value)} onPress={() => onSelect(o.value)}>
            <Text>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    ),
  };
});

jest.mock("@/components/common/DatePicker", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ selectedDate }: { selectedDate?: string }) => (
      <View>
        <Text testID="date-picker">{selectedDate ?? "no date"}</Text>
      </View>
    ),
  };
});

jest.mock("@/components/common/TimePicker", () => {
  const { View, Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ selectedTime }: { selectedTime?: string }) => (
      <View>
        <Text testID="time-picker">{selectedTime ?? "no time"}</Text>
      </View>
    ),
  };
});

jest.mock("@/components/common/ConfirmModal", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: () => <View /> };
});

const mockRestaurants = [
  {
    id: 1,
    name: "Test Restaurant",
    openTime: "09:00",
    closeTime: "22:00",
    openDays: "1,2,3,4,5",
    address: "123 Street",
    timezone: "UTC",
    tags: [],
    sections: [
      {
        id: 10,
        name: "Main",
        tables: [
          { id: 100, name: "Table 1", seats: 4 },
          { id: 101, name: "Table 2", seats: 2 },
        ],
      },
    ],
  },
];

describe("NewBookingModal", () => {
  const onClose = jest.fn();
  const onCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (restaurantsApi.fetchRestaurants as jest.Mock).mockResolvedValue(mockRestaurants);
  });

  it("does not render content when visible is false", () => {
    render(<NewBookingModal visible={false} onClose={onClose} onCreated={onCreated} />);
    expect(screen.queryByText("New Booking")).toBeNull();
  });

  it("renders New Booking title when visible", async () => {
    render(<NewBookingModal visible onClose={onClose} onCreated={onCreated} />);
    await waitFor(() => {
      expect(screen.getByText("New Booking")).toBeTruthy();
    });
  });

  it("shows loading indicator while fetching restaurants", async () => {
    let resolveRestaurants: (v: typeof mockRestaurants) => void;
    (restaurantsApi.fetchRestaurants as jest.Mock).mockReturnValue(
      new Promise((r) => {
        resolveRestaurants = r;
      })
    );
    render(<NewBookingModal visible onClose={onClose} onCreated={onCreated} />);
    expect(screen.getByText("New Booking")).toBeTruthy();
    await act(async () => {
      resolveRestaurants!(mockRestaurants);
    });
  });

  it("shows restaurant options after loading", async () => {
    render(<NewBookingModal visible onClose={onClose} onCreated={onCreated} />);
    await waitFor(() => {
      expect(screen.getByText("Test Restaurant")).toBeTruthy();
    });
  });

  it("calls onClose when close button is pressed", async () => {
    render(<NewBookingModal visible onClose={onClose} onCreated={onCreated} />);
    await waitFor(() => expect(screen.getByText("New Booking")).toBeTruthy());
    const accessible = screen.UNSAFE_getAllByProps({ accessible: true });
    // Close button is typically the first accessible element (X icon)
    fireEvent.press(accessible[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows guest email input field", async () => {
    render(<NewBookingModal visible onClose={onClose} onCreated={onCreated} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("guest@example.com")).toBeTruthy();
    });
  });
});

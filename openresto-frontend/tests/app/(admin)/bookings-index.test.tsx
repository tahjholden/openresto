/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import AdminBookingsScreen from "@/app/(admin)/bookings/index";
import { getAdminBookings } from "@/api/admin";

jest.mock("@/api/admin", () => ({
  getAdminBookings: jest.fn(),
  adminGetTables: jest.fn().mockResolvedValue([]),
  adminDeleteBooking: jest.fn().mockResolvedValue(undefined),
  adminLookupBookings: jest.fn().mockResolvedValue([]),
  getAdminBooking: jest.fn().mockResolvedValue(null),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const Stack = {
    Screen: () => null,
  };
  return {
    Stack,
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock("@/context/BrandContext", () => ({
  useBrand: () => ({ appName: "Test App", primaryColor: "#000" }),
}));

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@/api/restaurants", () => ({
  fetchRestaurants: jest.fn().mockResolvedValue([{ id: 1, name: "Resto 1" }]),
}));

// Stub heavy sub-components that are not under test here
jest.mock("@/components/admin/bookings/AvailabilityGrid", () => ({
  AvailabilityGrid: () => null,
}));

jest.mock("@/components/admin/bookings/BookingDetailPopup", () => ({
  BookingDetailPopup: () => null,
}));

jest.mock("@/components/admin/bookings/NewBookingModal", () => ({
  NewBookingModal: () => null,
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: 1, name: "Resto 1" }]),
  })
) as jest.Mock;

describe("AdminBookingsScreen", () => {
  const mockBookings = [
    {
      id: 1,
      bookingRef: "REF1",
      customerEmail: "john@example.com",
      status: "active",
      date: new Date().toISOString(),
      seats: 2,
      restaurantId: 1,
      restaurantName: "Resto 1",
      sectionId: 1,
      sectionName: "Main",
      tableId: 1,
      tableName: "T1",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminBookings as jest.Mock).mockResolvedValue(mockBookings);
  });

  it("renders the bookings page", async () => {
    render(<AdminBookingsScreen />);
    await waitFor(() => {
      expect(screen.getByText("Bookings")).toBeTruthy();
    });
  });

  it("renders bookings in list view after switching modes", async () => {
    render(<AdminBookingsScreen />);

    // Switch to list mode
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    await waitFor(() => {
      expect(screen.getByText("john@example.com")).toBeTruthy();
    });
  });

  it("filters bookings by status in list view", async () => {
    render(<AdminBookingsScreen />);

    // Switch to list mode first
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    // Press active filter
    const activeFilter = await screen.findByText("Active");
    fireEvent.press(activeFilter);

    await waitFor(() => {
      expect(getAdminBookings).toHaveBeenCalledWith(1, undefined, "active");
    });
  });
});

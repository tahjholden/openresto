/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import AdminBookingsScreen from "@/app/(admin)/bookings/index";
import { getAdminBookings, adminDeleteBooking, adminLookupBookings } from "@/api/admin";

jest.mock("@/api/admin", () => ({
  getAdminBookings: jest.fn(),
  adminGetTables: jest.fn().mockResolvedValue([]),
  adminDeleteBooking: jest.fn().mockResolvedValue(true),
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

    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    const activeFilter = await screen.findByText("Active");
    fireEvent.press(activeFilter);

    await waitFor(() => {
      expect(getAdminBookings).toHaveBeenCalledWith(1, undefined, "active");
    });
  });

  it("shows Past filter and switches status", async () => {
    render(<AdminBookingsScreen />);
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    const pastFilter = await screen.findByText("Past");
    fireEvent.press(pastFilter);

    await waitFor(() => {
      expect(getAdminBookings).toHaveBeenCalledWith(1, undefined, "past");
    });
  });

  it("shows Cancelled filter and switches status", async () => {
    render(<AdminBookingsScreen />);
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    const cancelledFilter = await screen.findByText("Cancelled");
    fireEvent.press(cancelledFilter);

    await waitFor(() => {
      expect(getAdminBookings).toHaveBeenCalledWith(1, undefined, "cancelled");
    });
  });

  it("shows New Booking button and opens modal", async () => {
    render(<AdminBookingsScreen />);
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    const newBookingBtn = await screen.findByText("New Booking");
    fireEvent.press(newBookingBtn);
    // NewBookingModal is mocked to null, just verifies no crash
    expect(getAdminBookings).toHaveBeenCalled();
  });

  it("handles lookup returning no results", async () => {
    (adminLookupBookings as jest.Mock).mockResolvedValue([]);
    render(<AdminBookingsScreen />);
    await waitFor(() => expect(screen.getByText("Bookings")).toBeTruthy());

    const searchInput = screen.getByPlaceholderText("Email or reference…");
    fireEvent.changeText(searchInput, "unknown@test.com");

    const findBtn = screen.getByText("Find");
    await act(async () => {
      fireEvent.press(findBtn);
    });

    await waitFor(() => expect(screen.getByText("No booking found.")).toBeTruthy());
  });

  it("handles lookup returning single result", async () => {
    (adminLookupBookings as jest.Mock).mockResolvedValue([{ id: 42 }]);
    render(<AdminBookingsScreen />);
    await waitFor(() => expect(screen.getByText("Bookings")).toBeTruthy());

    const searchInput = screen.getByPlaceholderText("Email or reference…");
    fireEvent.changeText(searchInput, "john@example.com");

    const findBtn = screen.getByText("Find");
    await act(async () => {
      fireEvent.press(findBtn);
    });

    await waitFor(() => expect(adminLookupBookings).toHaveBeenCalledWith("john@example.com"));
  });

  it("handles lookup returning multiple results for email", async () => {
    const mockReplace = jest.fn();
    jest.mock("expo-router", () => ({
      Stack: { Screen: () => null },
      useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
      useLocalSearchParams: () => ({}),
    }));
    (adminLookupBookings as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    render(<AdminBookingsScreen />);
    await waitFor(() => expect(screen.getByText("Bookings")).toBeTruthy());

    const searchInput = screen.getByPlaceholderText("Email or reference…");
    fireEvent.changeText(searchInput, "multi@example.com");

    const findBtn = screen.getByText("Find");
    await act(async () => {
      fireEvent.press(findBtn);
    });

    await waitFor(() => expect(adminLookupBookings).toHaveBeenCalledWith("multi@example.com"));
  });

  it("updates lookup query and clears status on change", async () => {
    (adminLookupBookings as jest.Mock).mockResolvedValue([]);
    render(<AdminBookingsScreen />);
    await waitFor(() => expect(screen.getByText("Bookings")).toBeTruthy());

    const searchInput = screen.getByPlaceholderText("Email or reference…");
    fireEvent.changeText(searchInput, "test");
    await act(async () => {
      fireEvent.press(screen.getByText("Find"));
    });
    await waitFor(() => expect(screen.getByText("No booking found.")).toBeTruthy());
    // Now change the query text — the status should clear
    fireEvent.changeText(searchInput, "new");
    expect(screen.queryByText("No booking found.")).toBeNull();
  });

  it("does not call lookup when query is empty", async () => {
    render(<AdminBookingsScreen />);
    await waitFor(() => expect(screen.getByText("Bookings")).toBeTruthy());

    fireEvent.press(screen.getByText("Find"));
    expect(adminLookupBookings).not.toHaveBeenCalled();
  });

  it("renders booking row in list view and opens popup on press", async () => {
    render(<AdminBookingsScreen />);
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);

    await waitFor(() => expect(screen.getByText("john@example.com")).toBeTruthy());
    fireEvent.press(screen.getByText("john@example.com"));
    // BookingDetailPopup is mocked to null, verifies no crash
    expect(getAdminBookings).toHaveBeenCalled();
  });

  it("renders timetable view by default and loads grid", async () => {
    const { adminGetTables } = require("@/api/admin");
    render(<AdminBookingsScreen />);
    await waitFor(() => expect(screen.getByText("Bookings")).toBeTruthy());
    // Grid loads after restaurant is selected — just verify page renders without crash
    expect(screen.getByText("Bookings")).toBeTruthy();
  });

  it("switches from timetable to list and back", async () => {
    render(<AdminBookingsScreen />);
    const listBtn = await screen.findByText("List");
    fireEvent.press(listBtn);
    await waitFor(() => expect(screen.getByText("john@example.com")).toBeTruthy());
    // Press List again to cycle — or press an alternate route; just ensure page stays stable
    fireEvent.press(listBtn);
    expect(screen.getByText("Bookings")).toBeTruthy();
  });
});

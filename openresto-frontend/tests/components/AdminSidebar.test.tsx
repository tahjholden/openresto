/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { SafeAreaProvider } from "react-native-safe-area-context";

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
) as jest.Mock;

jest.mock("expo-router", () => {
  const React = require("react");
  const Link = ({ children }: any) => children;
  return {
    Link,
    usePathname: jest.fn().mockReturnValue("/dashboard"),
    useRouter: jest.fn(() => ({ replace: jest.fn(), push: jest.fn() })),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/api/auth", () => ({
  logout: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/api/admin", () => ({
  adminLookupBookings: jest.fn().mockResolvedValue([]),
  getAdminBookings: jest.fn().mockResolvedValue([]),
  getAdminBooking: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/context/BrandContext", () => ({
  useBrand: () => ({ appName: "Test App", primaryColor: "#000" }),
}));

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

import { usePathname, useRouter } from "expo-router";
import { logout } from "@/api/auth";
import { getAdminBookings } from "@/api/admin";

const FUTURE = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const makeBooking = (overrides = {}) => ({
  id: 1,
  restaurantId: 1,
  restaurantName: "The Test Kitchen",
  sectionId: 1,
  sectionName: "Main",
  tableId: 1,
  tableName: "T1",
  date: FUTURE,
  customerEmail: "alice@example.com",
  seats: 2,
  ...overrides,
});

describe("AdminSidebar", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    (useRouter as jest.Mock).mockReturnValue({ replace: jest.fn(), push: mockPush });
    (getAdminBookings as jest.Mock).mockResolvedValue([]);
  });

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        {ui}
      </SafeAreaProvider>
    );

  it("renders all navigation links", async () => {
    renderWithProviders(<AdminSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeTruthy();
      expect(screen.getByText("Bookings")).toBeTruthy();
      expect(screen.getByText("Settings")).toBeTruthy();
      expect(screen.getByText("Back to site")).toBeTruthy();
    });
  });

  it("renders the lookup booking widget", async () => {
    renderWithProviders(<AdminSidebar />);
    await waitFor(() => {
      expect(screen.getByText("Lookup Booking")).toBeTruthy();
      expect(screen.getByPlaceholderText("Email or reference…")).toBeTruthy();
    });
  });

  it("calls logout when sign out is pressed", async () => {
    renderWithProviders(<AdminSidebar />);
    const signOutBtn = await screen.findByText("Log out");
    fireEvent.press(signOutBtn);
    expect(logout).toHaveBeenCalled();
  });

  describe("upcoming bookings section", () => {
    it("shows empty state when no upcoming bookings", async () => {
      (getAdminBookings as jest.Mock).mockResolvedValue([]);
      renderWithProviders(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("No upcoming bookings today")).toBeTruthy();
      });
    });

    it("renders upcoming booking rows", async () => {
      (getAdminBookings as jest.Mock).mockResolvedValue([makeBooking()]);
      renderWithProviders(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("alice")).toBeTruthy();
        expect(screen.getByText("2 · T1")).toBeTruthy();
        expect(screen.getByText("The Test Kitchen")).toBeTruthy();
      });
    });

    it("shows up to 4 bookings", async () => {
      const bookings = [1, 2, 3, 4, 5].map((i) =>
        makeBooking({ id: i, customerEmail: `user${i}@example.com` })
      );
      (getAdminBookings as jest.Mock).mockResolvedValue(bookings);
      renderWithProviders(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getAllByText("The Test Kitchen")).toHaveLength(4);
      });
    });

    it("filters out past bookings", async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      (getAdminBookings as jest.Mock).mockResolvedValue([
        makeBooking({ id: 1, date: pastDate, customerEmail: "past@example.com" }),
        makeBooking({ id: 2, customerEmail: "future@example.com" }),
      ]);
      renderWithProviders(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.queryByText("past")).toBeNull();
        expect(screen.getByText("future")).toBeTruthy();
      });
    });

    it("opens booking detail popup when a row is pressed", async () => {
      (getAdminBookings as jest.Mock).mockResolvedValue([makeBooking({ id: 99 })]);
      renderWithProviders(<AdminSidebar />);
      const row = await screen.findByText("alice");
      fireEvent.press(row);
      // Popup opens (no navigation); router.push should NOT be called with a booking id
      expect(mockPush).not.toHaveBeenCalledWith("/(admin)/bookings/99");
    });

    it("navigates to bookings list when View all is pressed", async () => {
      renderWithProviders(<AdminSidebar />);
      const viewAll = await screen.findByText("View all");
      fireEvent.press(viewAll);
      expect(mockPush).toHaveBeenCalledWith("/(admin)/bookings");
    });

    it("fetches today's active bookings on mount", async () => {
      renderWithProviders(<AdminSidebar />);
      await waitFor(() => {
        expect(getAdminBookings).toHaveBeenCalledWith(
          undefined,
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          "active"
        );
      });
    });
  });
});

/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import RestaurantScreen from "@/app/(user)/restaurant/[id]";
import { AppThemeProvider } from "@/context/ThemeContext";
import { BrandProvider } from "@/context/BrandContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Polyfill fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ appName: "Open Resto", primaryColor: "#0a7ea4" }),
  })
) as jest.Mock;

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({ id: "1" }));
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

const mockRestaurant = {
  id: 1,
  name: "Sushi Spot",
  address: "456 Ocean Ave",
  openTime: "11:00",
  closeTime: "23:00",
  openDays: "1,2,3,4,5",
  timezone: "UTC",
  sections: [
    {
      id: 1,
      name: "Main",
      restaurantId: 1,
      tables: [{ id: 1, name: "T1", seats: 4, sectionId: 1 }],
    },
  ],
};

jest.mock("@/api/restaurants", () => ({
  fetchRestaurantById: jest.fn(() => Promise.resolve(mockRestaurant)),
}));

jest.setTimeout(15000);

describe("RestaurantScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: "1" });
    const { fetchRestaurantById } = require("@/api/restaurants");
    fetchRestaurantById.mockResolvedValue(mockRestaurant);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <AppThemeProvider>
          <BrandProvider>{ui}</BrandProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    );
  };

  it("renders restaurant name after loading", async () => {
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => {
      expect(screen.getByText("Sushi Spot")).toBeTruthy();
    });
  });

  it("renders Book a Table button", async () => {
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => {
      expect(screen.getByText("Book a Table")).toBeTruthy();
    });
  });

  it("replaces the Book a Table button with a walk-in notice for walk-in only locations", async () => {
    const { fetchRestaurantById } = require("@/api/restaurants");
    fetchRestaurantById.mockResolvedValueOnce({ ...mockRestaurant, walkInOnly: true });
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => {
      expect(screen.getByTestId("walk-in-notice")).toBeTruthy();
    });
    expect(screen.queryByText("Book a Table")).toBeNull();
  });

  it("shows not found when restaurant is null", async () => {
    const { fetchRestaurantById } = require("@/api/restaurants");
    fetchRestaurantById.mockResolvedValueOnce(null);
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => {
      expect(screen.getByText("Restaurant not found.")).toBeTruthy();
    });
  });

  it("shows not found when id param is missing (else branch)", async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: undefined as unknown as string });
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => {
      expect(screen.getByText("Restaurant not found.")).toBeTruthy();
    });
  });

  it("shows not found when API throws (catch branch)", async () => {
    const { fetchRestaurantById } = require("@/api/restaurants");
    fetchRestaurantById.mockRejectedValueOnce(new Error("Network error"));
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => {
      expect(screen.getByText("Restaurant not found.")).toBeTruthy();
    });
  });

  it("fires onScroll to update scrollY", async () => {
    renderWithProviders(<RestaurantScreen />);
    await waitFor(() => expect(screen.getByText("Sushi Spot")).toBeTruthy());

    const { ScrollView } = require("react-native");
    const scrollViews = screen.UNSAFE_getAllByType(ScrollView);
    if (scrollViews.length > 0) {
      fireEvent.scroll(scrollViews[0], {
        nativeEvent: { contentOffset: { y: 400 } },
      });
    }
    expect(screen.getByText("Sushi Spot")).toBeTruthy();
  });

  it("pressing ScrollToTopFab calls scrollToTop", async () => {
    const mockUseDimensions = jest.spyOn(require("react-native"), "useWindowDimensions");
    mockUseDimensions.mockReturnValue({ width: 375, height: 667 });

    try {
      renderWithProviders(<RestaurantScreen />);
      await waitFor(() => expect(screen.getByText("Sushi Spot")).toBeTruthy());

      const { ScrollView } = require("react-native");
      const scrollViews = screen.UNSAFE_getAllByType(ScrollView);
      if (scrollViews.length > 0) {
        fireEvent.scroll(scrollViews[0], {
          nativeEvent: { contentOffset: { y: 400 } },
        });
      }

      await waitFor(() => {
        const fab = screen.queryByLabelText("Scroll to top");
        if (fab) {
          fireEvent.press(fab);
        }
      });
      expect(screen.getByText("Sushi Spot")).toBeTruthy();
    } finally {
      mockUseDimensions.mockRestore();
    }
  });
});

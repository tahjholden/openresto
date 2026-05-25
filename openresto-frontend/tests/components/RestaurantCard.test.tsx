import React from "react";
import { render, screen } from "@testing-library/react-native";
import RestaurantCard from "@/components/restaurant/RestaurantCard";

// Mock dependencies
jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: () => "light",
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/context/BrandContext", () => ({
  useBrand: () => ({ primaryColor: "#0a7ea4", appName: "Open Resto" }),
}));

jest.mock("@/api/availability", () => ({
  fetchAvailability: jest.fn().mockResolvedValue({
    restaurantId: 1,
    date: "2026-05-25",
    slots: [{ time: "19:00", isAvailable: true, availableTableIds: [1], category: "Dinner" }],
  }),
}));

describe("RestaurantCard", () => {
  const restaurant = {
    id: 1,
    name: "Pasta Place",
    address: "123 Main St",
    openTime: "09:00",
    closeTime: "22:00",
    openDays: "1,2,3,4,5,6,7",
    timezone: "UTC",
    sections: [
      {
        id: 1,
        name: "Main",
        restaurantId: 1,
        tables: [
          { id: 1, name: "T1", seats: 2, sectionId: 1 },
          { id: 2, name: "T2", seats: 4, sectionId: 1 },
        ],
      },
      {
        id: 2,
        name: "Patio",
        restaurantId: 1,
        tables: [{ id: 3, name: "P1", seats: 6, sectionId: 2 }],
      },
    ],
  };

  it("renders the restaurant name", () => {
    render(<RestaurantCard restaurant={restaurant} />);
    expect(screen.getByText("Pasta Place")).toBeTruthy();
  });

  it("renders the address", () => {
    render(<RestaurantCard restaurant={restaurant} />);
    expect(screen.getByText("123 Main St")).toBeTruthy();
  });

  it("renders map links for the address", () => {
    render(<RestaurantCard restaurant={restaurant} />);
    expect(screen.getByText("Google")).toBeTruthy();
    expect(screen.getByText("Apple")).toBeTruthy();
  });

  it("renders tags when present", () => {
    render(<RestaurantCard restaurant={{ ...restaurant, tags: ["Dog friendly", "Terrace"] }} />);
    expect(screen.getByText("Dog friendly")).toBeTruthy();
    expect(screen.getByText("Terrace")).toBeTruthy();
  });

  it("renders no tags when tags is empty", () => {
    render(<RestaurantCard restaurant={{ ...restaurant, tags: [] }} />);
    expect(screen.queryByText("Dog friendly")).toBeNull();
  });
});

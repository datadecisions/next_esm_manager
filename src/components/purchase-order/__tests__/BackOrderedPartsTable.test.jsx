import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackOrderedPartsTable } from "../BackOrderedPartsTable";

vi.mock("@/lib/api/purchase-order", () => ({
  getBackOrderedParts: vi.fn(),
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { getBackOrderedParts } from "@/lib/api/purchase-order";

describe("BackOrderedPartsTable", () => {
  const mockParts = [
    {
      PartNo: "P001",
      Warehouse: "Main",
      Description: "Test Part",
      EntryDate: "2025-03-01",
      Qty: 5,
      WOs: [{ WONo: "1001" }],
      BackorderCost: 10.5,
    },
    {
      PartNo: "P002",
      Warehouse: "Branch1",
      Description: "Another Part",
      EntryDate: "2025-03-02",
      Qty: 2,
      WOs: [],
      Cost: 25,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    getBackOrderedParts.mockResolvedValue(mockParts);
  });

  it("renders loading state initially", () => {
    render(<BackOrderedPartsTable token="test-token" />);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders parts after load", async () => {
    render(<BackOrderedPartsTable token="test-token" />);
    await waitFor(() => {
      expect(getBackOrderedParts).toHaveBeenCalledWith("test-token");
    });
    expect(screen.getByText("P001")).toBeInTheDocument();
    expect(screen.getByText("P002")).toBeInTheDocument();
    expect(screen.getByText("Test Part")).toBeInTheDocument();
  });

  it("disables Create button when no parts selected", async () => {
    render(<BackOrderedPartsTable token="test-token" />);
    await waitFor(() => {
      expect(getBackOrderedParts).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: /Create Parts Order/ })).toBeDisabled();
  });

  it("enables Create button and navigates when parts selected", async () => {
    const user = userEvent.setup();
    render(<BackOrderedPartsTable token="test-token" />);
    await waitFor(() => {
      expect(getBackOrderedParts).toHaveBeenCalled();
    });

    const firstRow = screen.getByText("P001").closest("tr");
    await user.click(firstRow);

    const createBtn = screen.getByRole("button", { name: /Create Parts Order/ });
    expect(createBtn).not.toBeDisabled();
    await user.click(createBtn);

    expect(mockPush).toHaveBeenCalledWith("/purchase-orders/new");
  });

  it("filters parts by search", async () => {
    const user = userEvent.setup();
    render(<BackOrderedPartsTable token="test-token" />);
    await waitFor(() => {
      expect(getBackOrderedParts).toHaveBeenCalled();
    });

    await user.type(screen.getByPlaceholderText(/Search parts/), "P001");
    expect(screen.getByText("P001")).toBeInTheDocument();
    expect(screen.queryByText("P002")).not.toBeInTheDocument();
  });
});

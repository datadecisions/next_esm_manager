import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PurchaseOrderSearchCombobox } from "../PurchaseOrderSearchCombobox";

vi.mock("@/lib/api/purchase-order", () => ({
  searchPurchaseOrders: vi.fn(),
}));

import { searchPurchaseOrders } from "@/lib/api/purchase-order";

describe("PurchaseOrderSearchCombobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with placeholder", () => {
    render(<PurchaseOrderSearchCombobox token="test-token" />);
    expect(screen.getByPlaceholderText(/Search by PO #/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go/ })).toBeInTheDocument();
  });

  it("disables Go button when input is empty", () => {
    render(<PurchaseOrderSearchCombobox token="test-token" />);
    expect(screen.getByRole("button", { name: /Go/ })).toBeDisabled();
  });

  it("searches when minChars reached", async () => {
    const user = userEvent.setup();
    searchPurchaseOrders.mockResolvedValue([
      { PONo: "123", VendorName: "Acme", amount: 100 },
    ]);
    render(<PurchaseOrderSearchCombobox token="test-token" minChars={3} />);

    await user.type(screen.getByPlaceholderText(/Search by PO #/), "123");

    await waitFor(() => {
      expect(searchPurchaseOrders).toHaveBeenCalledWith("123", false, "test-token");
    });
  });

  it("calls onSelect when PO is selected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    searchPurchaseOrders.mockResolvedValue([
      { PONo: "123", VendorName: "Acme" },
    ]);
    render(
      <PurchaseOrderSearchCombobox
        token="test-token"
        minChars={1}
        onSelect={onSelect}
      />
    );

    await user.type(screen.getByPlaceholderText(/Search by PO #/), "1");
    await waitFor(() => {
      expect(searchPurchaseOrders).toHaveBeenCalled();
    });

    const option = await screen.findByRole("button", { name: /#123/ });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith({ PONo: "123", VendorName: "Acme" });
  });

  it("calls onSelect with PONo when Go clicked with input", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PurchaseOrderSearchCombobox token="test-token" onSelect={onSelect} />
    );

    await user.type(screen.getByPlaceholderText(/Search by PO #/), "456");
    await user.click(screen.getByRole("button", { name: /Go/ }));

    expect(onSelect).toHaveBeenCalledWith({ PONo: "456" });
  });
});

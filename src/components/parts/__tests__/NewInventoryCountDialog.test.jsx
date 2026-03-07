import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewInventoryCountDialog } from "../NewInventoryCountDialog";

vi.mock("@/lib/api/parts", () => ({
  getActiveCounts: vi.fn(),
  createInventoryCount: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { getActiveCounts, createInventoryCount } from "@/lib/api/parts";
import { toast } from "sonner";

describe("NewInventoryCountDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    warehouses: [{ WebWarehouse: "Main" }, { WebWarehouse: "Branch1" }],
    token: "test-token",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open and shows warehouse options", () => {
    render(<NewInventoryCountDialog {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /New Inventory Count/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create/ })).toBeInTheDocument();
  });

  it("displays inventory ID pattern when warehouse is selected", async () => {
    const user = userEvent.setup();
    render(<NewInventoryCountDialog {...defaultProps} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Main" }));

    // ID format: warehouse + month + year (e.g. Main32025)
    expect(screen.getByText(/Main\d{1,2}\d{4}/)).toBeInTheDocument();
  });

  it("shows toast when count already exists", async () => {
    const user = userEvent.setup();
    const { buildInventoryId } = await import("@/lib/format");
    const existingId = buildInventoryId("Main");
    getActiveCounts.mockResolvedValue([{ InventoryID: existingId }]);
    render(<NewInventoryCountDialog {...defaultProps} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Main" }));
    await user.click(screen.getByRole("button", { name: /Create/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("already exists")
      );
      expect(createInventoryCount).not.toHaveBeenCalled();
    });
  });

  it("calls createInventoryCount when count does not exist", async () => {
    const user = userEvent.setup();
    getActiveCounts.mockResolvedValue([]);
    createInventoryCount.mockResolvedValue(undefined);
    render(<NewInventoryCountDialog {...defaultProps} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Main" }));
    await user.click(screen.getByRole("button", { name: /Create/ }));

    await waitFor(() => {
      expect(createInventoryCount).toHaveBeenCalledWith(
        expect.objectContaining({
          Warehouse1: "Main",
          ExcludeNew: 0,
          ExcludeDelete: 0,
        }),
        "test-token"
      );
      expect(toast.success).toHaveBeenCalledWith("New inventory count created.");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddAssemblyPartDialog } from "../AddAssemblyPartDialog";

vi.mock("@/lib/api/parts", () => ({
  addAssemblyPart: vi.fn(),
  getWarehouses: vi.fn(),
}));

vi.mock("@/components/PartsSearchCombobox", () => ({
  PartsSearchCombobox: ({ onValueChange, value }) => (
    <div data-testid="parts-search">
      <input
        data-testid="parts-search-input"
        placeholder="Search for parts..."
        value={value ? `${value.PartNo}: ${value.Description}` : ""}
        onChange={(e) => {
          if (e.target.value.includes(":")) {
            const [PartNo, Description] = e.target.value.split(": ");
            onValueChange({ PartNo, Description, Warehouse: "Main", Qty: 10 });
          } else {
            onValueChange(null);
          }
        }}
      />
      <button
        type="button"
        data-testid="select-part"
        onClick={() =>
          onValueChange({
            PartNo: "P001",
            Description: "Test Part",
            Warehouse: "Main",
            Qty: 10,
            Cost: 5,
          })
        }
      >
        Select Part
      </button>
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { addAssemblyPart, getWarehouses } from "@/lib/api/parts";
import { toast } from "sonner";

describe("AddAssemblyPartDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    assemblyId: "asm-123",
    token: "test-token",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getWarehouses.mockResolvedValue([
      { WebWarehouse: "Main" },
      { WebWarehouse: "Branch1" },
    ]);
  });

  it("renders when open", async () => {
    render(<AddAssemblyPartDialog {...defaultProps} />);
    await waitFor(() => {
      expect(getWarehouses).toHaveBeenCalledWith("test-token");
    });
    expect(screen.getByRole("heading", { name: /Add Part to Assembly/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Part/ })).toBeInTheDocument();
  });

  it("disables Add button when no part selected", async () => {
    render(<AddAssemblyPartDialog {...defaultProps} />);
    await waitFor(() => {
      expect(getWarehouses).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: /Add Part/ })).toBeDisabled();
  });

  it("shows toast when quantity is invalid", async () => {
    const user = userEvent.setup();
    render(<AddAssemblyPartDialog {...defaultProps} />);
    await waitFor(() => {
      expect(getWarehouses).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId("select-part"));
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "0");
    await user.click(screen.getByRole("button", { name: /Add Part/ }));

    expect(toast.error).toHaveBeenCalledWith("Enter a valid quantity (min 1).");
    expect(addAssemblyPart).not.toHaveBeenCalled();
  });

  it("calls addAssemblyPart when form is valid", async () => {
    const user = userEvent.setup();
    addAssemblyPart.mockResolvedValue(undefined);
    render(<AddAssemblyPartDialog {...defaultProps} />);
    await waitFor(() => {
      expect(getWarehouses).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId("select-part"));
    await user.click(screen.getByRole("button", { name: /Add Part/ }));

    await waitFor(() => {
      expect(addAssemblyPart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "asm-123",
          partNo: "P001",
          qty: 1,
          description: "Test Part",
        }),
        "test-token"
      );
      expect(toast.success).toHaveBeenCalledWith("Part added to assembly.");
    });
  });
});

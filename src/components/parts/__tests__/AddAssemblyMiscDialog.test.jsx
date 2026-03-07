import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddAssemblyMiscDialog } from "../AddAssemblyMiscDialog";

vi.mock("@/lib/api/parts", () => ({
  addAssemblyMisc: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { addAssemblyMisc } from "@/lib/api/parts";
import { toast } from "sonner";

describe("AddAssemblyMiscDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    assemblyId: "asm-123",
    token: "test-token",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<AddAssemblyMiscDialog {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Add Misc to Assembly/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Misc item description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Misc/ })).toBeInTheDocument();
  });

  it("disables Add button when description is empty", () => {
    render(<AddAssemblyMiscDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Add Misc/ })).toBeDisabled();
  });

  it("shows toast when quantity is invalid", async () => {
    const user = userEvent.setup();
    render(<AddAssemblyMiscDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/Misc item description/i), "Labor");
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "0");
    await user.click(screen.getByRole("button", { name: /Add Misc/ }));

    expect(toast.error).toHaveBeenCalledWith("Enter a valid quantity (min 1).");
    expect(addAssemblyMisc).not.toHaveBeenCalled();
  });

  it("calls addAssemblyMisc and shows success when form is valid", async () => {
    const user = userEvent.setup();
    addAssemblyMisc.mockResolvedValue(undefined);
    render(<AddAssemblyMiscDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/Misc item description/i), "Labor");
    await user.click(screen.getByRole("button", { name: /Add Misc/ }));

    await waitFor(() => {
      expect(addAssemblyMisc).toHaveBeenCalledWith(
        { id: "asm-123", misc: "Labor", qty: 1 },
        "test-token"
      );
      expect(toast.success).toHaveBeenCalledWith("Misc item added to assembly.");
    });
  });

  it("shows toast on API error", async () => {
    const user = userEvent.setup();
    addAssemblyMisc.mockRejectedValue(new Error("Network failed"));
    render(<AddAssemblyMiscDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/Misc item description/i), "Labor");
    await user.click(screen.getByRole("button", { name: /Add Misc/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network failed");
    });
  });
});

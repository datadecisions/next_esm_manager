import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateAssemblyDialog } from "../CreateAssemblyDialog";

vi.mock("@/lib/api/parts", () => ({
  createAssembly: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { createAssembly } from "@/lib/api/parts";
import { toast } from "sonner";

describe("CreateAssemblyDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    token: "test-token",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<CreateAssemblyDialog {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Create Assembly/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Model/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Assembly Name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Assembly/ })).toBeInTheDocument();
  });

  it("does not call createAssembly when name is empty", async () => {
    const user = userEvent.setup();
    render(<CreateAssemblyDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Add Assembly/ }));

    expect(createAssembly).not.toHaveBeenCalled();
  });

  it("calls createAssembly with trimmed values on success", async () => {
    const user = userEvent.setup();
    createAssembly.mockResolvedValue(undefined);
    render(<CreateAssemblyDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/Model/i), "  M1 ");
    await user.type(screen.getByPlaceholderText(/Assembly Name/i), "  Pump Assembly ");
    await user.click(screen.getByRole("button", { name: /Add Assembly/ }));

    await waitFor(() => {
      expect(createAssembly).toHaveBeenCalledWith(
        {
          model: "M1",
          name: "Pump Assembly",
          estimated_completion_time: "0",
        },
        "test-token"
      );
      expect(toast.success).toHaveBeenCalledWith("Assembly has been added.");
    });
  });

  it("shows toast on API error", async () => {
    const user = userEvent.setup();
    createAssembly.mockRejectedValue(new Error("Server error"));
    render(<CreateAssemblyDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/Assembly Name/i), "Pump");
    await user.click(screen.getByRole("button", { name: /Add Assembly/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server error");
    });
  });
});

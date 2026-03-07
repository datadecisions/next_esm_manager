import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostAssemblyToOrderDialog } from "../PostAssemblyToOrderDialog";

vi.mock("@/lib/api/work-order", () => ({
  postAssemblyToWorkOrder: vi.fn(),
}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { postAssemblyToWorkOrder } from "@/lib/api/work-order";
import { toast } from "sonner";

describe("PostAssemblyToOrderDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    assemblyId: "asm-123",
    token: "test-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<PostAssemblyToOrderDialog {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Post Assembly to Order/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. 12345/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to Work Order/ })).toBeInTheDocument();
  });

  it("disables Add button when work order number is empty", () => {
    render(<PostAssemblyToOrderDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Add to Work Order/ })).toBeDisabled();
  });

  it("calls postAssemblyToWorkOrder and navigates on success", async () => {
    const user = userEvent.setup();
    postAssemblyToWorkOrder.mockResolvedValue(undefined);
    render(<PostAssemblyToOrderDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/e.g. 12345/), "12345");
    await user.click(screen.getByRole("button", { name: /Add to Work Order/ }));

    await waitFor(() => {
      expect(postAssemblyToWorkOrder).toHaveBeenCalledWith(
        { woNo: "12345", assemblyId: "asm-123" },
        "test-token"
      );
      expect(toast.success).toHaveBeenCalledWith("Assembly added to work order #12345.");
      expect(mockPush).toHaveBeenCalledWith("/work-orders/12345");
    });
  });

  it("shows toast on API error", async () => {
    const user = userEvent.setup();
    postAssemblyToWorkOrder.mockRejectedValue(new Error("Work order not found"));
    render(<PostAssemblyToOrderDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/e.g. 12345/), "99999");
    await user.click(screen.getByRole("button", { name: /Add to Work Order/ }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Work order not found");
    });
  });
});

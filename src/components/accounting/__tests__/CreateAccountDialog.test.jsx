import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateAccountDialog } from "../CreateAccountDialog";

vi.mock("@/lib/api/accounting", () => ({
  createAccount: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { createAccount } from "@/lib/api/accounting";
import { toast } from "sonner";

describe("CreateAccountDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    token: "test-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    render(<CreateAccountDialog {...defaultProps} />);
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 1100001")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Account description")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: /Create Account/ });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("does not call createAccount when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<CreateAccountDialog {...defaultProps} />);

    const submitBtn = screen.getByRole("button", { name: /Create Account/ });
    await user.click(submitBtn);

    expect(createAccount).not.toHaveBeenCalled();
  });

  async function fillRequiredFieldsAndSubmit(user) {
    await user.type(screen.getByPlaceholderText("e.g. 1100001"), "1100001");
    await user.type(screen.getByPlaceholderText("Account description"), "Cash");
    await user.type(screen.getByPlaceholderText("Section"), "Assets");

    const reportTrigger = screen.getByRole("combobox");
    await user.click(reportTrigger);
    const option = await screen.findByRole("option", { name: /Balance Sheet/i });
    await user.click(option);

    const submitBtn = screen.getByRole("button", { name: /Create Account/ });
    await user.click(submitBtn);
  }

  it("calls createAccount with trimmed values when form is valid", async () => {
    const user = userEvent.setup();
    createAccount.mockResolvedValue(undefined);
    render(<CreateAccountDialog {...defaultProps} />);

    await user.type(screen.getByPlaceholderText("e.g. 1100001"), " 1100001 ");
    await user.type(screen.getByPlaceholderText("Account description"), " Cash Account ");
    await user.type(screen.getByPlaceholderText("Section"), "Assets");

    const reportTrigger = screen.getByRole("combobox");
    await user.click(reportTrigger);
    const option = await screen.findByRole("option", { name: /Balance Sheet/i });
    await user.click(option);

    await user.click(screen.getByRole("button", { name: /Create Account/ }));

    expect(createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        AccountNo: "1100001",
        Description: "Cash Account",
        ReportType: "Balance Sheet",
        Section: "Assets",
      }),
      "test-token"
    );
  });

  it("toggles checkbox values (0 to -1)", async () => {
    const user = userEvent.setup();
    render(<CreateAccountDialog {...defaultProps} />);

    const controlledCheckbox = screen.getByRole("checkbox", { name: /Controlled/i });
    expect(controlledCheckbox).not.toBeChecked();

    await user.click(controlledCheckbox);
    expect(controlledCheckbox).toBeChecked();

    await user.click(controlledCheckbox);
    expect(controlledCheckbox).not.toBeChecked();
  });

  it("calls onOpenChange when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CreateAccountDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows toast on success", async () => {
    const user = userEvent.setup();
    createAccount.mockResolvedValue(undefined);
    render(<CreateAccountDialog {...defaultProps} />);

    await fillRequiredFieldsAndSubmit(user);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Account created successfully");
    });
  });

  it("shows toast on API error", async () => {
    const user = userEvent.setup();
    createAccount.mockRejectedValue(new Error("Network error"));
    render(<CreateAccountDialog {...defaultProps} />);

    await fillRequiredFieldsAndSubmit(user);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });
  });
});

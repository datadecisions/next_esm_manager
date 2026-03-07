import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountCombobox } from "../AccountCombobox";

vi.mock("@/lib/api/accounting", () => ({
  getAccounts: vi.fn(),
}));

import { getAccounts } from "@/lib/api/accounting";

describe("AccountCombobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays value when provided", () => {
    render(
      <AccountCombobox
        value={{ AccountNo: "1100001", Description: "Cash" }}
        token="test-token"
      />
    );
    expect(screen.getByDisplayValue("1100001: Cash")).toBeInTheDocument();
  });

  it("shows placeholder when value is empty", () => {
    render(<AccountCombobox value={null} token="test-token" />);
    expect(screen.getByPlaceholderText(/Search accounts/i)).toBeInTheDocument();
  });

  it("calls onValueChange with null when input changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AccountCombobox
        value={{ AccountNo: "1100001", Description: "Cash" }}
        onValueChange={onValueChange}
        token="test-token"
      />
    );

    await user.clear(screen.getByDisplayValue("1100001: Cash"));
    await user.type(screen.getByPlaceholderText(/Search accounts/i), "x");

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("searches when minChars reached", async () => {
    const user = userEvent.setup();
    getAccounts.mockResolvedValue([
      { AccountNo: "1100001", Description: "Cash" },
    ]);
    render(
      <AccountCombobox
        value={null}
        token="test-token"
        minChars={2}
      />
    );

    await user.type(screen.getByPlaceholderText(/Search accounts/i), "ca");

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalledWith("ca", "test-token");
    });
  });

  it("does not search when below minChars", async () => {
    const user = userEvent.setup();
    render(
      <AccountCombobox
        value={null}
        token="test-token"
        minChars={3}
      />
    );

    await user.type(screen.getByPlaceholderText(/Search accounts/i), "ca");

    expect(getAccounts).not.toHaveBeenCalled();
  });

  it("calls onValueChange when account is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    getAccounts.mockResolvedValue([
      { AccountNo: "1100001", Description: "Cash" },
    ]);
    render(
      <AccountCombobox
        value={null}
        onValueChange={onValueChange}
        token="test-token"
        minChars={0}
      />
    );

    await user.type(screen.getByPlaceholderText(/Search accounts/i), "c");
    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled();
    });

    const option = await screen.findByRole("button", { name: /1100001/ });
    await user.click(option);

    expect(onValueChange).toHaveBeenCalledWith({
      AccountNo: "1100001",
      Description: "Cash",
    });
  });
});

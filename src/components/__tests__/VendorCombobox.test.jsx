import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VendorCombobox } from "../VendorCombobox";

vi.mock("@/lib/api/vendor", () => ({
  searchVendors: vi.fn(),
}));

import { searchVendors } from "@/lib/api/vendor";

describe("VendorCombobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays value when provided", () => {
    render(
      <VendorCombobox
        value={{ Name: "Acme Corp", VendorNo: "V001" }}
        token="test-token"
      />
    );
    expect(screen.getByDisplayValue(/Acme Corp.*#V001/)).toBeInTheDocument();
  });

  it("shows placeholder when value is empty", () => {
    render(<VendorCombobox value={null} token="test-token" />);
    expect(screen.getByPlaceholderText(/Search vendors/)).toBeInTheDocument();
  });

  it("calls onValueChange with null when input changes", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <VendorCombobox
        value={{ Name: "Acme", VendorNo: "V001" }}
        onValueChange={onValueChange}
        token="test-token"
      />
    );

    await user.clear(screen.getByDisplayValue(/Acme.*#V001/));
    await user.type(screen.getByPlaceholderText(/Search vendors/), "x");

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("searches when minChars reached", async () => {
    const user = userEvent.setup();
    searchVendors.mockResolvedValue([
      { Name: "Acme", VendorNo: "V001" },
    ]);
    render(
      <VendorCombobox value={null} token="test-token" minChars={2} />
    );

    await user.type(screen.getByPlaceholderText(/Search vendors/), "ac");

    await waitFor(() => {
      expect(searchVendors).toHaveBeenCalledWith("ac", "test-token");
    });
  });

  it("calls onValueChange when vendor is selected", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    searchVendors.mockResolvedValue([
      { Name: "Acme Corp", VendorNo: "V001" },
    ]);
    render(
      <VendorCombobox
        value={null}
        onValueChange={onValueChange}
        token="test-token"
        minChars={1}
      />
    );

    await user.type(screen.getByPlaceholderText(/Search vendors/), "a");
    await waitFor(() => {
      expect(searchVendors).toHaveBeenCalled();
    });

    const option = await screen.findByRole("button", { name: /Acme Corp/ });
    await user.click(option);

    expect(onValueChange).toHaveBeenCalledWith({
      Name: "Acme Corp",
      VendorNo: "V001",
    });
  });
});

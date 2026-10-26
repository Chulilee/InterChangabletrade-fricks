import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "../SearchBar";

describe("SearchBar", () => {
  it("renders a search input with placeholder and accessibility attributes", () => {
    render(<SearchBar value="" onChange={jest.fn()} />);
    const input = screen.getByLabelText("Search listings");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("role", "combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onChange after debounce when typing", () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    render(<SearchBar value="" onChange={onChange} />);
    const input = screen.getByLabelText("Search listings");

    fireEvent.change(input, { target: { value: "loft" } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith("loft");

    jest.useRealTimers();
  });

  it("selecting a suggestion calls onChange with the suggestion and closes", () => {
    const onChange = jest.fn();
    render(
      <SearchBar value="" suggestions={["Downtown Loft", "Gold Bar"]} onChange={onChange} />,
    );
    const input = screen.getByLabelText("Search listings");
    // Type a character so the suggestions dropdown opens on focus.
    fireEvent.change(input, { target: { value: "Downtown" } });
    fireEvent.focus(input);

    const suggestion = screen.getByRole("option", { name: "Downtown Loft" });
    fireEvent.click(suggestion);

    expect(onChange).toHaveBeenCalledWith("Downtown Loft");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("pressing Enter submits the current value", () => {
    const onChange = jest.fn();
    render(<SearchBar value="loft" onChange={onChange} />);
    const input = screen.getByLabelText("Search listings");
    fireEvent.change(input, { target: { value: "gold bar" } });
    fireEvent.submit(input.closest("form")!);
    expect(onChange).toHaveBeenCalledWith("gold bar");
  });

  it("syncs external value changes into the input", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <SearchBar value="" onChange={onChange} />,
    );
    const input = screen.getByLabelText("Search listings");
    expect(input).toHaveValue("");

    rerender(<SearchBar value="gold bar" onChange={onChange} />);
    expect(input).toHaveValue("gold bar");
  });
});

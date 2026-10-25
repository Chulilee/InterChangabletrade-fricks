import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPanel } from "../FilterPanel";
import type { ListingFilters } from "@/types/listing";

const baseFilters: ListingFilters = {
  search: "",
  category: "",
  tags: [],
  sortBy: "date",
  page: 1,
  perPage: 6,
};

function renderPanel(filters: ListingFilters = baseFilters) {
  const onChange = jest.fn();
  render(<FilterPanel filters={filters} onChange={onChange} allTags={[]} />);
  return onChange;
}

describe("FilterPanel", () => {
  it("renders category, sort, price and tag controls", () => {
    renderPanel();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
    expect(screen.getByLabelText("Min price")).toBeInTheDocument();
    expect(screen.getByLabelText("Max price")).toBeInTheDocument();
  });

  it("toggles a category and reports it via onChange", () => {
    const onChange = renderPanel();
    const categorySelect = screen.getByLabelText("Category");
    fireEvent.change(categorySelect, { target: { value: "Commodities" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: "Commodities", page: 1 }),
    );
  });

  it("clears the category when 'All categories' is selected", () => {
    const onChange = renderPanel({ ...baseFilters, category: "Real Estate" });
    const categorySelect = screen.getByLabelText("Category");
    fireEvent.change(categorySelect, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: "", page: 1 }),
    );
  });

  it("toggles tags on and off", () => {
    const onChange = renderPanel({
      ...baseFilters,
      tags: ["apartment"],
    });
    const allTags = ["apartment", "luxury", "urban"];
    render(<FilterPanel filters={baseFilters} onChange={onChange} allTags={allTags} />);

    const luxuryBtn = screen.getByRole("button", { name: "luxury" });
    expect(luxuryBtn).not.toHaveAttribute("aria-checked", "true");
    fireEvent.click(luxuryBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["luxury"], page: 1 }),
    );

    // Click again to remove.
    fireEvent.click(luxuryBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [], page: 1 }),
    );
  });

  it("reports price min and max changes", () => {
    const onChange = renderPanel();
    const minInput = screen.getByLabelText("Min price");
    fireEvent.change(minInput, { target: { value: "100" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: 100, page: 1 }),
    );

    const maxInput = screen.getByLabelText("Max price");
    fireEvent.change(maxInput, { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceMax: 500, page: 1 }),
    );
  });

  it("reports sort changes", () => {
    const onChange = renderPanel();
    const sortSelect = screen.getByLabelText("Sort by");
    fireEvent.change(sortSelect, { target: { value: "price-asc" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: "price-asc", page: 1 }),
    );
  });

  it("clears all tags when the clear button is clicked", () => {
    const onChange = renderPanel({
      ...baseFilters,
      tags: ["apartment", "luxury"],
    });
    render(
      <FilterPanel
        filters={{ ...baseFilters, tags: ["apartment", "luxury"] }}
        onChange={onChange}
        allTags={["apartment", "luxury"]}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: /Clear all/ });
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [], page: 1 }),
    );
  });
});

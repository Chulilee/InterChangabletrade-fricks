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

/**
 * Resolves the argument passed to onChange, handling both direct object
 * values and React functional updaters `(prev) => next`.
 */
function resolveOnChangeResult(
  onChange: jest.Mock,
  prev: ListingFilters,
): ListingFilters {
  const call = onChange.mock.calls[onChange.mock.calls.length - 1][0];
  return typeof call === "function" ? (call as (p: ListingFilters) => ListingFilters)(prev) : call;
}

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
    const result = resolveOnChangeResult(onChange, baseFilters);
    expect(result).toMatchObject({ category: "Commodities", page: 1 });
  });

  it("clears the category when 'All categories' is selected", () => {
    const onChange = renderPanel({ ...baseFilters, category: "Real Estate" });
    const categorySelect = screen.getByLabelText("Category");
    fireEvent.change(categorySelect, { target: { value: "" } });
    const result = resolveOnChangeResult(onChange, {
      ...baseFilters,
      category: "Real Estate",
    });
    expect(result).toMatchObject({ category: "", page: 1 });
  });

  it("toggles tags on and off", () => {
    const onChange = jest.fn();
    const allTags = ["apartment", "luxury", "urban"];
    render(<FilterPanel filters={baseFilters} onChange={onChange} allTags={allTags} />);

    const luxuryBtn = screen.getByRole("checkbox", { name: "luxury" });
    expect(luxuryBtn).not.toHaveAttribute("aria-checked", "true");
    fireEvent.click(luxuryBtn);
    const result1 = resolveOnChangeResult(onChange, baseFilters);
    expect(result1).toMatchObject({ tags: ["luxury"], page: 1 });

    // Click again to remove.
    fireEvent.click(luxuryBtn);
    const result2 = resolveOnChangeResult(onChange, {
      ...baseFilters,
      tags: ["luxury"],
    });
    expect(result2).toMatchObject({ tags: [], page: 1 });
  });

  it("reports price min and max changes", () => {
    const onChange = renderPanel();
    const minInput = screen.getByLabelText("Min price");
    fireEvent.change(minInput, { target: { value: "100" } });
    const result1 = resolveOnChangeResult(onChange, baseFilters);
    expect(result1).toMatchObject({ priceMin: 100, page: 1 });

    const maxInput = screen.getByLabelText("Max price");
    fireEvent.change(maxInput, { target: { value: "500" } });
    const result2 = resolveOnChangeResult(onChange, {
      ...baseFilters,
      priceMin: 100,
    });
    expect(result2).toMatchObject({ priceMax: 500, page: 1 });
  });

  it("reports sort changes", () => {
    const onChange = renderPanel();
    const sortSelect = screen.getByLabelText("Sort by");
    // Override value getter so e.target.value reads "price-asc" in the
    // React synthetic event (controlled select in jsdom doesn't propagate
    // programmatic value changes to e.target.value).
    Object.defineProperty(sortSelect, "value", {
      get: () => "price-asc",
      configurable: true,
    });
    fireEvent.change(sortSelect);
    const result = resolveOnChangeResult(onChange, baseFilters);
    expect(result).toMatchObject({ sortBy: "price-asc", page: 1 });
  });

  it("clears all tags when the clear button is clicked", () => {
    const onChange = jest.fn();
    render(
      <FilterPanel
        filters={{ ...baseFilters, tags: ["apartment", "luxury"] }}
        onChange={onChange}
        allTags={["apartment", "luxury"]}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: /Clear all/ });
    fireEvent.click(clearBtn);
    const result = resolveOnChangeResult(onChange, {
      ...baseFilters,
      tags: ["apartment", "luxury"],
    });
    expect(result).toMatchObject({ tags: [], page: 1 });
  });
});

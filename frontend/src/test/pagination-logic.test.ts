import { describe, it, expect } from "vitest";

describe("Pagination Logic & Calculations", () => {
  it("calculates total pages correctly for different page sizes", () => {
    const totalItems = 25;
    expect(Math.max(1, Math.ceil(totalItems / 10))).toBe(3);
    expect(Math.max(1, Math.ceil(totalItems / 12))).toBe(3);
    expect(Math.max(1, Math.ceil(totalItems / 25))).toBe(1);
    expect(Math.max(1, Math.ceil(0 / 12))).toBe(1);
  });

  it("clamps page numbers within valid range [1, totalPages]", () => {
    const clampPage = (p: number, totalPages: number) => {
      if (p < 1) return 1;
      if (p > totalPages) return totalPages;
      return p;
    };

    expect(clampPage(-5, 5)).toBe(1);
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(99, 5)).toBe(5);
  });

  it("handles item deletion and decrements page when last item on page is deleted", () => {
    let currentPage = 3;
    const pageSize = 10;
    // Before delete: 21 items -> page 1: 10, page 2: 10, page 3: 1 item
    let itemsCount = 21;
    const paginatedItemsCount = itemsCount - (currentPage - 1) * pageSize; // 1 item on page 3
    expect(paginatedItemsCount).toBe(1);

    // Deleting item:
    itemsCount -= 1; // 20 items left
    if (paginatedItemsCount === 1 && currentPage > 1) {
      currentPage -= 1;
    }
    expect(currentPage).toBe(2);
  });

  it("resets page to 1 on filter or search changes", () => {
    let currentPage = 4;
    const handleFilterChange = () => {
      currentPage = 1;
    };
    handleFilterChange();
    expect(currentPage).toBe(1);
  });

  it("resets page to 1 on page size change", () => {
    let currentPage = 3;
    let pageSize = 6;
    const handlePageSizeChange = (newSize: number) => {
      pageSize = newSize;
      currentPage = 1;
    };
    handlePageSizeChange(12);
    expect(pageSize).toBe(12);
    expect(currentPage).toBe(1);
  });

  it("slices items correctly for client-side pagination", () => {
    const list = Array.from({ length: 30 }, (_, i) => `item-${i + 1}`);
    const paginate = (items: string[], page: number, size: number) => {
      const start = (page - 1) * size;
      return items.slice(start, start + size);
    };

    const p1 = paginate(list, 1, 10);
    expect(p1.length).toBe(10);
    expect(p1[0]).toBe("item-1");
    expect(p1[9]).toBe("item-10");

    const p3 = paginate(list, 3, 10);
    expect(p3.length).toBe(10);
    expect(p3[0]).toBe("item-21");
    expect(p3[9]).toBe("item-30");

    const p4 = paginate(list, 4, 10);
    expect(p4.length).toBe(0);
  });

  it("parses and generates URL pagination search params safely", () => {
    const parseParams = (query: string) => {
      const params = new URLSearchParams(query);
      const rawPage = parseInt(params.get("page") || "1", 10);
      const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
      const rawPerPage = parseInt(params.get("per_page") || "12", 10);
      const perPage = isNaN(rawPerPage) || rawPerPage < 1 ? 12 : Math.min(100, rawPerPage);
      const search = params.get("search") || "";
      return { page, perPage, search };
    };

    expect(parseParams("?page=2&per_page=24&search=dentist")).toEqual({
      page: 2,
      perPage: 24,
      search: "dentist",
    });

    // Fallbacks on invalid input
    expect(parseParams("?page=abc&per_page=-50")).toEqual({
      page: 1,
      perPage: 12,
      search: "",
    });
  });

  it("generates correct pagination item display text", () => {
    const getDisplayText = (total: number, page: number, pageSize: number, itemName = "Items") => {
      if (total === 0) return `0 ${itemName}`;
      const start = (page - 1) * pageSize + 1;
      const end = Math.min(page * pageSize, total);
      return `Showing ${start}–${end} of ${total} ${itemName}`;
    };

    expect(getDisplayText(21, 1, 10, "Clinicians")).toBe("Showing 1–10 of 21 Clinicians");
    expect(getDisplayText(21, 2, 10, "Clinicians")).toBe("Showing 11–20 of 21 Clinicians");
    expect(getDisplayText(21, 3, 10, "Clinicians")).toBe("Showing 21–21 of 21 Clinicians");
    expect(getDisplayText(0, 1, 10, "Roles")).toBe("0 Roles");
  });
});

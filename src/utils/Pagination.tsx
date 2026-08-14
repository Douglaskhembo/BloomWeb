import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (val: number) => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 50];
// Cap how many page-number buttons show at once — the window slides to keep the current page
// visible as Previous/Next move through it, instead of listing every page (e.g. all 28 of them).
const MAX_VISIBLE_PAGES = 5;

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange }: PaginationProps) => {
  const windowSize = Math.min(MAX_VISIBLE_PAGES, Math.max(totalPages, 0));
  let pages: number[] = [];
  if (windowSize > 0) {
    let windowStart = Math.max(1, currentPage - Math.floor(windowSize / 2));
    const windowEnd = Math.min(totalPages, windowStart + windowSize - 1);
    windowStart = Math.max(1, windowEnd - windowSize + 1);
    pages = [...Array(windowEnd - windowStart + 1).keys()].map((n) => n + windowStart);
  }

  return (
    <div className="flex flex-col gap-3 mt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Items per page:</label>
        <Select value={String(itemsPerPage)} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
          <SelectTrigger className="h-8 w-[80px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ul className="flex flex-wrap items-center gap-1 list-none m-0 p-0">
        {totalPages > 0 && (
          <li className="mr-1 text-sm text-muted-foreground">Page {currentPage} of {totalPages}</li>
        )}
        <li>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
        </li>
        {pages.map((n) => (
          <li key={n}>
            <Button
              variant={n === currentPage ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 px-0"
              onClick={() => onPageChange(n)}
            >
              {n}
            </Button>
          </li>
        ))}
        <li>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </li>
      </ul>
    </div>
  );
};

export default Pagination;

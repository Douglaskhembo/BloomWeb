interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (val: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange }: PaginationProps) => {
  const pages = [...Array(totalPages).keys()].map(n => n + 1);
  return (
    <div className="flex justify-between items-center mt-3">
      <div>
        <label className="text-sm">Items per page:&nbsp;</label>
        <select
          value={itemsPerPage}
          onChange={e => onItemsPerPageChange(Number(e.target.value))}
          className="inline-block border rounded px-2 py-1 text-sm"
        >
          {[5, 10, 15, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ul className="flex gap-1 list-none mb-0">
        <li>
          <button
            className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >Previous</button>
        </li>
        {pages.map(n => (
          <li key={n}>
            <button
              onClick={() => onPageChange(n)}
              className={`px-3 py-1 border rounded text-sm hover:bg-gray-100 ${n === currentPage ? "bg-blue-500 text-white" : ""}`}
            >{n}</button>
          </li>
        ))}
        <li>
          <button
            className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >Next</button>
        </li>
      </ul>
    </div>
  );
};

export default Pagination;

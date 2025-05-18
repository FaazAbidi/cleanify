import { useState } from "react";
import { DatasetType } from "@/types/dataset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  dataset: DatasetType;
}

export const DataTable = ({ dataset }: DataTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const rowsPerPage = 10;

  // Filter columns based on search
  const filteredColumns = dataset.columnNames.filter((col) =>
    col.toLowerCase().includes(search.toLowerCase())
  );

  // Split columns into pinned and unpinned
  const pinnedFilteredColumns = filteredColumns.filter(col => pinnedColumns.includes(col));
  const unpinnedFilteredColumns = filteredColumns.filter(col => !pinnedColumns.includes(col));
  
  // Calculate pagination
  const totalPages = Math.ceil(dataset.rawData.length / rowsPerPage);
  const startIdx = (page - 1) * rowsPerPage;
  const displayedRows = dataset.rawData.slice(startIdx, startIdx + rowsPerPage);

  const togglePinColumn = (column: string) => {
    if (pinnedColumns.includes(column)) {
      setPinnedColumns(pinnedColumns.filter(col => col !== column));
    } else {
      setPinnedColumns([...pinnedColumns, column]);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search columns..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table container with horizontal scroll and sticky header */}
      <div className="w-full overflow-x-auto relative border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              {/* Pinned columns */}
              {pinnedFilteredColumns.map((column, idx) => (
                <TableHead 
                  key={`pinned-${idx}`} 
                  className={cn(
                    "whitespace-nowrap sticky left-0 z-20 bg-background shadow-[1px_0_0_0_rgba(0,0,0,0.1)]",
                    idx > 0 && `left-[${idx * 150}px]`
                  )}
                  style={{ 
                    minWidth: "150px",
                    left: idx > 0 ? `${idx * 150}px` : 0
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column}</span>
                    <button
                      onClick={() => togglePinColumn(column)}
                      className="p-1 rounded-full hover:bg-muted"
                    >
                      <PinOff size={14} />
                    </button>
                  </div>
                </TableHead>
              ))}
              
              {/* Unpinned columns */}
              {unpinnedFilteredColumns.map((column, idx) => (
                <TableHead 
                  key={`unpinned-${idx}`} 
                  className="whitespace-nowrap min-w-[150px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column}</span>
                    <button
                      onClick={() => togglePinColumn(column)}
                      className="p-1 rounded-full hover:bg-muted"
                    >
                      <Pin size={14} />
                    </button>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {/* Pinned columns */}
                {pinnedFilteredColumns.map((column, colIdx) => {
                  const actualColIdx = dataset.columnNames.findIndex(col => col === column);
                  const cellValue = row[actualColIdx] || '-';
                  return (
                    <TableCell 
                      key={`pinned-${colIdx}`} 
                      className={cn(
                        "whitespace-nowrap text-ellipsis sticky left-0 bg-background shadow-[1px_0_0_0_rgba(0,0,0,0.1)]",
                        colIdx > 0 && `left-[${colIdx * 150}px]`
                      )}
                      style={{ 
                        minWidth: "150px",
                        left: colIdx > 0 ? `${colIdx * 150}px` : 0
                      }}
                    >
                      {String(cellValue)}
                    </TableCell>
                  );
                })}
                
                {/* Unpinned columns */}
                {unpinnedFilteredColumns.map((column, colIdx) => {
                  const actualColIdx = dataset.columnNames.findIndex(col => col === column);
                  const cellValue = row[actualColIdx] || '-';
                  return (
                    <TableCell 
                      key={`unpinned-${colIdx}`} 
                      className="whitespace-nowrap text-ellipsis min-w-[150px]"
                    >
                      {String(cellValue)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-sm text-gray-500">
            Showing {startIdx + 1} to {Math.min(startIdx + rowsPerPage, dataset.rawData.length)} of{" "}
            {dataset.rawData.length} rows
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

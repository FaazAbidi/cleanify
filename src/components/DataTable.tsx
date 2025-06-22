import { useState, useEffect } from "react";
import { DatasetType } from "@/types/dataset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableProps {
  dataset: DatasetType;
  highlightColumn?: string | null;
}

export const DataTable = ({ dataset, highlightColumn }: DataTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const rowsPerPage = 10;

  // Effect to handle highlighting column
  useEffect(() => {
    if (highlightColumn) {
      // Pin the column if not already pinned
      if (!pinnedColumns.includes(highlightColumn)) {
        setPinnedColumns([...pinnedColumns, highlightColumn]);
      }
      
      // Set search to focus on this column
      setSearch(highlightColumn);
      
      // Reset page to 1
      setPage(1);
      
      // Track the highlighted column
      setActiveHighlight(highlightColumn);
    }
  }, [highlightColumn]);
  
  // Reset highlighting and filtering
  const resetHighlighting = () => {
    setActiveHighlight(null);
    setSearch("");
    // Optionally unpin the column too
    if (activeHighlight && pinnedColumns.includes(activeHighlight)) {
      setPinnedColumns(pinnedColumns.filter(col => col !== activeHighlight));
    }
  };

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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search columns..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {activeHighlight && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={resetHighlighting}
            className="whitespace-nowrap"
          >
            Clear Highlight
          </Button>
        )}
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
                    idx > 0 && `left-[${idx * 150}px]`,
                    column === activeHighlight && "bg-amber-50 dark:bg-amber-900/20"
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
                  className={cn(
                    "whitespace-nowrap min-w-[150px]",
                    column === activeHighlight && "bg-amber-50 dark:bg-amber-900/20"
                  )}
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
                        colIdx > 0 && `left-[${colIdx * 150}px]`,
                        column === activeHighlight && "bg-amber-50/40 dark:bg-amber-900/10"
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
                      className={cn(
                        "whitespace-nowrap text-ellipsis min-w-[150px]",
                        column === activeHighlight && "bg-amber-50/40 dark:bg-amber-900/10"
                      )}
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
          <div className="text-sm text-muted-foreground">
            Showing {startIdx + 1} to {Math.min(startIdx + rowsPerPage, dataset.rawData.length)} of{" "}
            {dataset.rawData.length} rows
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState } from "react";
import { DatasetType } from "@/types/dataset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface DataTableProps {
  dataset: DatasetType;
}

export const DataTable = ({ dataset }: DataTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Filter columns based on search
  const filteredColumns = dataset.columnNames.filter((col) =>
    col.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(dataset.rawData.length / rowsPerPage);
  const startIdx = (page - 1) * rowsPerPage;
  const displayedRows = dataset.rawData.slice(startIdx, startIdx + rowsPerPage);

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

      {/* Table container with horizontal scroll */}
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              {filteredColumns.map((column, idx) => (
                <TableHead key={idx} className="whitespace-nowrap" >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {filteredColumns.map((column, colIdx) => {
                  const actualColIdx = dataset.columnNames.findIndex(col => col === column);
                  const cellValue = row[actualColIdx] || '-';
                  return (
                    <TableCell 
                      key={colIdx} 
                      className="whitespace-nowrap text-ellipsis"
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

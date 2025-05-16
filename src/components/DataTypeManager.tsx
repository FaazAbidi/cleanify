import { DatasetType, ColumnInfo } from "@/types/dataset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { calculateColumnStats } from "@/lib/data-utils";

interface DataTypeManagerProps {
  dataset: DatasetType;
  onDatasetUpdate: (updatedDataset: DatasetType) => void;
}

const DATA_TYPES = ['numeric', 'categorical', 'datetime', 'text', 'boolean'] as const;
type DataType = typeof DATA_TYPES[number];

export const DataTypeManager = ({ dataset, onDatasetUpdate }: DataTypeManagerProps) => {
  const [columns, setColumns] = useState<ColumnInfo[]>(dataset.columns);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const columnsPerPage = 10;

  // Reset columns when dataset changes
  useEffect(() => {
    setColumns(dataset.columns);
    setHasChanges(false);
  }, [dataset]);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    return columns.filter(column => 
      column.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [columns, search]);

  // Paginate filtered columns
  const totalPages = Math.ceil(filteredColumns.length / columnsPerPage);
  const startIdx = (page - 1) * columnsPerPage;
  const displayedColumns = filteredColumns.slice(startIdx, startIdx + columnsPerPage);

  // Handle column type change
  const handleTypeChange = (columnName: string, newType: DataType) => {
    const updatedColumns = columns.map(column => {
      if (column.name === columnName) {
        // If type hasn't changed, return the original column
        if (column.type === newType) return column;
        
        // Find column data to recalculate stats
        const columnIndex = dataset.columnNames.indexOf(columnName);
        const columnData = dataset.rawData.map(row => row[columnIndex]);
        
        // Create updated column with new type and stats
        return {
          ...column,
          type: newType,
          ...calculateColumnStats(columnData, newType),
        };
      }
      return column;
    });

    setColumns(updatedColumns);
    setHasChanges(true);
  };

  // Apply changes to the dataset
  const applyChanges = () => {
    if (!hasChanges) return;

    // Count data types for updated dataset
    const dataTypes: Record<string, number> = {
      numeric: 0,
      categorical: 0,
      datetime: 0,
      text: 0,
      boolean: 0,
    };
    
    columns.forEach(col => {
      dataTypes[col.type]++;
    });

    // Create updated dataset with new column types
    const updatedDataset: DatasetType = {
      ...dataset,
      columns,
      dataTypes,
    };

    onDatasetUpdate(updatedDataset);
    setHasChanges(false);
  };

  // Reset changes
  const resetChanges = () => {
    setColumns(dataset.columns);
    setHasChanges(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Data Type Management</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={resetChanges}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button 
            onClick={applyChanges}
            disabled={!hasChanges}
          >
            Apply Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search columns..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {displayedColumns.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No columns found matching "{search}"
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column Name</TableHead>
                  <TableHead>Current Type</TableHead>
                  <TableHead>Override Type</TableHead>
                  <TableHead>Unique Values</TableHead>
                  <TableHead>Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedColumns.map((column) => (
                  <TableRow key={column.name}>
                    <TableCell className="font-medium">{column.name}</TableCell>
                    <TableCell>
                      <Badge variant={column.type !== dataset.columns.find(c => c.name === column.name)?.type ? "outline" : "default"}>
                        {column.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={column.type}
                        onValueChange={(value) => handleTypeChange(column.name, value as DataType)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{column.uniqueValues}</TableCell>
                    <TableCell>{column.missingValues} ({column.missingPercent.toFixed(1)}%)</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-500">
              Showing {startIdx + 1} to {Math.min(startIdx + columnsPerPage, filteredColumns.length)} of{" "}
              {filteredColumns.length} columns
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
      </CardContent>
    </Card>
  );
}; 
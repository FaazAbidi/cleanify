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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Search, Edit3, CheckSquare, Square } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { calculateColumnStats, inferSimplifiedDataType, updateVersionDataTypes, createDataTypesFromColumns } from "@/lib/data-utils";
import { useToast } from "@/components/ui/use-toast";

interface DataTypeManagerProps {
  dataset: DatasetType;
  onDatasetUpdate: (updatedDataset: DatasetType) => void;
  versionId?: number; // Add versionId to persist changes to database
}

const DATA_TYPES = ['QUANTITATIVE', 'QUALITATIVE'] as const;
type DataType = typeof DATA_TYPES[number];

export const DataTypeManager = ({ dataset, onDatasetUpdate, versionId }: DataTypeManagerProps) => {
  const [columns, setColumns] = useState<ColumnInfo[]>(dataset.columns);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Bulk edit state
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<DataType>('QUANTITATIVE');
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  
  const { toast } = useToast();
  const columnsPerPage = 10;

  // Reset columns when dataset changes
  useEffect(() => {
    setColumns(dataset.columns);
    setHasChanges(false);
    setSelectedColumns(new Set());
  }, [dataset]);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Filter columns based on search
  const filteredColumns = useMemo(() => {
    return columns.filter(column => 
      (column.originalName || column.name).toLowerCase().includes(search.toLowerCase())
    );
  }, [columns, search]);

  // Paginate filtered columns
  const totalPages = Math.ceil(filteredColumns.length / columnsPerPage);
  const startIdx = (page - 1) * columnsPerPage;
  const displayedColumns = filteredColumns.slice(startIdx, startIdx + columnsPerPage);

  // Handle individual column type change
  const handleTypeChange = (columnName: string, newType: DataType) => {
    const updatedColumns = columns.map(column => {
      if (column.name === columnName) {
        // If type hasn't changed, return the original column
        if (column.type === newType) return column;
        
        // Find column data to recalculate stats
        const columnIndex = dataset.columnNames.indexOf(columnName);
        const columnData = dataset.rawData.map(row => row[columnIndex]);
        
        // Infer detailed type for internal calculation, then override with user choice
        const detailedType = inferSimplifiedDataType(columnData);
        const stats = calculateColumnStats(columnData, detailedType);
        
        // Create updated column with new type and stats
        return {
          ...column,
          ...stats,
          type: newType, // Override with user's choice
        };
      }
      return column;
    });

    setColumns(updatedColumns);
    setHasChanges(true);
  };

  // Handle bulk type change by range
  const handleBulkChangeByRange = () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > columns.length || end > columns.length || start > end) {
      toast({
        title: "Invalid Range",
        description: `Please enter a valid range between 1 and ${columns.length}`,
        variant: "destructive",
      });
      return;
    }

    // Get column names in the range
    const columnsInRange = columns.slice(start - 1, end).map(col => col.name);
    
    // Update all columns in the range in a single state update
    const updatedColumns = columns.map(column => {
      if (columnsInRange.includes(column.name)) {
        // Find column data to recalculate stats
        const columnIndex = dataset.columnNames.indexOf(column.name);
        const columnData = dataset.rawData.map(row => row[columnIndex]);
        
        // Recalculate stats with new type
        const stats = calculateColumnStats(columnData, bulkType);
        
        return {
          ...column,
          ...stats,
          type: bulkType,
        };
      }
      return column;
    });

    setColumns(updatedColumns);
    setHasChanges(true);

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${columnsInRange.length} columns (${start}-${end}) to ${bulkType}`,
    });

    // Clear range inputs
    setRangeStart('');
    setRangeEnd('');
  };

  // Handle bulk type change by selection
  const handleBulkChangeBySelection = () => {
    if (selectedColumns.size === 0) {
      toast({
        title: "No Columns Selected",
        description: "Please select at least one column to apply bulk changes",
        variant: "destructive",
      });
      return;
    }

    // Update all selected columns in a single state update
    const updatedColumns = columns.map(column => {
      if (selectedColumns.has(column.name)) {
        // Find column data to recalculate stats
        const columnIndex = dataset.columnNames.indexOf(column.name);
        const columnData = dataset.rawData.map(row => row[columnIndex]);
        
        // Recalculate stats with new type
        const stats = calculateColumnStats(columnData, bulkType);
        
        return {
          ...column,
          ...stats,
          type: bulkType,
        };
      }
      return column;
    });

    setColumns(updatedColumns);
    setHasChanges(true);

    toast({
      title: "Bulk Update Applied",
      description: `Updated ${selectedColumns.size} selected columns to ${bulkType}`,
    });

    // Clear selection
    setSelectedColumns(new Set());
  };

  // Handle column selection toggle
  const handleColumnSelection = (columnName: string, checked: boolean) => {
    const newSelection = new Set(selectedColumns);
    if (checked) {
      newSelection.add(columnName);
    } else {
      newSelection.delete(columnName);
    }
    setSelectedColumns(newSelection);
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (selectedColumns.size === filteredColumns.length) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(filteredColumns.map(col => col.name)));
    }
  };

  // Apply changes to the dataset and persist to database
  const applyChanges = async () => {
    if (!hasChanges) return;

    setSaving(true);
    
    try {
      // Count data types for updated dataset
      const dataTypes: Record<string, number> = {
        QUANTITATIVE: 0,
        QUALITATIVE: 0,
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

      // If versionId is provided, persist changes to database
      if (versionId) {
        const dataTypesToStore = createDataTypesFromColumns(columns);
        const success = await updateVersionDataTypes(versionId, dataTypesToStore);
        
        if (!success) {
          toast({
            title: "Error",
            description: "Failed to save data type changes to database. Changes applied locally only.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Data type changes saved successfully.",
          });
        }
      }

      onDatasetUpdate(updatedDataset);
      setHasChanges(false);
    } catch (error) {
      console.error('Error applying data type changes:', error);
      toast({
        title: "Error",
        description: "Failed to apply data type changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const resetChanges = () => {
    setColumns(dataset.columns);
    setHasChanges(false);
    setSelectedColumns(new Set());
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Data Type Management</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowBulkEdit(!showBulkEdit)}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {showBulkEdit ? 'Hide' : 'Show'} Bulk Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={resetChanges}
            disabled={!hasChanges || saving}
          >
            Reset
          </Button>
          <Button 
            onClick={applyChanges}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Apply Changes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {versionId && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Data Type Source of Truth:</strong> Changes made here will be saved to the database and inherited by child versions.
            </p>
          </div>
        )}

        {/* Bulk Edit Section */}
        {showBulkEdit && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border">
            <h3 className="text-sm font-medium mb-4">Bulk Edit Data Types</h3>
            
            {/* Range Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">From Column #</label>
                  <Input
                    type="number"
                    placeholder="1"
                    min="1"
                    max={columns.length}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To Column #</label>
                  <Input
                    type="number"
                    placeholder={columns.length.toString()}
                    min="1"
                    max={columns.length}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Change to Type</label>
                  <Select value={bulkType} onValueChange={(value) => setBulkType(value as DataType)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleBulkChangeByRange}
                  disabled={saving}
                  size="sm"
                >
                  Apply Range
                </Button>
              </div>

              <Separator />

              {/* Selection Based Bulk Edit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Selected Columns</label>
                  <div className="text-sm text-muted-foreground">
                    {selectedColumns.size} column(s) selected
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Change to Type</label>
                  <Select value={bulkType} onValueChange={(value) => setBulkType(value as DataType)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleBulkChangeBySelection}
                  disabled={saving || selectedColumns.size === 0}
                  size="sm"
                >
                  Apply to Selected
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search columns..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {displayedColumns.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No columns found matching "{search}"
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {showBulkEdit && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedColumns.size === filteredColumns.length && filteredColumns.length > 0}
                        onCheckedChange={handleSelectAllToggle}
                        disabled={saving}
                      />
                    </TableHead>
                  )}
                  <TableHead>Column Name</TableHead>
                  <TableHead>Current Type</TableHead>
                  <TableHead>Override Type</TableHead>
                  <TableHead>Unique Values</TableHead>
                  <TableHead>Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedColumns.map((column, index) => (
                  <TableRow key={column.name}>
                    {showBulkEdit && (
                      <TableCell>
                        <Checkbox
                          checked={selectedColumns.has(column.name)}
                          onCheckedChange={(checked) => handleColumnSelection(column.name, !!checked)}
                          disabled={saving}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span title={column.name}>{column.originalName || column.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          #{startIdx + index + 1}
                        </Badge>
                        {column.originalName && column.originalName !== column.name && (
                          <Badge variant="outline" className="text-xs">
                            ID: {column.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={column.type !== dataset.columns.find(c => c.name === column.name)?.type ? "outline" : "default"}>
                        {column.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={column.type}
                        onValueChange={(value) => handleTypeChange(column.name, value as DataType)}
                        disabled={saving}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
            <div className="text-sm text-muted-foreground">
              Showing {startIdx + 1} to {Math.min(startIdx + columnsPerPage, filteredColumns.length)} of{" "}
              {filteredColumns.length} columns
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
      </CardContent>
    </Card>
  );
}; 
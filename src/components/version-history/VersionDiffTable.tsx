import { useEffect, useState, useMemo } from 'react';
import { TaskVersion } from "@/types/version";
import { DatasetType } from "@/types/dataset";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";

interface VersionDiffTableProps {
  baseVersion: TaskVersion;
  compareVersion: TaskVersion;
  dataset: DatasetType | null;
  compareDataset: DatasetType | null;
}

interface DiffRow {
  id: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  baseData: Record<string, any> | null;
  compareData: Record<string, any> | null;
  modifiedColumns: Set<string>;
}

const ROWS_PER_PAGE = 10;

export function VersionDiffTable({ 
  baseVersion, 
  compareVersion, 
  dataset, 
  compareDataset 
}: VersionDiffTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);

  // Generate row identifier - use index as the primary method for now
  const getRowId = (row: any, index: number): string => {
    return `row_${index}`;
  };

  // Calculate diff between datasets
  const diffData = useMemo(() => {
    if (!dataset?.rawData || !compareDataset?.rawData) {
      return { rows: [], columns: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0 } };
    }

    setIsCalculating(true);

    const baseData = dataset.rawData;
    const compareData = compareDataset.rawData;

    // Clean column names to handle carriage returns and other whitespace issues
    const baseColumns = dataset.columnNames?.map(col => col.trim()) || [];
    const compareColumns = compareDataset.columnNames?.map(col => col.trim()) || [];
    
    // Use the cleaned base dataset columns as reference
    const columns = baseColumns;
    
    

    // Create maps for quick lookup
    const baseMap = new Map<string, any>();
    const compareMap = new Map<string, any>();

    baseData.forEach((row, index) => {
      const id = getRowId(row, index);
      baseMap.set(id, row);
    });

    compareData.forEach((row, index) => {
      const id = getRowId(row, index);
      compareMap.set(id, row);
    });

    // Get all unique row IDs
    const allRowIds = new Set([...baseMap.keys(), ...compareMap.keys()]);
    
    const diffRows: DiffRow[] = [];
    let stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };

    allRowIds.forEach(rowId => {
      const baseRow = baseMap.get(rowId);
      const compareRow = compareMap.get(rowId);

      if (!baseRow && compareRow) {
        // Row was added
        diffRows.push({
          id: rowId,
          status: 'added',
          baseData: null,
          compareData: compareRow,
          modifiedColumns: new Set()
        });
        stats.added++;
      } else if (baseRow && !compareRow) {
        // Row was removed
        diffRows.push({
          id: rowId,
          status: 'removed',
          baseData: baseRow,
          compareData: null,
          modifiedColumns: new Set()
        });
        stats.removed++;
      } else if (baseRow && compareRow) {
        // Row exists in both, check for modifications
        const modifiedColumns = new Set<string>();
        
        columns.forEach(col => {
          // Get column index using cleaned column names
          const baseColIndex = baseColumns.indexOf(col);
          const compareColIndex = compareColumns.indexOf(col);
          
          // Only compare if the column exists in the base dataset
          if (baseColIndex >= 0) {
            const rawBaseValue = baseRow[baseColIndex];
            const rawCompareValue = compareColIndex >= 0 ? compareRow[compareColIndex] : undefined;
            
            // Clean the values to handle carriage returns and whitespace
            const baseValue = typeof rawBaseValue === 'string' ? rawBaseValue.trim() : rawBaseValue;
            const compareValue = typeof rawCompareValue === 'string' ? rawCompareValue.trim() : rawCompareValue;
            
            // Check if values are different, but ignore changes less than 1 for numeric values
            let isChanged = false;
            
            if (baseValue !== compareValue) {
              // Try to parse as numbers
              const baseNum = parseFloat(baseValue);
              const compareNum = parseFloat(compareValue);
              
              // If both are valid numbers, check if difference is >= 1
              if (!isNaN(baseNum) && !isNaN(compareNum)) {
                if (Math.abs(baseNum - compareNum) >= 1) {
                  isChanged = true;
                }
              } else {
                // For non-numeric values, any difference counts
                isChanged = true;
              }
            }
            
            if (isChanged) {
              modifiedColumns.add(col);
            }
          }
        });

        if (modifiedColumns.size > 0) {
          diffRows.push({
            id: rowId,
            status: 'modified',
            baseData: baseRow,
            compareData: compareRow,
            modifiedColumns
          });
          stats.modified++;
        } else {
          diffRows.push({
            id: rowId,
            status: 'unchanged',
            baseData: baseRow,
            compareData: compareRow,
            modifiedColumns: new Set()
          });
          stats.unchanged++;
        }
      }
    });

    // Sort rows to prioritize changed rows first, then by ID
    diffRows.sort((a, b) => {
      // Define priority order: modified > added > removed > unchanged
      const priorityOrder = { 'modified': 0, 'added': 1, 'removed': 2, 'unchanged': 3 };
      
      const aPriority = priorityOrder[a.status];
      const bPriority = priorityOrder[b.status];
      
      // First sort by status priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same status, sort by ID for consistent ordering
      return a.id.localeCompare(b.id);
    });

    setIsCalculating(false);

    return { rows: diffRows, columns, stats };
  }, [dataset, compareDataset]);

  // Pagination logic
  const totalPages = Math.ceil(diffData.rows.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentRows = diffData.rows.slice(startIndex, endIndex);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dataset, compareDataset]);

  if (!dataset || !compareDataset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Table Diff</CardTitle>
          <CardDescription>Missing dataset for comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="h-5 w-5" />
            <p>Unable to compare datasets. Please ensure both versions have processed data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCalculating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Table Diff</CardTitle>
          <CardDescription>Processing comparison...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <p>Calculating differences between datasets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRowClassName = (status: string) => {
    switch (status) {
      case 'added':
        return 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30';
      case 'removed':
        return 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30';
      case 'modified':
        return 'bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30';
      default:
        return 'hover:bg-muted/50';
    }
  };

      const getCellContent = (row: DiffRow, column: string) => {
     // Get column index using cleaned column names
     const baseColumns = dataset?.columnNames?.map(col => col.trim()) || [];
     const compareColumns = compareDataset?.columnNames?.map(col => col.trim()) || [];
     
     const baseColIndex = baseColumns.indexOf(column);
     const compareColIndex = compareColumns.indexOf(column);
     
     const rawBaseValue = baseColIndex >= 0 && row.baseData ? row.baseData[baseColIndex] : undefined;
     const rawCompareValue = compareColIndex >= 0 && row.compareData ? row.compareData[compareColIndex] : undefined;
     
     // Clean the values to handle carriage returns and whitespace
     const baseValue = typeof rawBaseValue === 'string' ? rawBaseValue.trim() : rawBaseValue;
     const compareValue = typeof rawCompareValue === 'string' ? rawCompareValue.trim() : rawCompareValue;
     

     
 
    
    if (row.status === 'added') {
      return compareValue !== null && compareValue !== undefined ? String(compareValue) : '';
    } else if (row.status === 'removed') {
      return baseValue !== null && baseValue !== undefined ? String(baseValue) : '';
    } else if (row.status === 'modified' && row.modifiedColumns.has(column)) {
      // Modified cell - show both values
      return (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded space-y-1">
          <div className="text-red-600 dark:text-red-400 text-sm">
            <span className="font-medium">Before:</span> {baseValue !== null && baseValue !== undefined ? String(baseValue) : 'null'}
          </div>
          <div className="text-green-600 dark:text-green-400 text-sm">
            <span className="font-medium">After:</span> {compareValue !== null && compareValue !== undefined ? String(compareValue) : 'null'}
          </div>
        </div>
      );
    } else {
      // Unchanged cell
      const value = compareValue !== null && compareValue !== undefined ? compareValue : baseValue;
      return value !== null && value !== undefined ? String(value) : '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Table Diff</CardTitle>
        <CardDescription>
          Comparing "{baseVersion.name || `Version ${baseVersion.version_number}`}" with 
          "{compareVersion.name || `Version ${compareVersion.version_number}`}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        <div className="flex flex-wrap gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Added: {diffData.stats.added}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium">Removed: {diffData.stats.removed}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm font-medium">Modified: {diffData.stats.modified}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-sm font-medium">Unchanged: {diffData.stats.unchanged}</span>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, diffData.rows.length)} of {diffData.rows.length} rows
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

                 {/* Data Table */}
         <ScrollArea className="border rounded-md h-[600px]">
           <Table>
             <TableHeader>
               <TableRow>
                 {diffData.columns.map((column) => (
                   <TableHead key={column} className="whitespace-nowrap">
                     {column}
                   </TableHead>
                 ))}
               </TableRow>
             </TableHeader>
             <TableBody>
               {currentRows.map((row) => (
                 <TableRow 
                   key={row.id}
                   className={getRowClassName(row.status)}
                 >
                   {diffData.columns.map((column) => (
                     <TableCell key={column} className="max-w-xs">
                       <div className="truncate">
                         {getCellContent(row, column)}
                       </div>
                     </TableCell>
                   ))}
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </ScrollArea>

        {/* Summary */}
        {diffData.rows.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No data differences found between the selected versions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
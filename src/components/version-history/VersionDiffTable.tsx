import { useEffect, useState } from 'react';
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

// Number of rows to process and display per page
const ROWS_PER_PAGE = 100;
const MAX_DIFF_ROWS = 10000; // Maximum number of rows to process for diff

export function VersionDiffTable({ 
  baseVersion, 
  compareVersion, 
  dataset, 
  compareDataset 
}: VersionDiffTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [diffPages, setDiffPages] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStats, setTotalStats] = useState({ added: 0, removed: 0, modified: 0 });
  
  // Calculate diff between datasets
  useEffect(() => {
    if (!dataset?.rawData || !compareDataset?.rawData) return;
    
    const calculateDiff = async () => {
      setIsCalculating(true);
      
      try {
        // For very large datasets, we need to sample or limit the data
        const baseData = dataset.rawData.slice(0, MAX_DIFF_ROWS);
        const compareData = compareDataset.rawData.slice(0, MAX_DIFF_ROWS);
        
        // Get all column names from both datasets
        const allColumns = new Set([
          ...Object.keys(baseData[0] || {}),
          ...Object.keys(compareData[0] || {})
        ]);
        
        // Create mappings for quick lookup - this is memory intensive but necessary for performance
        const baseMap = new Map(baseData.map(row => [getRowIdentifier(row), row]));
        const compareMap = new Map(compareData.map(row => [getRowIdentifier(row), row]));
        
        // Get all unique IDs from both datasets
        const allIds = new Set([
          ...baseData.map(row => getRowIdentifier(row)),
          ...compareData.map(row => getRowIdentifier(row))
        ]);
        
        // Convert to array and sort for consistent results
        const sortedIds = Array.from(allIds).sort();
        
        // Calculate total pages
        const pages = Math.ceil(sortedIds.length / ROWS_PER_PAGE);
        setTotalPages(pages);
        
        // Process the first page immediately
        await processPage(1, sortedIds, baseMap, compareMap, Array.from(allColumns));
        
        // Count total stats
        let totalAdded = 0;
        let totalRemoved = 0;
        let totalModified = 0;
        
        sortedIds.forEach(id => {
          const baseRow = baseMap.get(id);
          const compareRow = compareMap.get(id);
          
          if (!baseRow && compareRow) {
            totalAdded++;
          } else if (baseRow && !compareRow) {
            totalRemoved++;
          } else if (baseRow && compareRow) {
            // Check if modified by comparing values
            let isModified = false;
            for (const column of allColumns) {
              if (baseRow[column] !== compareRow[column]) {
                isModified = true;
                break;
              }
            }
            if (isModified) totalModified++;
          }
        });
        
        setTotalStats({
          added: totalAdded,
          removed: totalRemoved,
          modified: totalModified
        });
      } finally {
        setIsCalculating(false);
      }
    };
    
    calculateDiff();
  }, [dataset, compareDataset]);
  
  // Process a specific page of diff data
  const processPage = async (page: number, allIds: string[], baseMap: Map<string, any>, compareMap: Map<string, any>, columns: string[]) => {
    return new Promise<void>((resolve) => {
      // Use setTimeout to prevent UI blocking for large datasets
      setTimeout(() => {
        const startIdx = (page - 1) * ROWS_PER_PAGE;
        const endIdx = Math.min(startIdx + ROWS_PER_PAGE, allIds.length);
        const pageIds = allIds.slice(startIdx, endIdx);
        
        // Create diff rows for this page
        const diffRows = pageIds.map(id => {
          const baseRow = baseMap.get(id);
          const compareRow = compareMap.get(id);
          
          // Determine row status
          let rowStatus = baseRow && compareRow ? 'unchanged' : (baseRow ? 'removed' : 'added');
          
          // Create cell diffs
          const cellDiffs: Record<string, { 
            oldValue: any, 
            newValue: any, 
            status: 'unchanged' | 'added' | 'removed' | 'modified'
          }> = {};
          
          columns.forEach(col => {
            const baseValue = baseRow?.[col];
            const compareValue = compareRow?.[col];
            
            if (!baseRow) {
              cellDiffs[col] = { oldValue: null, newValue: compareValue, status: 'added' };
            } else if (!compareRow) {
              cellDiffs[col] = { oldValue: baseValue, newValue: null, status: 'removed' };
            } else if (baseValue !== compareValue) {
              cellDiffs[col] = { oldValue: baseValue, newValue: compareValue, status: 'modified' };
              if (rowStatus === 'unchanged') rowStatus = 'modified';
            } else {
              cellDiffs[col] = { oldValue: baseValue, newValue: compareValue, status: 'unchanged' };
            }
          });
          
          return {
            id,
            status: rowStatus,
            cells: cellDiffs
          };
        });
        
        // Update the diffPages state
        setDiffPages(prev => {
          const newPages = [...prev];
          newPages[page - 1] = {
            page,
            columns,
            rows: diffRows
          };
          return newPages;
        });
        
        resolve();
      }, 0);
    });
  };
  
  // Load page data when page changes
  useEffect(() => {
    if (!dataset?.rawData || !compareDataset?.rawData) return;
    
    const loadPageData = async () => {
      // If page data already loaded, skip
      if (diffPages[currentPage - 1]) return;
      
      setIsCalculating(true);
      
      try {
        const baseData = dataset.rawData.slice(0, MAX_DIFF_ROWS);
        const compareData = compareDataset.rawData.slice(0, MAX_DIFF_ROWS);
        
        const allColumns = new Set([
          ...Object.keys(baseData[0] || {}),
          ...Object.keys(compareData[0] || {})
        ]);
        
        const baseMap = new Map(baseData.map(row => [getRowIdentifier(row), row]));
        const compareMap = new Map(compareData.map(row => [getRowIdentifier(row), row]));
        
        const allIds = new Set([
          ...baseData.map(row => getRowIdentifier(row)),
          ...compareData.map(row => getRowIdentifier(row))
        ]);
        
        const sortedIds = Array.from(allIds).sort();
        
        // Process the requested page
        await processPage(currentPage, sortedIds, baseMap, compareMap, Array.from(allColumns));
      } finally {
        setIsCalculating(false);
      }
    };
    
    loadPageData();
  }, [currentPage, diffPages, dataset, compareDataset]);
  
  // Function to generate a unique identifier for a row
  function getRowIdentifier(row: any): string {
    // Use id if available, otherwise create a hash from the row values
    if (row.id) return String(row.id);
    
    // Fallback to using the first few values as a composite key
    return Object.values(row).slice(0, 3).join('_');
  }
  
  // Current page data
  const currentPageData = diffPages[currentPage - 1];
  
  if (!dataset || !compareDataset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Comparison</CardTitle>
          <CardDescription>No dataset available for comparison</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (isCalculating && !currentPageData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Comparison</CardTitle>
          <CardDescription>Processing data for comparison...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <p>Processing large datasets, please wait...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!currentPageData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Comparison</CardTitle>
          <CardDescription>No data available for comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="h-5 w-5" />
            <p>Unable to generate differences between datasets.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { columns, rows } = currentPageData;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Comparison</CardTitle>
        <CardDescription>
          Comparing version "{baseVersion.name || `#${baseVersion.version_number}`}" with 
          "{compareVersion.name || `#${compareVersion.version_number}`}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 mb-6">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <span className="text-sm font-medium">Added rows: {totalStats.added}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <span className="text-sm font-medium">Removed rows: {totalStats.removed}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
            <span className="text-sm font-medium">Modified rows: {totalStats.modified}</span>
          </div>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} 
                {dataset.rawData.length > MAX_DIFF_ROWS && ` (showing first ${MAX_DIFF_ROWS} rows)`}
              </span>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Show pages around current page
                  let pageNum = currentPage;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={pageNum === currentPage}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        
        <ScrollArea className="border rounded-md h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 sticky left-0 bg-background z-10 border-r">Status</TableHead>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow 
                  key={row.id}
                  className={
                    row.status === 'added' 
                      ? 'bg-green-50 dark:bg-green-950/20' 
                      : row.status === 'removed' 
                        ? 'bg-red-50 dark:bg-red-950/20' 
                        : row.status === 'modified'
                          ? 'bg-amber-50 dark:bg-amber-950/10'
                          : ''
                  }
                >
                  <TableCell className="sticky left-0 bg-background z-10 border-r">
                    {row.status === 'added' && (
                      <Plus className="h-4 w-4 text-green-500" />
                    )}
                    {row.status === 'removed' && (
                      <Minus className="h-4 w-4 text-red-500" />
                    )}
                    {row.status === 'modified' && (
                      <div className="h-4 w-4 rounded-full bg-amber-400" />
                    )}
                  </TableCell>
                  {columns.map((column) => {
                    const cell = row.cells[column];
                    if (!cell) return <TableCell key={column}>-</TableCell>;
                    
                    let content;
                    if (cell.status === 'added') {
                      content = (
                        <div className="flex flex-col">
                          <span className="bg-green-100 dark:bg-green-900/30 px-1 rounded text-green-700 dark:text-green-400">
                            + {cell.newValue !== null && cell.newValue !== undefined ? String(cell.newValue) : ''}
                          </span>
                        </div>
                      );
                    } else if (cell.status === 'removed') {
                      content = (
                        <div className="flex flex-col">
                          <span className="bg-red-100 dark:bg-red-900/30 px-1 rounded text-red-700 dark:text-red-400">
                            - {cell.oldValue !== null && cell.oldValue !== undefined ? String(cell.oldValue) : ''}
                          </span>
                        </div>
                      );
                    } else if (cell.status === 'modified') {
                      content = (
                        <div className="flex flex-col gap-1">
                          <span className="bg-red-100 dark:bg-red-900/30 px-1 rounded text-red-700 dark:text-red-400">
                            - {cell.oldValue !== null && cell.oldValue !== undefined ? String(cell.oldValue) : ''}
                          </span>
                          <span className="bg-green-100 dark:bg-green-900/30 px-1 rounded text-green-700 dark:text-green-400">
                            + {cell.newValue !== null && cell.newValue !== undefined ? String(cell.newValue) : ''}
                          </span>
                        </div>
                      );
                    } else {
                      content = cell.newValue !== null && cell.newValue !== undefined ? String(cell.newValue) : '';
                    }
                    
                    return <TableCell key={column}>{content}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {/* Bottom pagination for convenience */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Show pages around current page
                  let pageNum = currentPage;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={pageNum === currentPage}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <Button 
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
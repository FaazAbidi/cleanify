import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { DatasetType } from "@/types/dataset";
import { Input } from "@/components/ui/input";
import { Search, Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// CSS styles for hiding scrollbars
const hideScrollbarStyle = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

interface VirtualDataTableProps {
  dataset: DatasetType;
  highlightColumn?: string | null;
  maxVisibleColumns?: number;
  maxVisibleRows?: number;
}

const COLUMN_WIDTH = 150;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;

export const VirtualDataTable = ({ 
  dataset, 
  highlightColumn,
  maxVisibleColumns = 20,
  maxVisibleRows = 50
}: VirtualDataTableProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  
  // Virtualization state
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
  // Refs for synchronizing scroll
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  
  const rowsPerPage = Math.min(maxVisibleRows, 100); // Cap at 100 for performance

  // Effect to handle highlighting column
  useEffect(() => {
    if (highlightColumn) {
      if (!pinnedColumns.includes(highlightColumn)) {
        setPinnedColumns([...pinnedColumns, highlightColumn]);
      }
      setSearch(highlightColumn);
      setPage(1);
      setActiveHighlight(highlightColumn);
    }
  }, [highlightColumn, pinnedColumns]);
  
  // Reset highlighting
  const resetHighlighting = () => {
    setActiveHighlight(null);
    setSearch("");
    if (activeHighlight && pinnedColumns.includes(activeHighlight)) {
      setPinnedColumns(pinnedColumns.filter(col => col !== activeHighlight));
    }
  };

  // Helper function to get display name for column
  const getColumnDisplayName = (columnId: string) => {
    const column = dataset.columns.find(col => col.name === columnId);
    return column?.originalName || columnId;
  };

  // Memoized filtered columns
  const filteredColumns = useMemo(() => {
    return dataset.columnNames.filter((col) => {
      const displayName = getColumnDisplayName(col);
      return displayName.toLowerCase().includes(search.toLowerCase()) || 
             col.toLowerCase().includes(search.toLowerCase());
    });
  }, [dataset.columnNames, dataset.columns, search]);

  // Split columns into pinned and unpinned
  const pinnedFilteredColumns = useMemo(() => 
    filteredColumns.filter(col => pinnedColumns.includes(col)), 
    [filteredColumns, pinnedColumns]
  );
  
  const unpinnedFilteredColumns = useMemo(() => {
    const unpinned = filteredColumns.filter(col => !pinnedColumns.includes(col));
    // For very large datasets, limit the number of rendered columns for performance
    const maxRenderColumns = dataset.columnNames.length > 1000 ? 500 : unpinned.length;
    return unpinned.slice(0, maxRenderColumns);
  }, [filteredColumns, pinnedColumns, dataset.columnNames.length]);

  // Calculate visible rows
  const totalPages = Math.ceil(dataset.rawData.length / rowsPerPage);
  const startRowIdx = (page - 1) * rowsPerPage;
  const endRowIdx = Math.min(startRowIdx + rowsPerPage, dataset.rawData.length);
  
  // Get visible subset of data efficiently
  const visibleRows = useMemo(() => {
    return dataset.rawData.slice(startRowIdx, endRowIdx);
  }, [dataset.rawData, startRowIdx, endRowIdx]);

  const togglePinColumn = useCallback((column: string) => {
    setPinnedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  }, []);

  // Handle scroll events with synchronization
  const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncingRef.current) return;
    
    const target = e.target as HTMLDivElement;
    const newScrollLeft = target.scrollLeft;
    const newScrollTop = target.scrollTop;
    
    setScrollLeft(newScrollLeft);
    setScrollTop(newScrollTop);
    
    // Sync header scroll with throttling for performance
    if (headerScrollRef.current && Math.abs(headerScrollRef.current.scrollLeft - newScrollLeft) > 1) {
      syncingRef.current = true;
      headerScrollRef.current.scrollLeft = newScrollLeft;
      syncingRef.current = false;
    }
  }, []);

  const handleHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncingRef.current) return;
    
    const target = e.target as HTMLDivElement;
    const newScrollLeft = target.scrollLeft;
    
    setScrollLeft(newScrollLeft);
    
    // Sync body scroll with throttling for performance
    if (bodyScrollRef.current && Math.abs(bodyScrollRef.current.scrollLeft - newScrollLeft) > 1) {
      syncingRef.current = true;
      bodyScrollRef.current.scrollLeft = newScrollLeft;
      syncingRef.current = false;
    }
  }, []);

  // Get cell value efficiently
  const getCellValue = useCallback((row: any[], columnName: string) => {
    const colIndex = dataset.columnNames.indexOf(columnName);
    return colIndex >= 0 ? (row[colIndex] ?? '-') : '-';
  }, [dataset.columnNames]);

  const totalColumnsWidth = unpinnedFilteredColumns.length * COLUMN_WIDTH;
  const pinnedColumnsWidth = pinnedFilteredColumns.length * COLUMN_WIDTH;

  return (
    <div className="space-y-4 w-full">
      <style>{hideScrollbarStyle}</style>
      {/* Search and controls */}
      <div className="flex gap-2 items-center">
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
        
        <Badge variant="outline" className="whitespace-nowrap">
          {filteredColumns.length} of {dataset.columnNames.length} columns
        </Badge>
        
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

      {/* Performance warning for large datasets */}
      {dataset.columnNames.length > 1000 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
            <span>⚡</span>
            Large dataset detected ({dataset.columnNames.length} columns). 
            {unpinnedFilteredColumns.length < filteredColumns.filter(col => !pinnedColumns.includes(col)).length && (
              <>Showing first {unpinnedFilteredColumns.length} columns for optimal performance. Use search to find specific columns.</>
            )}
            {unpinnedFilteredColumns.length >= filteredColumns.filter(col => !pinnedColumns.includes(col)).length && (
              <>Using optimized rendering for smooth scrolling performance.</>
            )}
          </div>
        </div>
      )}

      {/* Virtual table container */}
      <div className="border rounded-md bg-background overflow-hidden">
        {/* Header */}
        <div className="flex border-b bg-muted/50 sticky top-0 z-20" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Pinned headers */}
          <div className="flex border-r bg-background" style={{ minWidth: pinnedColumnsWidth }}>
            {pinnedFilteredColumns.map((column, idx) => (
              <div
                key={column}
                className={cn(
                  "flex items-center justify-between p-2 border-r font-medium text-sm",
                  column === activeHighlight && "bg-amber-50 dark:bg-amber-900/20"
                )}
                style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
              >
                <span className="truncate flex-1" title={column}>
                  {getColumnDisplayName(column)}
                </span>
                <button
                  onClick={() => togglePinColumn(column)}
                  className="p-1 rounded hover:bg-muted ml-1 flex-shrink-0"
                  title="Unpin column"
                >
                  <PinOff size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Scrollable headers */}
          <div 
            className="flex-1 overflow-x-auto overflow-y-hidden relative hide-scrollbar"
            ref={headerScrollRef}
            onScroll={handleHeaderScroll}
          >
            <div
              className="flex"
              style={{ 
                width: totalColumnsWidth,
                minWidth: totalColumnsWidth
              }}
            >
              {unpinnedFilteredColumns.map((column) => (
                <div
                  key={column}
                  className={cn(
                    "flex items-center justify-between p-2 border-r font-medium text-sm flex-shrink-0",
                    column === activeHighlight && "bg-amber-50 dark:bg-amber-900/20"
                  )}
                  style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
                >
                  <span className="truncate flex-1" title={column}>
                    {getColumnDisplayName(column)}
                  </span>
                  <button
                    onClick={() => togglePinColumn(column)}
                    className="p-1 rounded hover:bg-muted ml-1 flex-shrink-0"
                    title="Pin column"
                  >
                    <Pin size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table body */}
        <div 
          className="overflow-auto max-h-[600px]"
          ref={bodyScrollRef}
          onScroll={handleBodyScroll}
          style={{ 
            scrollBehavior: 'auto',
            overscrollBehavior: 'contain'
          }}
        >
          {visibleRows.map((row, rowIdx) => (
            <div key={startRowIdx + rowIdx} className="flex border-b hover:bg-muted/30">
              {/* Pinned cells */}
              <div className="flex border-r bg-background/80" style={{ minWidth: pinnedColumnsWidth }}>
                {pinnedFilteredColumns.map((column) => (
                  <div
                    key={column}
                    className={cn(
                      "p-2 border-r text-sm truncate",
                      column === activeHighlight && "bg-amber-50/40 dark:bg-amber-900/10"
                    )}
                    style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
                    title={String(getCellValue(row, column))}
                  >
                    {String(getCellValue(row, column))}
                  </div>
                ))}
              </div>

              {/* Scrollable cells */}
              <div 
                className="flex"
                style={{ 
                  width: totalColumnsWidth,
                  minWidth: totalColumnsWidth
                }}
              >
                {unpinnedFilteredColumns.map((column) => (
                  <div
                    key={column}
                    className={cn(
                      "p-2 border-r text-sm truncate flex-shrink-0",
                      column === activeHighlight && "bg-amber-50/40 dark:bg-amber-900/10"
                    )}
                    style={{ width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH }}
                    title={String(getCellValue(row, column))}
                  >
                    {String(getCellValue(row, column))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Showing {startRowIdx + 1} to {endRowIdx} of {dataset.rawData.length} rows
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
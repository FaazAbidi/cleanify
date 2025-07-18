export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  uniqueValues: number;
  missingValues: number;
  missingPercent: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  mode?: string | number;
  std?: number;
  range?: [number, number];
  distribution?: Record<string | number, number>;
  outliers?: number;
  skewness?: number;
  isSkewed?: boolean;
  // Data type consistency information
  hasMixedTypes?: boolean;
  inconsistencyRatio?: number;
  typeBreakdown?: {
    numeric: number;
    string: number;
    boolean: number;
    null: number;
    total: number;
  };
}

export interface CorrelationData {
  matrix: number[][];
  labels: string[];
}

export interface DatasetType {
  filename: string;
  columns: ColumnInfo[];
  rows: number;
  rawData: any[][];
  columnNames: string[];
  correlationData?: CorrelationData;
  missingValuesCount: number;
  duplicateRowsCount: number;
  duplicateColumnsCount: number;
  dataTypes: Record<string, number>;
}

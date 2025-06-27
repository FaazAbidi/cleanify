export type ImputationMethodCategorical = 'impute_mode' | 'impute_random' | 'remove';
export type ImputationMethodNumeric = 'impute_mean' | 'impute_median' | 'impute_random' | 'remove' | 'impute_constant';
export type ImputationMethod = ImputationMethodCategorical | ImputationMethodNumeric;
export type SkewnessMethod = 'log' | 'sqrt' | 'reciprocal';
export type CombinationMethod = '+' | '-' | '*' | '/' | '%%';
export type BinningMethod = 'equal_width' | 'equal_depth';
export type InconsistencyMethod = ImputationMethod;
export type OutlierMethod = ImputationMethod;

// Pre-analysis model options
export type PreAnalysisModel = 
  | 'Linear Regression'
  | 'Logistic Regression'
  | 'Decision Trees'
  | 'Support Vector Machines'
  | 'K-Nearest Neighbors'
  | 'Random Forests'
  | 'Gradient Boosting'
  | 'Neural Networks'
  | 'Linear Discriminant Analysis';

// Pre-analysis request configuration
export interface PreAnalysisConfig {
  task_id: string;
  method: 'pre_analysis';
  model: PreAnalysisModel;
  target: string | null;
  threshold_check_categorical: number;
  threshold_check_skewness: number;
  threshold_sampling: number;
  threshold_check_dimensionality: number;
  threshold_check_multicollinearity: number;
  columns: Record<string, PreAnalysisColumnConfig> | null;
}

// Pre-analysis column configuration
export interface PreAnalysisColumnConfig {
  type: 'QUANTITATIVE' | 'QUALITATIVE';
  step: null;
  value: null;
}

// Pre-analysis response types
export interface PreAnalysisResult {
  pa_cleaning: {
    outliers: {
      outlier_info: Array<{ count: number; column: string }>;
      recommendation: string;
    };
    duplicates: {
      count: number;
      exists: boolean;
      recommendation: string;
    };
    inconsistencies: {
      recommendation: string;
      inconsistent_info: Array<any>;
    };
    missing_columns: {
      missing_info: Array<any>;
      recommendation: string;
    };
    missing_overall: {
      count: number;
      exists: boolean;
      recommendation: string;
    };
  };
  pa_reduction: {
    is_pca_required: Array<any>;
    is_sampling_required: boolean;
    multicollinearity_exists: Record<string, any>;
    high_dimensionality_exists: boolean;
  };
  pa_transformation: {
    skewed_columns: {
      columns: string[];
      recommendation: string;
    };
    columns_require_normalization: {
      columns: string[];
      recommendation: string;
    };
    columns_require_standardization: {
      columns: string[];
      recommendation: string;
    };
  };
  pa_feature_engineering: {
    columns_require_label_encoding: {
      columns: Record<string, any>;
      recommendation: string;
    };
    columns_require_one_hot_encoding: {
      columns: Record<string, any>;
      recommendation: string;
    };
  };
}

export type Technique = 'data_cleaning' | 'data_transformation' | 'data_reduction' | 'pre_analysis' | 'feature_engineering';

export type Method = 'fix_missing' | 'perform_binning' | 'perform_combine_features' | 'perform_drop_columns' | 'fix_inconsistencies' | 'perform_label_encoding' | 'perform_normalization' | 'perform_one_hot_encoding' | 'fix_outliers' | 'perform_pca_reduction' | 'perform_sampling' | 'fix_skewness' | 'perform_standarization'

export type ColumnMethod = ImputationMethod | SkewnessMethod | CombinationMethod | BinningMethod;

// Base type for column configuration
interface BaseColumnConfig {
    type: 'QUANTITATIVE' | 'QUALITATIVE';
}

// Column configuration for imputation
interface ImputationColumnConfig extends BaseColumnConfig {
    step: ColumnMethod;
    value: string | null;
}

// Column configuration for inconsistency handling
interface InconsistencyColumnConfig extends BaseColumnConfig {
    step: InconsistencyMethod;
    value: null;
}

// Column configuration for outlier handling
interface OutlierColumnConfig extends BaseColumnConfig {
    step: OutlierMethod;
    value: null;
}

// Union type for all column configurations
export type ColumnConfig = ImputationColumnConfig | InconsistencyColumnConfig | OutlierColumnConfig;

export type MethodConfig = {
    technique: Technique; // 'data_cleaning'
    method: Method; // 'fix_missing'
    step: string | null;
    value: string | null;
    target: string | null;
    columns: Record<string, ColumnConfig>;
}

export type MethodConfigWithTaskMethodId = MethodConfig & {
    taskMethodId: number;
}
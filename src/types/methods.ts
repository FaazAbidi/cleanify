export type ImputationMethodCategorical = 'impute_mode' | 'impute_random' | 'remove';
export type ImputationMethodNumeric = 'impute_mean' | 'impute_median' | 'impute_random' | 'remove' | 'impute_constant';
export type ImputationMethod = ImputationMethodCategorical | ImputationMethodNumeric;
export type SkewnessMethod = 'log' | 'sqrt' | 'reciprocal';
export type CombinationMethod = '+' | '-' | '*' | '/' | '%%';
export type BinningMethod = 'equal_width' | 'equal_depth';
export type InconsistencyMethod = ImputationMethod;
export type OutlierMethod = ImputationMethod;

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
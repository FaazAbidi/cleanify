import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Info, TrendingUp, Zap, Target, Users, Database, BarChart3, Lightbulb } from 'lucide-react';
import { PreAnalysisResult } from '@/types/methods';

interface PreAnalysisResultsProps {
  result: PreAnalysisResult;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'warning' | 'error' | 'success' | 'info';
}

const StatCard = ({ title, value, icon: Icon, variant = 'default' }: StatCardProps) => {
  const variantStyles = {
    default: 'bg-muted/50 border-muted-foreground/20 text-foreground',
    warning: 'bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-950/30 dark:border-orange-800/30 dark:text-orange-100',
    error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800/30 dark:text-red-100',
    success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800/30 dark:text-green-100',
    info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/30 dark:text-blue-100'
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-orange-600 dark:text-orange-400',
    error: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div className={`rounded-lg border p-4 transition-colors ${variantStyles[variant]}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-8 w-8 ${iconStyles[variant]}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm opacity-70">{title}</p>
        </div>
      </div>
    </div>
  );
};

interface RecommendationCardProps {
  title: string;
  recommendation: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'info' | 'warning' | 'success';
  items?: string[];
  counts?: Array<{ column: string; count: number }>;
}

const RecommendationCard = ({ title, recommendation, icon: Icon, variant = 'info', items, counts }: RecommendationCardProps) => {
  const variantStyles = {
    info: 'border-border bg-muted/30',
    warning: 'border-orange-200 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/20',
    success: 'border-green-200 bg-green-50/50 dark:border-green-800/30 dark:bg-green-950/20'
  };

  const iconStyles = {
    info: 'text-muted-foreground',
    warning: 'text-orange-600 dark:text-orange-400',
    success: 'text-green-600 dark:text-green-400'
  };

  return (
    <Card className={`${variantStyles[variant]} transition-all hover:shadow-md`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-3">
          <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(items && items.length > 0) || (counts && counts.length > 0) ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {counts && counts.map((item, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="px-3 py-1.5 text-sm bg-background/60 hover:bg-background/80 transition-colors font-medium"
                >
                  <span className="font-semibold">{item.column}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs dark:bg-orange-900/50 dark:text-orange-200 font-bold">
                    {item.count}
                  </span>
                </Badge>
              ))}
              {items && items.filter(item => item && item.trim() !== '').map((item, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="px-3 py-1.5 text-sm bg-background/60 hover:bg-background/80 transition-colors font-medium"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">No columns require this type of encoding</p>
          </div>
        )}
        
        <Alert className="border-0 bg-muted/40">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold mb-1">Recommendation</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            {recommendation}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export const PreAnalysisResults = memo(function PreAnalysisResults({
  result
}: PreAnalysisResultsProps) {
  const { pa_cleaning, pa_reduction, pa_transformation, pa_feature_engineering } = result;

  // Calculate summary statistics
  const totalOutliers = pa_cleaning.outliers.outlier_info.reduce((sum, item) => sum + item.count, 0);
  const totalMissingValues = pa_cleaning.missing_overall.count;
  const totalSkewedColumns = pa_transformation.skewed_columns.columns.length;
  const needsNormalization = pa_transformation.columns_require_normalization.columns.length;

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="h-5 w-5" />
            Analysis Summary
          </CardTitle>
          <CardDescription>
            Key findings from your pre-analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Outliers Found"
              value={totalOutliers}
              icon={AlertTriangle}
              variant={totalOutliers > 0 ? 'warning' : 'success'}
            />
            <StatCard
              title="Missing Values"
              value={totalMissingValues}
              icon={Database}
              variant={totalMissingValues > 0 ? 'error' : 'success'}
            />
            <StatCard
              title="Skewed Columns"
              value={totalSkewedColumns}
              icon={TrendingUp}
              variant={totalSkewedColumns > 0 ? 'warning' : 'success'}
            />
            <StatCard
              title="Need Normalization"
              value={needsNormalization}
              icon={Target}
              variant={needsNormalization > 0 ? 'info' : 'success'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Detailed Pre-Analysis Results
          </CardTitle>
          <CardDescription>
            Comprehensive recommendations for data preprocessing based on your selected model and thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cleaning" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="cleaning" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Cleaning
              </TabsTrigger>
              <TabsTrigger value="transformation" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Transformation
              </TabsTrigger>
              <TabsTrigger value="reduction" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reduction
              </TabsTrigger>
              <TabsTrigger value="feature-engineering" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Feature Engineering
              </TabsTrigger>
            </TabsList>

            {/* Data Cleaning Tab */}
            <TabsContent value="cleaning" className="space-y-4">
              <div className="grid gap-4">
                <RecommendationCard
                  title="Outliers Detection"
                  recommendation={pa_cleaning.outliers.recommendation}
                  icon={AlertTriangle}
                  variant={pa_cleaning.outliers.outlier_info.length > 0 ? 'warning' : 'success'}
                  counts={pa_cleaning.outliers.outlier_info}
                />

                <RecommendationCard
                  title="Duplicate Records"
                  recommendation={pa_cleaning.duplicates.recommendation}
                  icon={Users}
                  variant={pa_cleaning.duplicates.exists ? 'warning' : 'success'}
                />

                <RecommendationCard
                  title="Missing Values by Column"
                  recommendation={pa_cleaning.missing_columns.recommendation}
                  icon={Database}
                  variant={pa_cleaning.missing_columns.missing_info.length > 0 ? 'warning' : 'success'}
                  counts={pa_cleaning.missing_columns.missing_info}
                />

                <RecommendationCard
                  title="Data Inconsistencies"
                  recommendation={pa_cleaning.inconsistencies.recommendation}
                  icon={AlertTriangle}
                  variant={pa_cleaning.inconsistencies.inconsistent_info.length > 0 ? 'warning' : 'success'}
                  counts={pa_cleaning.inconsistencies.inconsistent_info}
                />
              </div>
            </TabsContent>

            {/* Transformation Tab */}
            <TabsContent value="transformation" className="space-y-4">
              <div className="grid gap-4">
                <RecommendationCard
                  title="Skewed Columns"
                  recommendation={pa_transformation.skewed_columns.recommendation}
                  icon={TrendingUp}
                  variant={pa_transformation.skewed_columns.columns.length > 0 ? 'warning' : 'success'}
                  items={pa_transformation.skewed_columns.columns}
                />

                <RecommendationCard
                  title="Normalization Requirements"
                  recommendation={pa_transformation.columns_require_normalization.recommendation}
                  icon={Target}
                  variant={pa_transformation.columns_require_normalization.columns.length > 0 ? 'info' : 'success'}
                  items={pa_transformation.columns_require_normalization.columns}
                />

                <RecommendationCard
                  title="Standardization Requirements"
                  recommendation={pa_transformation.columns_require_standardization.recommendation}
                  icon={Zap}
                  variant={pa_transformation.columns_require_standardization.columns.length > 0 ? 'info' : 'success'}
                  items={pa_transformation.columns_require_standardization.columns}
                />
              </div>
            </TabsContent>

            {/* Reduction Tab */}
            <TabsContent value="reduction" className="space-y-4">
              <div className="grid gap-4">
                {/* Compact grid layout for all reduction analyses */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* PCA Analysis */}
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">Principal Component Analysis (PCA)</span>
                        </div>
                        <Badge 
                          variant={pa_reduction.is_pca_required ? "default" : "secondary"} 
                          className="px-4 py-2 text-base font-bold"
                        >
                          {pa_reduction.is_pca_required ? "Required" : "Not Required"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sampling Analysis */}
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">Sampling Analysis</span>
                        </div>
                        <Badge 
                          variant={pa_reduction.is_sampling_required ? "default" : "secondary"} 
                          className="px-4 py-2 text-base font-bold"
                        >
                          {pa_reduction.is_sampling_required ? "Required" : "Not Required"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* High Dimensionality */}
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">High Dimensionality</span>
                        </div>
                        <Badge 
                          variant={pa_reduction.high_dimensionality_exists ? "destructive" : "secondary"} 
                          className="px-4 py-2 text-base font-bold"
                        >
                          {pa_reduction.high_dimensionality_exists ? "Detected" : "Not Detected"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Multicollinearity */}
                  <Card className="border-border bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">Multicollinearity</span>
                        </div>
                        <Badge 
                          variant={pa_reduction.multicollinearity_exists ? "destructive" : "secondary"} 
                          className="px-4 py-2 text-base font-bold"
                        >
                          {pa_reduction.multicollinearity_exists ? "Detected" : "Not Detected"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Feature Engineering Tab */}
            <TabsContent value="feature-engineering" className="space-y-4">
              <div className="grid gap-4">
                <RecommendationCard
                  title="Label Encoding Analysis"
                  recommendation={pa_feature_engineering.columns_require_label_encoding.recommendation}
                  icon={Target}
                  variant="info"
                  items={pa_feature_engineering.columns_require_label_encoding.columns}
                />

                <RecommendationCard
                  title="One-Hot Encoding Analysis"
                  recommendation={pa_feature_engineering.columns_require_one_hot_encoding.recommendation}
                  icon={Zap}
                  variant="info"
                  items={pa_feature_engineering.columns_require_one_hot_encoding.columns}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});
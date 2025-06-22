import { useState, memo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCategories, Category } from '@/hooks/useCategories';
import { useCreateTaskVersion } from '@/hooks/useCreateTaskVersion';
import { TaskVersion } from '@/types/version';
import { getErrorMessage } from '@/lib/utils';
import { MethodConfigFactory } from './MethodConfigFactory';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Info, ArrowLeft, CheckCircle2, Settings, Wrench, BarChart3, Filter, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';
import { DatasetType } from '@/types/dataset';
import { Method } from '@/types/methods';
import { cn } from '@/lib/utils';

// Form schema for validation
const preprocessingFormSchema = z.object({
  methodId: z.string().min(1, 'Please select a preprocessing method'),
  versionName: z.string().min(1, 'Please enter a version name'),
  parentVersionId: z.string().min(1, 'Please select a parent version')
});

type PreprocessingFormValues = z.infer<typeof preprocessingFormSchema>;

interface PreprocessingFormProps {
  task: Tables<'Tasks'>;
  versions: TaskVersion[];
  dataset: DatasetType;
  selectedVersion?: TaskVersion | null;
  progress: number;
  loadingData: boolean;
  isProcessing: boolean;
  onSuccess?: (newVersionId: number) => void;
  onDatasetUpdate: (dataset: DatasetType) => void;
}

// Category icons mapping
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('clean')) return Settings;
  if (name.includes('transformation') || name.includes('transform')) return Wrench;
  if (name.includes('reduction') || name.includes('reduce')) return BarChart3;
  if (name.includes('engineering') || name.includes('feature')) return Zap;
  return Filter;
};

// Category colors mapping
const getCategoryColor = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('clean')) return 'from-data-blue/80 to-data-blue';
  if (name.includes('transformation') || name.includes('transform')) return 'from-data-purple/80 to-data-purple';
  if (name.includes('reduction') || name.includes('reduce')) return 'from-data-orange/80 to-data-orange';
  if (name.includes('engineering') || name.includes('feature')) return 'from-data-green/80 to-data-green';
  return 'from-primary/80 to-primary';
};

export const PreprocessingForm = memo(function PreprocessingForm({ 
  task,
  dataset,
  versions, 
  onDatasetUpdate,
  progress,
  loadingData,
  selectedVersion,
  isProcessing,
  onSuccess 
}: PreprocessingFormProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createTaskVersion, loading: createLoading, error: createError } = useCreateTaskVersion();
  
  // Debug categories loading
  useEffect(() => {
    console.log('Categories loading:', categoriesLoading);
    console.log('Categories data:', categories);
  }, [categories, categoriesLoading]);
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Tables<'Methods'> | null>(null);
  const [showMethodConfig, setShowMethodConfig] = useState(false);
  const [methodConfig, setMethodConfig] = useState<any>(null);

  // Form setup
  const form = useForm<PreprocessingFormValues>({
    resolver: zodResolver(preprocessingFormSchema),
    defaultValues: {
      methodId: '',
      versionName: '',
      parentVersionId: selectedVersion ? selectedVersion.id.toString() : ''
    }
  });

  // Update parentVersionId when selectedVersion changes
  useEffect(() => {
    if (selectedVersion) {
      console.log('Setting parent version ID to:', selectedVersion.id.toString());
      form.setValue('parentVersionId', selectedVersion.id.toString());
      
      // Force UI update - this helps ensure the select control shows the correct value
      const parentField = form.getValues('parentVersionId');
      if (parentField !== selectedVersion.id.toString()) {
        setTimeout(() => {
          form.setValue('parentVersionId', selectedVersion.id.toString(), { 
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true
          });
        }, 0);
      }
    }
  }, [selectedVersion, form]);

  // Get the keyword for the selected method
  const getMethodKeyword = (methodId: string): Method | null => {
    // Find method across all categories
    for (const category of categories) {
      const method = category.methods.find(m => m.id.toString() === methodId);
      if (method?.keyword) {
        const keyword = method.keyword.toString().toLowerCase();
        return keyword as Method;
      }
    }
    return null;
  };

  // Handle category selection
  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedMethod(null);
    form.setValue('methodId', '');
    form.setValue('versionName', '');
  };

  // Handle method selection
  const handleMethodSelect = (method: Tables<'Methods'>) => {
    setSelectedMethod(method);
    form.setValue('methodId', method.id.toString());
    
    // Auto-generate a version name based on the method
    form.setValue('versionName', `${method.label} - ${new Date().toLocaleString()}`);
  };

  // Handle continue to configuration
  const handleContinueToConfig = () => {
    const result = form.trigger(['methodId', 'parentVersionId', 'versionName']);
    if (result) {
      setShowMethodConfig(true);
    }
  };

  // Handle back to method selection
  const handleBackToMethodSelection = () => {
    setShowMethodConfig(false);
    setMethodConfig(null);
  };

  // Handle back to category selection
  const handleBackToCategorySelection = () => {
    setSelectedCategory(null);
    setSelectedMethod(null);
    form.setValue('methodId', '');
    form.setValue('versionName', '');
  };

  // Handle method configuration change
  const handleMethodConfigSubmit = (config: any) => {
    setMethodConfig(config);
    handleSubmitWithConfig(config);
  };

  // Form submission handler with configuration
  const handleSubmitWithConfig = async (config: any) => {
    const values = form.getValues();
    
    setSubmitting(true);
    setFormError(null);
    
    try {
      // Create the version with method configuration
      const result = await createTaskVersion({
        taskId: task.id,
        methodId: parseInt(values.methodId),
        name: values.versionName,
        parentVersionId: parseInt(values.parentVersionId),
        config // The config parameter is supported in the CreateTaskVersionInput interface
      });
      
      if (!result) {
        throw new Error('Failed to create preprocessing version');
      }
      
      // Reset form and state
      form.reset();
      setShowMethodConfig(false);
      setSelectedCategory(null);
      setSelectedMethod(null);
      setMethodConfig(null);
      
      // Notify parent component about the new version
      if (onSuccess) onSuccess(result.id);
      
    } catch (err) {
      console.error('Error creating version:', err);
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel method configuration
  const handleCancelMethodConfig = () => {
    setShowMethodConfig(false);
    setMethodConfig(null);
  };

  // Get selected method keyword for config
  const selectedMethodKeyword = selectedMethod ? getMethodKeyword(selectedMethod.id.toString()) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preprocess your data</CardTitle>
        <CardDescription>
          Apply a preprocessing method to create a new version of your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedVersion && (
          <Alert className="mb-6 bg-muted">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Creating a new version based on <strong>{selectedVersion.name}</strong>. 
              {selectedVersion.status === 'RUNNING' && (
                <span className="block my-2 text-amber-600">
                  <Loader2 className="inline-block h-3 w-3 mr-1 animate-spin" />
                  This version is currently being processed.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {formError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        {!showMethodConfig ? (
          <div className="space-y-6">
            {/* Parent Version Selection */}
            <Form {...form}>
              <FormField
                control={form.control}
                name="parentVersionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Version</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={true}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent version" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version.id} value={version.id.toString()}>
                            {version.name}
                            {version.status === 'RUNNING' && ' (Processing...)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This is the version to which the preprocessing method will be applied
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>

            <Separator />

            {/* Category Selection */}
            {!selectedCategory && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Choose a Preprocessing Category</h3>
                  <p className="text-sm text-muted-foreground">
                    Select the type of data preprocessing you want to apply
                  </p>
                </div>
                
                {categoriesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-muted rounded-lg" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted rounded w-full" />
                              <div className="h-3 bg-muted rounded w-2/3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((category) => {
                      const Icon = getCategoryIcon(category.name);
                      const colorClass = getCategoryColor(category.name);
                      
                      return (
                        <Card 
                          key={category.id}
                          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary"
                          onClick={() => handleCategorySelect(category)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start space-x-4">
                              <div className={cn(
                                "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                colorClass
                              )}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-base">{category.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {category.methods.length} methods
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {category.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Method Selection */}
            {selectedCategory && !selectedMethod && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {(() => {
                        const Icon = getCategoryIcon(selectedCategory.name);
                        return <Icon className="w-5 h-5" />;
                      })()}
                      {selectedCategory.name} Methods
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a specific method from this category
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBackToCategorySelection}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Categories
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {selectedCategory.methods.map((method) => (
                    <Card 
                      key={method.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary border-2"
                      onClick={() => handleMethodSelect(method)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-base mb-1">{method.label}</h5>
                            <p className="text-sm text-muted-foreground">
                              {method.description}
                            </p>
                          </div>
                          <div className="ml-4">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Version Name and Continue */}
            {selectedMethod && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      {selectedMethod.label} Selected
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your version name and proceed to method configuration
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedMethod(null);
                      form.setValue('methodId', '');
                      form.setValue('versionName', '');
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Methods
                  </Button>
                </div>

                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="versionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Version Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter version name" 
                            {...field} 
                            disabled={submitting || isProcessing}
                          />
                        </FormControl>
                        <FormDescription>
                          Give a descriptive name to identify this version
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleContinueToConfig} 
                    disabled={
                      !form.getValues().methodId || 
                      !form.getValues().versionName ||
                      submitting || 
                      categoriesLoading || 
                      categories.length === 0 || 
                      versions.length === 0 || 
                      isProcessing
                    }
                    className="min-w-[140px]"
                  >
                    Configure Method
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBackToMethodSelection} 
                disabled={submitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Method Selection
              </Button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-base font-medium mb-1">
                {selectedMethod?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedMethod?.description}
              </p>
            </div>
            
            <Separator className="my-4" />
            
            {selectedMethodKeyword && dataset && (
              <MethodConfigFactory
                method={selectedMethodKeyword}
                dataset={dataset}
                onSubmit={handleMethodConfigSubmit}
                onCancel={handleCancelMethodConfig}
                isLoading={submitting}
              />
            )}
          </div>
        )}
      </CardContent>
          </Card>
    );
  }); 
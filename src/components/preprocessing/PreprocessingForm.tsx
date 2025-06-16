import { useState, memo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMethods } from '@/hooks/useMethods';
import { useCreateTaskVersion } from '@/hooks/useCreateTaskVersion';
import { TaskVersion } from '@/types/version';
import { getErrorMessage } from '@/lib/utils';
import { MethodConfigFactory } from './MethodConfigFactory';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Info, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tables } from '@/integrations/supabase/types';
import { DatasetType } from '@/types/dataset';
import { Method } from '@/types/methods';

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
  const { methods, loading: methodsLoading } = useMethods();
  const { createTaskVersion, loading: createLoading, error: createError } = useCreateTaskVersion();
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showMethodConfig, setShowMethodConfig] = useState(false);
  const [selectedMethodKeyword, setSelectedMethodKeyword] = useState<Method | null>(null);
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
    const method = methods.find(m => m.id.toString() === methodId);
    
    if (method?.keyword) {
      const keyword = method.keyword.toString().toLowerCase();
      
      return keyword as Method;
    }

    return null;
  };

  // Handle method change
  const handleMethodChange = (methodId: string) => {
    form.setValue('methodId', methodId);
    const keyword = getMethodKeyword(methodId);
    setSelectedMethodKeyword(keyword);
    
    // Auto-generate a version name based on the method
    const method = methods.find(m => m.id.toString() === methodId);
    if (method) {
      form.setValue('versionName', `${method.label} - ${new Date().toLocaleString()}`);
    }
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
      setSelectedMethodKeyword(null);
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
          <Form {...form}>
            <form className="space-y-6">
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

              <FormField
                control={form.control}
                name="methodId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preprocessing Method</FormLabel>
                    <Select 
                      onValueChange={(value) => handleMethodChange(value)} 
                      value={field.value}
                      disabled={submitting || methodsLoading || methods.length === 0 || isProcessing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {methods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the preprocessing method to apply
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <div className="flex justify-end pt-4">
                <Button 
                  type="button" 
                  onClick={handleContinueToConfig} 
                  disabled={
                    !form.getValues().methodId || 
                    submitting || 
                    methodsLoading || 
                    methods.length === 0 || 
                    versions.length === 0 || 
                    isProcessing
                  }
                >
                  Configure Method
                </Button>
              </div>
            </form>
          </Form>
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
                {methods.find(m => m.id.toString() === form.getValues().methodId)?.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {methods.find(m => m.id.toString() === form.getValues().methodId)?.description}
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
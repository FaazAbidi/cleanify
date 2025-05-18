import { useState, memo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMethods } from '@/hooks/useMethods';
import { useCreateTaskVersion } from '@/hooks/useCreateTaskVersion';
import { TaskVersion } from '@/types/version';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Form schema for validation
const preprocessingFormSchema = z.object({
  methodId: z.string().min(1, 'Please select a preprocessing method'),
  versionName: z.string().min(1, 'Please enter a version name'),
  parentVersionId: z.string().min(1, 'Please select a parent version')
});

type PreprocessingFormValues = z.infer<typeof preprocessingFormSchema>;

interface PreprocessingFormProps {
  taskId: number;
  versions: TaskVersion[];
  selectedVersion?: TaskVersion | null;
  onSuccess?: () => void;
}

export const PreprocessingForm = memo(function PreprocessingForm({ 
  taskId, 
  versions, 
  selectedVersion,
  onSuccess 
}: PreprocessingFormProps) {
  const { methods, loading: methodsLoading } = useMethods();
  const { createTaskVersion, loading: createLoading, error } = useCreateTaskVersion();
  const [submitting, setSubmitting] = useState(false);

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

  // Form submission handler
  const onSubmit = async (values: PreprocessingFormValues) => {
    setSubmitting(true);
    
    try {
      const result = await createTaskVersion({
        taskId,
        methodId: parseInt(values.methodId),
        name: values.versionName,
        parentVersionId: parseInt(values.parentVersionId)
      });
      
      if (result) {
        toast.success('New preprocessing version created successfully');
        form.reset();
        if (onSuccess) onSuccess();
      } else {
        toast.error('Failed to create preprocessing version');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      toast.error('An error occurred while creating the preprocessing version');
    } finally {
      setSubmitting(false);
    }
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
              To use a different parent version, change the selection in the Version Selector above.
            </AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={submitting || methodsLoading || methods.length === 0}
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
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Give a descriptive name to identify this version
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          type="submit" 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={submitting || methodsLoading || methods.length === 0 || versions.length === 0}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Version
        </Button>
      </CardFooter>
    </Card>
  );
}); 
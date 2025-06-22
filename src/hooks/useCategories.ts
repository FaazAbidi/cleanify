import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface Category extends Tables<'Categories'> {
  methods: Tables<'Methods'>[];
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategoriesWithMethods = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('Categories')
          .select('*')
          .order('name', { ascending: true });

        if (categoriesError) throw categoriesError;

        if (!categoriesData) {
          setCategories([]);
          return;
        }

        console.log('Categories from DB:', categoriesData);

        // Fetch all category-method relationships with method details
        const { data: categoryMethodsData, error: categoryMethodsError } = await supabase
          .from('CategoryMethods')
          .select(`
            category_id,
            Methods!inner(
              id,
              label,
              description,
              keyword,
              is_enabled,
              created_at
            )
          `);

        if (categoryMethodsError) throw categoryMethodsError;

        console.log('CategoryMethods from DB:', categoryMethodsData);

        // Group methods by category
        const methodsByCategory: Record<number, Tables<'Methods'>[]> = {};
        
        categoryMethodsData?.forEach((item) => {
          const method = item.Methods as Tables<'Methods'>;
          if (method && method.is_enabled) {
            if (!methodsByCategory[item.category_id]) {
              methodsByCategory[item.category_id] = [];
            }
            methodsByCategory[item.category_id].push(method);
          }
        });

        console.log('Methods grouped by category:', methodsByCategory);

        // Combine categories with their methods
        const categoriesWithMethods = categoriesData.map((category) => ({
          ...category,
          methods: methodsByCategory[category.id] || []
        }));

        console.log('Final categories with methods:', categoriesWithMethods);
        setCategories(categoriesWithMethods);

      } catch (err) {
        console.error('Error fetching categories with methods:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoriesWithMethods();
  }, []);

  return {
    categories,
    loading,
    error
  };
} 
import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

type MainTab = 'exploration' | 'preprocessing' | 'history' | 'compare';
type ExplorationSubTab = 'overview' | 'quality' | 'columns' | 'datatypes' | 'correlation';
type CompareSubTab = 'table' | 'visualizations';

interface TabState {
  mainTab: MainTab;
  explorationSubTab?: ExplorationSubTab;
  compareSubTab?: CompareSubTab;
}

interface UseTabStateReturn {
  tabState: TabState;
  setMainTab: (tab: MainTab) => void;
  setExplorationSubTab: (subTab: ExplorationSubTab) => void;
  setCompareSubTab: (subTab: CompareSubTab) => void;
  getTabUrl: (mainTab: MainTab, explorationSubTab?: ExplorationSubTab, compareSubTab?: CompareSubTab) => string;
}

export function useTabState(): UseTabStateReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse current tab state from URL
  const tabState = useMemo((): TabState => {
    const mainTab = (searchParams.get('tab') as MainTab) || 'exploration';
    const explorationSubTab = (searchParams.get('subtab') as ExplorationSubTab) || 'overview';
    const compareSubTab = (searchParams.get('comparesubtab') as CompareSubTab) || 'table';
    
    return {
      mainTab,
      explorationSubTab: mainTab === 'exploration' ? explorationSubTab : undefined,
      compareSubTab: mainTab === 'compare' ? compareSubTab : undefined
    };
  }, [searchParams]);

  // Set main tab and optionally clear subtabs
  const setMainTab = useCallback((tab: MainTab) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      
      // Clear subtabs when switching away
      if (tab !== 'exploration') {
        newParams.delete('subtab');
      } else {
        // If switching to exploration and no subtab is set, default to overview
        if (!newParams.get('subtab')) {
          newParams.set('subtab', 'overview');
        }
      }
      
      if (tab !== 'compare') {
        newParams.delete('comparesubtab');
      } else {
        // If switching to compare and no subtab is set, default to table
        if (!newParams.get('comparesubtab')) {
          newParams.set('comparesubtab', 'table');
        }
      }
      
      return newParams;
    }, { replace: false }); // Use push instead of replace to maintain history
  }, [setSearchParams]);

  // Set exploration subtab
  const setExplorationSubTab = useCallback((subTab: ExplorationSubTab) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', 'exploration');
      newParams.set('subtab', subTab);
      return newParams;
    }, { replace: false });
  }, [setSearchParams]);

  // Set compare subtab
  const setCompareSubTab = useCallback((subTab: CompareSubTab) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', 'compare');
      newParams.set('comparesubtab', subTab);
      return newParams;
    }, { replace: false });
  }, [setSearchParams]);

  // Generate URL for sharing specific tab state
  const getTabUrl = useCallback((mainTab: MainTab, explorationSubTab?: ExplorationSubTab, compareSubTab?: CompareSubTab): string => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', mainTab);
    
    if (mainTab === 'exploration' && explorationSubTab) {
      params.set('subtab', explorationSubTab);
    } else {
      params.delete('subtab');
    }
    
    if (mainTab === 'compare' && compareSubTab) {
      params.set('comparesubtab', compareSubTab);
    } else {
      params.delete('comparesubtab');
    }
    
    return `${window.location.pathname}?${params.toString()}`;
  }, [searchParams]);

  return {
    tabState,
    setMainTab,
    setExplorationSubTab,
    setCompareSubTab,
    getTabUrl
  };
} 
/**
 * Tab Switcher Component
 * Switches between Finance Advisor and Tool Playground modes
 */

import { cn } from '../lib/utils';

export type TabMode = 'advisor' | 'playground';

interface TabSwitcherProps {
  activeTab: TabMode;
  onTabChange: (tab: TabMode) => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-dark-lighter rounded-lg">
      <button
        onClick={() => onTabChange('advisor')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
          activeTab === 'advisor'
            ? 'bg-white dark:bg-dark-medium text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        Finance Advisor
      </button>
      <button
        onClick={() => onTabChange('playground')}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
          activeTab === 'playground'
            ? 'bg-white dark:bg-dark-medium text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        Tool Playground
      </button>
    </div>
  );
}

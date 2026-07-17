"use client";
import { useState, type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

type TabsProps = {
  tabs: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
};

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id);

  const currentActiveTab = activeTab ?? internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (activeTab === undefined) {
      setInternalActiveTab(tabId);
    }

    onTabChange?.(tabId);
  };

  if (!tabs.length) return null;

  return (
    <div>
      <div
        role="tablist"
        className="inline-flex p-1 rounded-xl bg-panel/40 border border-border/40 mb-6 overflow-x-auto scrollbar-none gap-1"
      >
        {tabs.map((tab) => {
          const isActive = currentActiveTab === tab.id;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${isActive ? "bg-card text-foreground shadow-sm border border-border/20" : "text-muted hover:text-foreground hover:bg-muted/10 border border-transparent"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="mt-4 focus:outline-none"
        role="tabpanel"
        id={`panel-${currentActiveTab}`}
        aria-labelledby={`tab-${currentActiveTab}`}
        tabIndex={0}
      >
        {tabs.find((t) => t.id === currentActiveTab)?.content}
      </div>
    </div>
  );
}

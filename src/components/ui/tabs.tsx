"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

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
  const tabListId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentActiveTab = activeTab ?? internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (activeTab === undefined) {
      setInternalActiveTab(tabId);
    }

    onTabChange?.(tabId);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    handleTabChange(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  if (!tabs.length) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex p-1 rounded-xl bg-panel/40 border border-border/40 mb-6 overflow-x-auto scrollbar-none gap-1"
      >
        {tabs.map((tab, index) => {
          const isActive = currentActiveTab === tab.id;
          const tabId = `${tabListId}-tab-${tab.id}`;
          const panelId = `${tabListId}-panel-${tab.id}`;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-setsize={tabs.length}
              aria-posinset={index + 1}
              id={tabId}
              aria-controls={panelId}
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${isActive ? "bg-card text-foreground shadow-sm border border-border/20" : "text-muted hover:text-foreground hover:bg-muted/10 border border-transparent"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        className="mt-4"
        role="tabpanel"
        id={`${tabListId}-panel-${currentActiveTab}`}
        aria-labelledby={`${tabListId}-tab-${currentActiveTab}`}
      >
        {tabs.find((t) => t.id === currentActiveTab)?.content}
      </div>
    </div>
  );
}

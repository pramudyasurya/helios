"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type TabItem = {
  id: string;
  label: ReactNode;
  content?: ReactNode;
  icon?: ReactNode;
};

type TabsProps = {
  tabs?: TabItem[];
  items?: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onChange?: (tabId: string) => void;
};

export function Tabs({ tabs, items, activeTab, onTabChange, onChange }: TabsProps) {
  const tabList = tabs ?? items ?? [];
  const handleTabChangeCallback = onTabChange ?? onChange;

  const [internalActiveTab, setInternalActiveTab] = useState(tabList[0]?.id);
  const tabListId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentActiveTab = activeTab ?? internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (activeTab === undefined) {
      setInternalActiveTab(tabId);
    }

    handleTabChangeCallback?.(tabId);
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabList.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabList.length) % tabList.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabList.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    handleTabChange(tabList[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  if (!tabList.length) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex p-1 rounded-xs bg-panel/40 border border-border/60 mb-6 overflow-x-auto scrollbar-none gap-1"
      >
        {tabList.map((tab, index) => {
          const isActive = currentActiveTab === tab.id;
          const tabId = `${tabListId}-tab-${tab.id}`;
          const panelId = `${tabListId}-panel-${tab.id}`;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-setsize={tabList.length}
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
              className={`whitespace-nowrap rounded-xs px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer inline-flex items-center space-x-1.5 ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/80 font-semibold"
                  : "text-muted hover:text-foreground hover:bg-muted/10 border border-transparent"
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {tabList.some((t) => t.content) && (
        <div
          className="mt-4"
          role="tabpanel"
          id={`${tabListId}-panel-${currentActiveTab}`}
          aria-labelledby={`${tabListId}-tab-${currentActiveTab}`}
        >
          {tabList.find((t) => t.id === currentActiveTab)?.content}
        </div>
      )}
    </div>
  );
}

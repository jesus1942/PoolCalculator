import React, { useMemo, useState } from 'react';
import type { ProjectTabId } from '@/types';
import { HdChevronDown } from '@/components/ui/HandDrawnIcons';

export interface ProjectSectionItem {
  id: ProjectTabId;
  label: string;
  icon: React.FC<any>;
}

interface ProjectMobileSectionNavProps {
  tabs: ProjectSectionItem[];
  activeTab: ProjectTabId;
  onChange: (tab: ProjectTabId) => void;
}

const GROUPS: Array<{
  title: string;
  ids: ProjectTabId[];
}> = [
  {
    title: 'Obra',
    ids: ['overview', 'status', 'tasks'],
  },
  {
    title: 'Instalación',
    ids: ['plumbing', 'electrical', 'electrical_pro', 'tiles', 'systems'],
  },
  {
    title: 'Gestión',
    ids: ['costs', 'additionals', 'roles'],
  },
  {
    title: 'Documentos',
    ids: ['export'],
  },
];

export const ProjectMobileSectionNav: React.FC<ProjectMobileSectionNavProps> = ({
  tabs,
  activeTab,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  const current = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const groupedTabs = useMemo(() => {
    const knownIds = new Set(GROUPS.flatMap((group) => group.ids));
    const groups = GROUPS.map((group) => ({
      ...group,
      tabs: group.ids
        .map((id) => tabs.find((tab) => tab.id === id))
        .filter(Boolean) as ProjectSectionItem[],
    })).filter((group) => group.tabs.length > 0);

    const otherTabs = tabs.filter((tab) => !knownIds.has(tab.id));
    if (otherTabs.length > 0) {
      groups.push({
        title: 'Otros',
        ids: otherTabs.map((tab) => tab.id),
        tabs: otherTabs,
      });
    }

    return groups;
  }, [tabs]);

  if (!current) return null;

  const CurrentIcon = current.icon;

  const selectTab = (tabId: ProjectTabId) => {
    onChange(tabId);
    setOpen(false);
  };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
        style={{
          backgroundColor: 'var(--card2)',
          border: '1.4px solid var(--hair-strong)',
          color: 'var(--ink)',
        }}
        aria-expanded={open}
        aria-controls="project-mobile-section-menu"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--accent-2)', color: 'var(--accent)' }}
        >
          <CurrentIcon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--ink-soft)' }}>
            Sección actual
          </span>
          <span className="block truncate text-sm font-semibold">{current.label}</span>
        </span>
        <HdChevronDown
          size={18}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ink-soft)' }}
        />
      </button>

      {open && (
        <div id="project-mobile-section-menu" className="rough-panel mt-3 p-3">
          <div className="relative space-y-5">
            {groupedTabs.map((group) => (
              <section key={group.title}>
                <h3
                  className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  {group.title}
                </h3>
                <div className="grid grid-cols-1 gap-1.5 min-[390px]:grid-cols-2">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => selectTab(tab.id)}
                        className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-2)' : 'transparent',
                          border: `1.3px solid ${isActive ? 'var(--accent)' : 'var(--hair)'}`,
                          color: isActive ? 'var(--accent)' : 'var(--ink)',
                        }}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <Icon size={18} className="shrink-0" />
                        <span className="min-w-0 break-words text-sm font-semibold leading-tight">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useRef, useState } from 'react';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'tools', label: 'Tools' }
];

function DashboardTabs({ overview, trends, tools }) {
  const [active, setActive] = useState('overview');
  const tabRefs = useRef([]);
  const panels = { overview, trends, tools };
  const moveTab = (index, direction) => {
    const next = (index + direction + TABS.length) % TABS.length;
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="dashboard-tabs" aria-label="Monitor Sections">
      <div className="dashboard-tablist" role="tablist" aria-label="Monitor Sections">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={element => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={`dashboard-tab-${tab.id}`}
            aria-controls={`dashboard-panel-${tab.id}`}
            aria-selected={active === tab.id}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={event => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); moveTab(index, 1); }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); moveTab(index, -1); }
              if (event.key === 'Home') { event.preventDefault(); setActive(TABS[0].id); tabRefs.current[0]?.focus(); }
              if (event.key === 'End') { event.preventDefault(); setActive(TABS.at(-1).id); tabRefs.current.at(-1)?.focus(); }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map(tab => (
        <div
          key={tab.id}
          id={`dashboard-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`dashboard-tab-${tab.id}`}
          hidden={active !== tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          className="dashboard-tabpanel"
        >
          {panels[tab.id]}
        </div>
      ))}
    </section>
  );
}

export default DashboardTabs;

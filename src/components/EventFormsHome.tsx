import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EventRequestForm } from "./EventRequestForm";
import { ProspectInvitationForm } from "./ProspectInvitationForm";
import { SpecialCompanyEventsForm } from "./SpecialCompanyEventsForm";

type EventFormTab = "special" | "request" | "prospect";

type TabItem = {
  key: EventFormTab;
  label: string;
};

const activeTabStorageKey = "eventForms.activeTab";
const tabs: TabItem[] = [
  { key: "special", label: "Special Company Events" },
  { key: "request", label: "Event Request" },
  { key: "prospect", label: "Prospect Invitation" },
];

const isEventFormTab = (value: string | null): value is EventFormTab =>
  value === "special" || value === "request" || value === "prospect";

const getInitialTab = (queryTab: string | null): EventFormTab => {
  if (isEventFormTab(queryTab)) return queryTab;

  const saved = localStorage.getItem(activeTabStorageKey);
  if (isEventFormTab(saved)) return saved;

  return "request";
};

type EventFormsTabsProps = {
  activeTab: EventFormTab;
  onChange: (tab: EventFormTab) => void;
};

function EventFormsTabs({ activeTab, onChange }: EventFormsTabsProps) {
  return (
    <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-3 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.key ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EventFormsHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<EventFormTab>(() => getInitialTab(searchParams.get("tab")));

  const setTab = (tab: EventFormTab) => {
    setActiveTab(tab);
    localStorage.setItem(activeTabStorageKey, tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  };

  return (
    <div className="event-forms-page min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="event-forms-shell max-w-[1440px] mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Event Forms</h1>
            <p className="text-gray-600 mt-1">Choose a form to get started with your event requests.</p>
          </div>

          <EventFormsTabs activeTab={activeTab} onChange={setTab} />

          <div className="space-y-5">
            <div className={activeTab === "special" ? "block" : "hidden"}>
              <SpecialCompanyEventsForm
                embedded
                showBackButton={false}
                showToolbar={false}
                showPrintRoot={activeTab === "special"}
              />
            </div>
            <div className={activeTab === "request" ? "block" : "hidden"}>
              <EventRequestForm
                embedded
                showBackButton={false}
                showToolbar={false}
                showPrintRoot={activeTab === "request"}
              />
            </div>
            <div className={activeTab === "prospect" ? "block" : "hidden"}>
              <ProspectInvitationForm
                embedded
                showBackButton={false}
                showToolbar={false}
                showPrintRoot={activeTab === "prospect"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

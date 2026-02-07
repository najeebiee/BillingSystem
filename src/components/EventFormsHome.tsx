import React, { useRef, useState } from "react";
import { Download, Printer, Save, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { EventRequestForm } from "./EventRequestForm";
import { ProspectInvitationForm } from "./ProspectInvitationForm";
import { SpecialCompanyEventsForm } from "./SpecialCompanyEventsForm";

type EventFormTab = "special" | "request" | "prospect";

type FormActions = {
  save: () => void;
  load: () => void;
  clear: () => void;
  print: () => void;
};

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

type EventFormsToolbarProps = {
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onPrint: () => void;
};

function EventFormsToolbar({ onSave, onLoad, onClear, onPrint }: EventFormsToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2 pb-2 w-full md:w-auto md:shrink-0 flex-wrap md:flex-nowrap">
      <button onClick={onSave} className="toolbar-btn min-h-9">
        <Save className="form-btn__icon" />
        Save
      </button>
      <button onClick={onLoad} className="toolbar-btn min-h-9">
        <Download className="form-btn__icon" />
        Load
      </button>
      <button onClick={onClear} className="toolbar-btn min-h-9">
        <Trash2 className="form-btn__icon" />
        Clear
      </button>
      <button onClick={onPrint} className="toolbar-btn min-h-9">
        <Printer className="form-btn__icon" />
        Print
      </button>
    </div>
  );
}

export function EventFormsHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<EventFormTab>(() => getInitialTab(searchParams.get("tab")));
  const actionsRef = useRef<Partial<Record<EventFormTab, FormActions>>>({});

  const setTab = (tab: EventFormTab) => {
    setActiveTab(tab);
    localStorage.setItem(activeTabStorageKey, tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  };

  const runActive = (action: keyof FormActions) => {
    actionsRef.current[activeTab]?.[action]?.();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Event Forms</h1>
            <p className="text-gray-600 mt-1">Choose a form to get started with your event requests.</p>
          </div>

          <EventFormsTabs activeTab={activeTab} onChange={setTab} />

          <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:items-end md:justify-end mb-6">
            <EventFormsToolbar
              onSave={() => runActive("save")}
              onLoad={() => runActive("load")}
              onClear={() => runActive("clear")}
              onPrint={() => runActive("print")}
            />
          </div>

          <div className="space-y-5">
            <div className={activeTab === "special" ? "block" : "hidden"}>
              <SpecialCompanyEventsForm
                embedded
                showBackButton={false}
                showToolbar={false}
                onRegisterActions={(actions) => {
                  actionsRef.current.special = actions;
                }}
              />
            </div>
            <div className={activeTab === "request" ? "block" : "hidden"}>
              <EventRequestForm
                embedded
                showBackButton={false}
                showToolbar={false}
                onRegisterActions={(actions) => {
                  actionsRef.current.request = actions;
                }}
              />
            </div>
            <div className={activeTab === "prospect" ? "block" : "hidden"}>
              <ProspectInvitationForm
                embedded
                showBackButton={false}
                showToolbar={false}
                onRegisterActions={(actions) => {
                  actionsRef.current.prospect = actions;
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

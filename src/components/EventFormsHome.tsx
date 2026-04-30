import React, { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Printer, Save, Trash2 } from "lucide-react";
import { EventRequestForm } from "./EventRequestForm";
import { ProspectInvitationForm } from "./ProspectInvitationForm";
import { SpecialCompanyEventsForm } from "./SpecialCompanyEventsForm";

type EventFormTab = "special" | "request" | "prospect";

type FormActions = {
  save?: () => void;
  load?: () => void;
  clear?: () => void;
  print?: () => void;
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

export function EventFormsHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<EventFormTab>(() => getInitialTab(searchParams.get("tab")));
  const actionsRef = useRef<Record<EventFormTab, FormActions>>({
    special: {},
    request: {},
    prospect: {},
  });

  const setTab = (tab: EventFormTab) => {
    setActiveTab(tab);
    localStorage.setItem(activeTabStorageKey, tab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  };

  const registerSpecialActions = useCallback((actions: FormActions) => {
    actionsRef.current.special = actions;
  }, []);

  const registerRequestActions = useCallback((actions: FormActions) => {
    actionsRef.current.request = actions;
  }, []);

  const registerProspectActions = useCallback((actions: FormActions) => {
    actionsRef.current.prospect = actions;
  }, []);

  const runAction = (key: keyof FormActions) => {
    const actions = actionsRef.current[activeTab];
    actions?.[key]?.();
  };

  return (
    <div className="event-forms-page w-full bg-gray-50 pt-16">
      <div className="w-full max-w-6xl mx-auto px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold">Event Forms</h1>
          <p className="mt-2 text-gray-500">Choose a form to get started with your event requests.</p>
        </div>

        <div className="mt-6 border-b">
          <div className="flex flex-wrap gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {activeTab === tab.key ? (
                  <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-blue-600" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {activeTab === "special" ? (
            <SpecialCompanyEventsForm
              embedded
              showBackButton={false}
              showToolbar={false}
              showPrintRoot={activeTab === "special"}
              showActions={false}
              onRegisterActions={registerSpecialActions}
            />
          ) : null}
          {activeTab === "request" ? (
            <EventRequestForm
              embedded
              showBackButton={false}
              showToolbar={false}
              showPrintRoot={activeTab === "request"}
              showActions={false}
              onRegisterActions={registerRequestActions}
            />
          ) : null}
          {activeTab === "prospect" ? (
            <ProspectInvitationForm
              embedded
              showBackButton={false}
              showToolbar={false}
              showPrintRoot={activeTab === "prospect"}
              showActions={false}
              onRegisterActions={registerProspectActions}
            />
          ) : null}
        </div>

        <div className="mt-8 border-t bg-white pt-4 no-print">
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => runAction("save")}
              aria-label="Save active form"
              className="bg-black text-white border border-black hover:bg-gray-900 active:bg-black px-4 py-2 rounded-md inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4 text-white" />
              Save
            </button>
            <button
              type="button"
              onClick={() => runAction("load")}
              aria-label="Load active form"
              className="bg-black text-white border border-black hover:bg-gray-900 active:bg-black px-4 py-2 rounded-md inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4 text-white" />
              Load
            </button>
            <button
              type="button"
              onClick={() => runAction("clear")}
              aria-label="Clear active form"
              className="bg-black text-white border border-black hover:bg-gray-900 active:bg-black px-4 py-2 rounded-md inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4 text-white" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => runAction("print")}
              aria-label="Print active form"
              className="bg-black text-white border border-black hover:bg-gray-900 active:bg-black px-4 py-2 rounded-md inline-flex items-center gap-2"
            >
              <Printer className="h-4 w-4 text-white" />
              Print
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Disable Headers and Footers in the print dialog for best results.
          </p>
        </div>
      </div>
    </div>
  );
}

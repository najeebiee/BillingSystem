import React, { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Printer, Save, Trash2 } from "lucide-react";
import { EventRequestForm } from "./EventRequestForm";
import { ProspectInvitationForm } from "./ProspectInvitationForm";
import { SpecialCompanyEventsForm } from "./SpecialCompanyEventsForm";
import { FormActionButton } from "./ui/FormActionButton";

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
    <div className="event-forms-page min-h-screen bg-gray-50 pt-16">
      <div className="h-[calc(100vh-64px)] min-h-0">
        <div className="w-full max-w-6xl mx-auto px-4 h-full min-h-0 flex flex-col">
          <div className="shrink-0 sticky top-0 z-20 bg-white">
            <div className="py-4">
              <h1 className="text-2xl font-semibold text-gray-900">Event Forms</h1>
              <p className="text-sm text-gray-500">Choose a form to get started with your event requests.</p>

              <div className="mt-4 flex flex-wrap gap-6 border-b border-gray-200">
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
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pt-6 pb-24">
            <div className="space-y-5">
              <div className={activeTab === "special" ? "block" : "hidden"}>
                <SpecialCompanyEventsForm
                  embedded
                  showBackButton={false}
                  showToolbar={false}
                  showPrintRoot={activeTab === "special"}
                  showActions={false}
                  onRegisterActions={registerSpecialActions}
                />
              </div>
              <div className={activeTab === "request" ? "block" : "hidden"}>
                <EventRequestForm
                  embedded
                  showBackButton={false}
                  showToolbar={false}
                  showPrintRoot={activeTab === "request"}
                  showActions={false}
                  onRegisterActions={registerRequestActions}
                />
              </div>
              <div className={activeTab === "prospect" ? "block" : "hidden"}>
                <ProspectInvitationForm
                  embedded
                  showBackButton={false}
                  showToolbar={false}
                  showPrintRoot={activeTab === "prospect"}
                  showActions={false}
                  onRegisterActions={registerProspectActions}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 sticky bottom-0 z-20 bg-white border-t no-print">
            <div className="py-3">
              <div className="flex flex-wrap gap-2 justify-end">
                <FormActionButton onClick={() => runAction("save")} ariaLabel="Save active form">
                  <Save className="form-btn__icon" />
                  Save
                </FormActionButton>
                <FormActionButton onClick={() => runAction("load")} ariaLabel="Load active form">
                  <Download className="form-btn__icon" />
                  Load
                </FormActionButton>
                <FormActionButton onClick={() => runAction("clear")} ariaLabel="Clear active form">
                  <Trash2 className="form-btn__icon" />
                  Clear
                </FormActionButton>
                <FormActionButton onClick={() => runAction("print")} ariaLabel="Print active form">
                  <Printer className="form-btn__icon" />
                  Print
                </FormActionButton>
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">
                Disable Headers and Footers in the print dialog for best results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Printer, Save, Trash2 } from "lucide-react";
import { EventRequestForm } from "./EventRequestForm";
import { ProspectInvitationForm } from "./ProspectInvitationForm";
import { SpecialCompanyEventsForm } from "./SpecialCompanyEventsForm";
import "./EventFormsHome.css";

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
    <div className="event-forms-page">
      <div className="event-forms-container">
        <div className="event-forms-header">
          <div>
            <h1>Event Forms</h1>
            <p>Choose, complete, save, and print event request documents.</p>
          </div>

          <div className="event-forms-header-actions no-print">
            <button
              type="button"
              onClick={() => runAction("save")}
              aria-label="Save active form"
              className="event-forms-action-button event-forms-action-button--primary"
            >
              <Save className="event-forms-action-icon" />
              Save
            </button>
            <button
              type="button"
              onClick={() => runAction("load")}
              aria-label="Load active form"
              className="event-forms-action-button"
            >
              <Download className="event-forms-action-icon" />
              Load
            </button>
            <button
              type="button"
              onClick={() => runAction("clear")}
              aria-label="Clear active form"
              className="event-forms-action-button"
            >
              <Trash2 className="event-forms-action-icon" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => runAction("print")}
              aria-label="Print active form"
              className="event-forms-action-button"
            >
              <Printer className="event-forms-action-icon" />
              Print
            </button>
          </div>
        </div>

        <div className="event-forms-tabs">
          <div className="event-forms-tab-list">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`event-forms-tab ${activeTab === tab.key ? "event-forms-tab--active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="event-forms-content">
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

        <div className="event-forms-footer-actions no-print">
          <div className="event-forms-footer-buttons">
            <button
              type="button"
              onClick={() => runAction("save")}
              aria-label="Save active form"
              className="event-forms-action-button event-forms-action-button--primary"
            >
              <Save className="event-forms-action-icon" />
              Save
            </button>
            <button
              type="button"
              onClick={() => runAction("load")}
              aria-label="Load active form"
              className="event-forms-action-button"
            >
              <Download className="event-forms-action-icon" />
              Load
            </button>
            <button
              type="button"
              onClick={() => runAction("clear")}
              aria-label="Clear active form"
              className="event-forms-action-button"
            >
              <Trash2 className="event-forms-action-icon" />
              Clear
            </button>
            <button
              type="button"
              onClick={() => runAction("print")}
              aria-label="Print active form"
              className="event-forms-action-button"
            >
              <Printer className="event-forms-action-icon" />
              Print
            </button>
          </div>
          <p>
            Disable Headers and Footers in the print dialog for best results.
          </p>
        </div>
      </div>
    </div>
  );
}

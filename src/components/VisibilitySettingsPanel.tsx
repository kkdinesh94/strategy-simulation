import React, { useState, useEffect } from "react";
import { Eye, Save, Loader2 } from "lucide-react";

export interface VisibilitySettings {
  id?: string;
  game_id: string;
  reveal_brand_specs: number;
  reveal_sales_data: number;
  reveal_financials: number;
  reveal_rd_projects: number;
  competitive_benchmark_purchasable: number;
  updated_at?: string;
}

export interface VisibilitySettingsPanelProps {
  universeId: string;
  onNotify?: (msg: string) => void;
}

type FlagKey =
  | "reveal_brand_specs"
  | "reveal_sales_data"
  | "reveal_financials"
  | "reveal_rd_projects"
  | "competitive_benchmark_purchasable";

interface ToggleItem {
  key: FlagKey;
  label: string;
  description: string;
}

const TOGGLE_ITEMS: ToggleItem[] = [
  {
    key: "reveal_brand_specs",
    label: "Reveal Brand Specs",
    description: "Allow teams to see exact competitor component selections"
  },
  {
    key: "reveal_sales_data",
    label: "Reveal Sales Data",
    description: "Show actual competitor unit sales (not just demand)"
  },
  {
    key: "reveal_financials",
    label: "Reveal Financials",
    description: "Reveal competitor income statements and cash positions"
  },
  {
    key: "reveal_rd_projects",
    label: "Reveal R&D Projects",
    description: "Show which R&D projects competitors are currently funding"
  },
  {
    key: "competitive_benchmark_purchasable",
    label: "Competitive Benchmark Purchasable",
    description: "Allow teams to purchase Competitive Benchmark reports"
  }
];

export const VisibilitySettingsPanel: React.FC<VisibilitySettingsPanelProps> = ({
  universeId,
  onNotify
}) => {
  const [settings, setSettings] = useState<VisibilitySettings>({
    game_id: universeId,
    reveal_brand_specs: 0,
    reveal_sales_data: 0,
    reveal_financials: 0,
    reveal_rd_projects: 0,
    competitive_benchmark_purchasable: 1
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      if (!universeId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/visibility-settings?game_id=${encodeURIComponent(universeId)}`);
        if (!response.ok) {
          throw new Error("Failed to load visibility settings.");
        }
        const data = await response.json();
        if (isMounted && data.settings) {
          setSettings({
            game_id: universeId,
            reveal_brand_specs: Number(data.settings.reveal_brand_specs ?? 0),
            reveal_sales_data: Number(data.settings.reveal_sales_data ?? 0),
            reveal_financials: Number(data.settings.reveal_financials ?? 0),
            reveal_rd_projects: Number(data.settings.reveal_rd_projects ?? 0),
            competitive_benchmark_purchasable: Number(data.settings.competitive_benchmark_purchasable ?? 1)
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Error fetching visibility settings");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [universeId]);

  const handleToggle = (key: FlagKey) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === 1 ? 0 : 1
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        game_id: universeId,
        reveal_brand_specs: settings.reveal_brand_specs,
        reveal_sales_data: settings.reveal_sales_data,
        reveal_financials: settings.reveal_financials,
        reveal_rd_projects: settings.reveal_rd_projects,
        competitive_benchmark_purchasable: settings.competitive_benchmark_purchasable
      };

      const response = await fetch("/api/visibility-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save visibility settings.");
      }

      if (onNotify) {
        onNotify("Visibility settings saved.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mr-2" />
        <span className="text-sm font-medium text-gray-600">Loading visibility controls...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-start justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-600" />
            Instructor Visibility Controls
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Control what information is visible to competing teams.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {TOGGLE_ITEMS.map((item) => {
          const isChecked = settings[item.key] === 1;
          return (
            <div key={item.key} className="py-3.5 flex items-center justify-between gap-4">
              <div className="pr-4">
                <span className="text-sm font-medium text-gray-800 block">
                  {item.label}
                </span>
                <span className="text-xs text-gray-500 mt-0.5 block">
                  {item.description}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isChecked}
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isChecked ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isChecked ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default VisibilitySettingsPanel;

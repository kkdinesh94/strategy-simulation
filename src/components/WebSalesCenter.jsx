import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, CircleAlert, Globe, Users } from "lucide-react";
import { executeD1Query } from "../lib/cloudflareD1";

const DEFAULT_CONFIG = {
  monthlyCosts: {
    base: 2.5,
    onlineConfigurator: 1.5,
    orderTracking: 1,
    secureCheckout: 2,
    tollFreeSupport: 3,
    perStaff: 0.75
  },
  demand: {
    perStaff: 0.015,
    featureBoosts: {
      onlineConfigurator: 0.04,
      orderTracking: 0.03,
      secureCheckout: 0.02,
      tollFreeSupport: 0.025
    }
  }
};

const CAPABILITIES = [
  { key: "onlineConfigurator", label: "Online configurator", description: "Customers can spec their vehicle." },
  { key: "orderTracking", label: "Order tracking online", description: "Customers can follow order progress." },
  { key: "secureCheckout", label: "Secure checkout", description: "Customers can complete payment online." },
  { key: "tollFreeSupport", label: "Toll-free support", description: "Customers can reach the web sales team by phone." }
];

function mergeConfig(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      monthlyCosts: { ...DEFAULT_CONFIG.monthlyCosts, ...(parsed?.monthlyCosts || {}) },
      demand: {
        ...DEFAULT_CONFIG.demand,
        ...(parsed?.demand || {}),
        featureBoosts: { ...DEFAULT_CONFIG.demand.featureBoosts, ...(parsed?.demand?.featureBoosts || {}) }
      }
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function Toggle({ checked, disabled, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 accent-emerald-700"
    />
  );
}

export default function WebSalesCenter({ team, gameState, onNotify = undefined }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [decision, setDecision] = useState({
    is_active: 0,
    online_configurator: 0,
    order_tracking: 0,
    secure_checkout: 0,
    toll_free_support: 0,
    staff_count: 0,
    monthly_cost: 0
  });
  const isLocked = !!team?.dec?.locked;
  const teamId = String(team?.i ?? "");
  const quarter = gameState?.quarter ?? 1;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [settings, row] = await Promise.all([
        executeD1Query("SELECT value FROM app_settings WHERE key = ?", ["web_sales_center_config"]),
        executeD1Query(
          "SELECT is_active, online_configurator, order_tracking, secure_checkout, toll_free_support, staff_count, monthly_cost FROM web_sales_center WHERE team_id = ? AND quarter = ? LIMIT 1",
          [teamId, quarter]
        )
      ]);
      if (cancelled) return;
      const settingValue = settings.results?.[0]?.value;
      setConfig(mergeConfig(settingValue));
      const saved = row.results?.[0];
      if (saved) {
        setDecision({
          is_active: Number(saved.is_active) || 0,
          online_configurator: Number(saved.online_configurator) || 0,
          order_tracking: Number(saved.order_tracking) || 0,
          secure_checkout: Number(saved.secure_checkout) || 0,
          toll_free_support: Number(saved.toll_free_support) || 0,
          staff_count: Math.max(0, Number(saved.staff_count) || 0),
          monthly_cost: Number(saved.monthly_cost) || 0
        });
      }
      setSettingsLoaded(true);
    }
    if (teamId) load();
    return () => { cancelled = true; };
  }, [teamId, quarter]);

  const estimate = useMemo(() => {
    const staff = Math.max(0, Number(decision.staff_count) || 0);
    const featureCost = CAPABILITIES.reduce(
      (total, capability) => total + (decision[capability.key] ? Number(config.monthlyCosts[capability.key]) : 0),
      0
    );
    return decision.is_active
      ? Number(config.monthlyCosts.base) + featureCost + staff * Number(config.monthlyCosts.perStaff)
      : 0;
  }, [config, decision]);

  const demandBoost = useMemo(() => {
    const staffBoost = Math.max(0, Number(decision.staff_count) || 0) * Number(config.demand.perStaff);
    const featureBoost = CAPABILITIES.reduce(
      (total, capability) => total + (decision[capability.key] ? Number(config.demand.featureBoosts[capability.key]) : 0),
      0
    );
    return decision.is_active ? staffBoost + featureBoost : 0;
  }, [config, decision]);

  const updateDecision = async (changes) => {
    if (isLocked) return;
    const next = { ...decision, ...changes };
    if (changes.is_active === 0) next.staff_count = 0;
    const nextFeatureCost = CAPABILITIES.reduce(
      (total, capability) => total + (next[capability.key] ? Number(config.monthlyCosts[capability.key]) : 0),
      0
    );
    next.monthly_cost = next.is_active
      ? Number(config.monthlyCosts.base) + nextFeatureCost + next.staff_count * Number(config.monthlyCosts.perStaff)
      : 0;
    setDecision(next);
    const result = await executeD1Query(
      `INSERT INTO web_sales_center (wsc_id, team_id, quarter, is_active, online_configurator, order_tracking, secure_checkout, toll_free_support, staff_count, monthly_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(wsc_id) DO UPDATE SET is_active = excluded.is_active, online_configurator = excluded.online_configurator, order_tracking = excluded.order_tracking, secure_checkout = excluded.secure_checkout, toll_free_support = excluded.toll_free_support, staff_count = excluded.staff_count, monthly_cost = excluded.monthly_cost`,
      [`${teamId}-${quarter}`, teamId, quarter, next.is_active, next.online_configurator, next.order_tracking, next.secure_checkout, next.toll_free_support, next.staff_count, next.monthly_cost]
    );
    if (!result.success) onNotify?.("Web sales center could not be saved to D1.");
  };

  if (!settingsLoaded) return null;

  const buyOnlineReady = !!decision.is_active && decision.staff_count >= 1;
  const orderTrackingReady = !!decision.order_tracking;

  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1D8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-[#1F2022]">Web Sales Center</h3>
          </div>
          <p className="mt-1 text-xs text-[#5A5C60]">Build the digital channel that supports online discovery, ordering, and service.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-[#1F2022]">
          <Toggle checked={!!decision.is_active} disabled={isLocked} onChange={(checked) => updateDecision({ is_active: checked ? 1 : 0 })} />
          Active
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {CAPABILITIES.map((capability) => (
          <label key={capability.key} className="flex items-start gap-3 rounded-xl border border-[#E5E1D8] bg-[#FAF8F5] p-3">
            <Toggle checked={!!decision[capability.key]} disabled={isLocked || !decision.is_active} onChange={(checked) => updateDecision({ [capability.key]: checked ? 1 : 0 })} />
            <span>
              <span className="block text-xs font-bold text-[#1F2022]">{capability.label}</span>
              <span className="block pt-1 text-[11px] text-[#5A5C60]">{capability.description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-[#E5E1D8] p-3">
        <Users className="w-5 h-5 text-emerald-700" />
        <label className="flex flex-1 items-center justify-between gap-3 text-xs font-bold text-[#1F2022]">
          Support staff
          <input type="number" min="0" max="60" value={decision.staff_count} disabled={isLocked || !decision.is_active} onChange={(event) => updateDecision({ staff_count: Math.max(0, Math.min(60, Math.round(Number(event.target.value) || 0))) })} className="w-20 rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] p-1.5 text-right" />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-4">
          <div className="text-[10px] font-bold uppercase text-emerald-800">Estimated monthly cost</div>
          <div className="pt-1 text-2xl font-bold font-mono text-emerald-700">Rs. {estimate.toFixed(2)} L</div>
          <div className="pt-1 text-[11px] text-emerald-800">Configured from D1 cost settings</div>
        </div>
        <div className="rounded-xl bg-sky-50 p-4">
          <div className="text-[10px] font-bold uppercase text-sky-800">Additional web demand</div>
          <div className="pt-1 text-2xl font-bold font-mono text-sky-700">+{(demandBoost * 100).toFixed(1)}%</div>
          <div className="pt-1 text-[11px] text-sky-800">Staff and active features combined</div>
        </div>
      </div>

      <div className="space-y-2 border-t border-[#E5E1D8] pt-4">
        <div className="text-xs font-bold uppercase text-[#5A5C60]">Advertising claim requirements</div>
        <div className="flex items-center gap-2 text-xs">
          {buyOnlineReady ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />}
          <span>"Buy online at our website" requires an active center with at least 1 staff.</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {orderTrackingReady ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-amber-600" />}
          <span>"Order tracking online" requires Order tracking enabled.</span>
        </div>
      </div>
    </section>
  );
}

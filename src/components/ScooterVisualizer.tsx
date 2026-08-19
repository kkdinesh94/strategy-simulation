import React from "react";
import { ScooterModel } from "../types/simulation";
import { fmtRs, CATALOG } from "../engine/catalog";
import { unitCost } from "../engine/simulationEngine";
import { Battery, Zap, Shield, Cpu, Gauge, Disc, Circle, Compass } from "lucide-react";

interface ScooterVisualizerProps {
  model: ScooterModel;
  color?: string;
  width?: number;
  showDetails?: boolean;
  activeCategory?: string; // Currently hovered or selected catalog category
}

export const ScooterVisualizer: React.FC<ScooterVisualizerProps> = ({
  model,
  color = "#C83E2B",
  width = 340,
  showDetails = true,
  activeCategory
}) => {
  const height = Math.round(width * 0.58);
  const build = model.cfg.build;
  const wheels = model.cfg.wheels;
  const batt = model.cfg.battery;
  const tech = model.cfg.tech;
  const pt = model.cfg.powertrain;
  const brk = model.cfg.brakes;
  const seat = model.cfg.seat;

  // Body primary color shade
  const bodyColor = color || "#C83E2B";
  const bodyDark = shadeColor(bodyColor, -25);
  const bodyAccent = shadeColor(bodyColor, 20);

  // Battery bar count
  const battBars = { BC1: 5, BC2: 4, BC3: 3, BC4: 2, BC5: 1 }[batt] || 3;
  const isDiskBrake = ["DISC", "ABS"].includes(brk);
  const isAlloy = wheels === "ALLOY";
  const isSmartTech = ["CT3", "CT4"].includes(tech);
  const cost = unitCost(model);

  // SVG Coordinates
  const cx1 = width * 0.22; // Rear Wheel Center
  const cx2 = width * 0.82; // Front Wheel Center
  const cy = height * 0.74;  // Ground / Axle Line
  const wheelR = width * 0.11;

  // Helper to check if a component area is highlighted
  const isHighlighted = (catName: string) => activeCategory === catName;

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* 2D EV Scooter Canvas Card */}
      <div className="relative w-full bg-[#FAF8F5] p-4 rounded-xl border border-[#E5E1D8] shadow-inner flex flex-col items-center justify-center overflow-hidden">
        {/* Category Highlight Indicator Pill */}
        {activeCategory && (
          <div className="absolute top-2 left-2 z-10 px-2.5 py-1 bg-[#1F2022] text-white text-[10px] font-mono rounded-md shadow-md flex items-center gap-1.5 animate-bounce">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C83E2B] animate-ping" />
            <span className="uppercase tracking-wider font-semibold">
              Focusing: {CATALOG[activeCategory]?.label || activeCategory}
            </span>
          </div>
        )}

        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          <defs>
            {/* Body Paint Gradient */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={bodyAccent} />
              <stop offset="60%" stopColor={bodyColor} />
              <stop offset="100%" stopColor={bodyDark} />
            </linearGradient>

            {/* Battery Glow */}
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Highlight Halo */}
            <filter id="highlightPulse" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.8" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ground Contact Shadow */}
          <ellipse
            cx={width * 0.52}
            cy={height * 0.94}
            rx={width * 0.44}
            ry={height * 0.04}
            fill="#1F2022"
            opacity="0.1"
          />

          {/* 1. REAR WHEEL & HUB MOTOR (Category: wheels / powertrain / brakes) */}
          <g className={`transition-all duration-300 ${isHighlighted("wheels") || isHighlighted("powertrain") || isHighlighted("brakes") ? "stroke-[#C83E2B]" : ""}`}>
            {/* Outer Tire */}
            <circle cx={cx1} cy={cy} r={wheelR} fill="#2C2D30" stroke="#1A1B1D" strokeWidth="2" />
            <circle cx={cx1} cy={cy} r={wheelR * 0.72} fill="#E5E1D8" stroke="#3A3C40" strokeWidth="1.5" />
            
            {/* Hub Motor / Rim spokes */}
            {isAlloy ? (
              <g>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
                  <line
                    key={ang}
                    x1={cx1}
                    y1={cy}
                    x2={cx1 + wheelR * 0.65 * Math.cos((ang * Math.PI) / 180)}
                    y2={cy + wheelR * 0.65 * Math.sin((ang * Math.PI) / 180)}
                    stroke="#1F2022"
                    strokeWidth="2.5"
                  />
                ))}
                <circle cx={cx1} cy={cy} r={wheelR * 0.3} fill="#1F2022" />
              </g>
            ) : (
              <circle cx={cx1} cy={cy} r={wheelR * 0.4} fill="#4A4C50" stroke="#1F2022" strokeWidth="1.5" />
            )}

            {/* Rear Disc Brake Caliper */}
            {isDiskBrake && (
              <circle cx={cx1 - wheelR * 0.2} cy={cy - wheelR * 0.2} r={wheelR * 0.25} fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
            )}

            {/* Rear Hub Motor Electric Badge */}
            <circle cx={cx1} cy={cy} r={wheelR * 0.18} fill="#C83E2B" />
          </g>

          {/* 2. FRONT WHEEL & TELESCOPIC FORK (Category: wheels / brakes) */}
          <g className={`transition-all duration-300 ${isHighlighted("wheels") || isHighlighted("brakes") ? "stroke-[#C83E2B]" : ""}`}>
            {/* Outer Tire */}
            <circle cx={cx2} cy={cy} r={wheelR} fill="#2C2D30" stroke="#1A1B1D" strokeWidth="2" />
            <circle cx={cx2} cy={cy} r={wheelR * 0.72} fill="#E5E1D8" stroke="#3A3C40" strokeWidth="1.5" />
            
            {/* Rim Alloys */}
            {isAlloy ? (
              <g>
                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => (
                  <line
                    key={ang}
                    x1={cx2}
                    y1={cy}
                    x2={cx2 + wheelR * 0.65 * Math.cos((ang * Math.PI) / 180)}
                    y2={cy + wheelR * 0.65 * Math.sin((ang * Math.PI) / 180)}
                    stroke="#1F2022"
                    strokeWidth="2.5"
                  />
                ))}
                <circle cx={cx2} cy={cy} r={wheelR * 0.3} fill="#1F2022" />
              </g>
            ) : (
              <circle cx={cx2} cy={cy} r={wheelR * 0.4} fill="#4A4C50" stroke="#1F2022" strokeWidth="1.5" />
            )}

            {/* Telescopic Front Suspension Fork */}
            <line x1={cx2} y1={cy} x2={width * 0.74} y2={height * 0.28} stroke="#5A5C60" strokeWidth="4.5" strokeLinecap="round" />
            <line x1={cx2 - 3} y1={cy - 12} x2={cx2 - 3} y2={cy - 30} stroke="#1F2022" strokeWidth="3" />

            {/* Front Mudguard Fender */}
            <path
              d={`M ${cx2 - wheelR * 1.05} ${cy - wheelR * 0.3} Q ${cx2} ${cy - wheelR * 1.35} ${cx2 + wheelR * 0.8} ${cy - wheelR * 0.2}`}
              fill="none"
              stroke={bodyColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {/* 3. EV STEP-THROUGH CHASSIS & FLOORBOARD (Category: build) */}
          <path
            d={`M ${width * 0.22} ${cy - wheelR * 0.5} 
               L ${width * 0.34} ${cy - wheelR * 0.5} 
               L ${width * 0.58} ${cy - wheelR * 0.5} 
               Q ${width * 0.68} ${cy - wheelR * 0.5} ${width * 0.72} ${height * 0.35}
               L ${width * 0.68} ${height * 0.32}
               Q ${width * 0.55} ${height * 0.52} ${width * 0.32} ${height * 0.52}
               Z`}
            fill={bodyColor}
            stroke="#1F2022"
            strokeWidth="2"
            className={isHighlighted("build") ? "filter-highlight" : ""}
          />

          {/* 4. MAIN FRONT APRON & HEADLIGHT BODY (Category: build / tech) */}
          <path
            d={`M ${width * 0.68} ${height * 0.52} 
               L ${width * 0.74} ${height * 0.28} 
               L ${width * 0.82} ${height * 0.35} 
               Q ${width * 0.84} ${height * 0.55} ${width * 0.76} ${cy - wheelR * 0.4}
               L ${width * 0.68} ${height * 0.52} Z`}
            fill="url(#bodyGrad)"
            stroke="#1F2022"
            strokeWidth="2"
          />

          {/* LED DRL Strip Headlight on Front Apron */}
          <path
            d={`M ${width * 0.78} ${height * 0.38} Q ${width * 0.82} ${height * 0.42} ${width * 0.80} ${height * 0.48}`}
            fill="none"
            stroke={isSmartTech ? "#0284C7" : "#F59E0B"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 5. BATTERY PACK COMPARTMENT & INDICATOR (Category: battery) */}
          <g className={`transition-all duration-300 ${isHighlighted("battery") ? "scale-105 origin-center" : ""}`}>
            {/* Under-deck Battery Compartment Housing */}
            <rect
              x={width * 0.38}
              y={cy - wheelR * 0.4}
              width={width * 0.22}
              height={height * 0.12}
              rx="4"
              fill="#1F2022"
              stroke={isHighlighted("battery") ? "#C83E2B" : "#3A3C40"}
              strokeWidth={isHighlighted("battery") ? "2.5" : "1.5"}
            />

            {/* Battery Cell LED Indicator Bars */}
            {Array.from({ length: 5 }).map((_, i) => (
              <rect
                key={i}
                x={width * 0.395 + i * (width * 0.04)}
                y={cy - wheelR * 0.32}
                width={width * 0.03}
                height={height * 0.06}
                rx="1.5"
                fill={i < battBars ? "#10B981" : "#4A4C50"}
                filter={i < battBars ? "url(#glowGreen)" : undefined}
              />
            ))}
          </g>

          {/* 6. HANDLEBARS & DIGITAL DASHBOARD DISPLAY (Category: tech) */}
          <g className={`transition-all duration-300 ${isHighlighted("tech") ? "scale-105 origin-center" : ""}`}>
            {/* Steering Stem Column */}
            <path
              d={`M ${width * 0.72} ${height * 0.32} L ${width * 0.70} ${height * 0.16}`}
              stroke="#2C2D30"
              strokeWidth="5"
              strokeLinecap="round"
            />

            {/* Curved Handlebar Grip */}
            <path
              d={`M ${width * 0.65} ${height * 0.16} L ${width * 0.74} ${height * 0.15}`}
              stroke="#1F2022"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Digital Console Display Screen */}
            <rect
              x={width * 0.68}
              y={height * 0.12}
              width={width * 0.07}
              height={height * 0.07}
              rx="2"
              fill={isSmartTech ? "#0284C7" : "#334155"}
              stroke="#1F2022"
              strokeWidth="1.5"
            />
            {isSmartTech && (
              <circle cx={width * 0.715} cy={height * 0.155} r={2} fill="#FFFFFF" className="animate-ping" />
            )}

            {/* Rear View Mirror */}
            <line x1={width * 0.71} y1={height * 0.15} x2={width * 0.73} y2={height * 0.07} stroke="#2C2D30" strokeWidth="2" />
            <ellipse cx={width * 0.73} cy={height * 0.06} rx="4" ry="2.5" fill="#3A3C40" stroke="#1F2022" />
          </g>

          {/* 7. SEAT CUSHION & REAR CARRIER (Category: seat / build) */}
          <g className={`transition-all duration-300 ${isHighlighted("seat") ? "scale-105 origin-center" : ""}`}>
            {/* Contoured Ergonomic Seat */}
            <path
              d={`M ${width * 0.28} ${height * 0.42} 
                 Q ${width * 0.38} ${height * 0.38} ${width * 0.54} ${height * 0.40} 
                 L ${width * 0.54} ${height * 0.48} 
                 Q ${width * 0.38} ${height * 0.48} ${width * 0.28} ${height * 0.48} Z`}
              fill={seat === "WIDE" ? "#1F2022" : "#3A3C40"}
              stroke="#111213"
              strokeWidth="1.5"
            />

            {/* Rear Passenger Grab Rail */}
            <path
              d={`M ${width * 0.22} ${height * 0.44} Q ${width * 0.26} ${height * 0.40} ${width * 0.30} ${height * 0.44}`}
              fill="none"
              stroke="#5A5C60"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* DYNAMIC CALLOUT HIGHLIGHT OVERLAY PIN */}
          {activeCategory && (
            <g className="animate-pulse">
              {activeCategory === "build" && (
                <circle cx={width * 0.5} cy={height * 0.48} r="12" fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
              )}
              {activeCategory === "battery" && (
                <circle cx={width * 0.48} cy={cy - wheelR * 0.35} r="14" fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
              )}
              {activeCategory === "powertrain" && (
                <circle cx={cx1} cy={cy} r={wheelR * 1.1} fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
              )}
              {activeCategory === "wheels" && (
                <g>
                  <circle cx={cx1} cy={cy} r={wheelR * 1.1} fill="none" stroke="#C83E2B" strokeWidth="2" strokeDasharray="3 2" />
                  <circle cx={cx2} cy={cy} r={wheelR * 1.1} fill="none" stroke="#C83E2B" strokeWidth="2" strokeDasharray="3 2" />
                </g>
              )}
              {activeCategory === "brakes" && (
                <circle cx={cx2} cy={cy} r={wheelR * 1.1} fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
              )}
              {activeCategory === "tech" && (
                <circle cx={width * 0.715} cy={height * 0.155} r="12" fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
              )}
              {activeCategory === "seat" && (
                <circle cx={width * 0.4} cy={height * 0.44} r="14" fill="none" stroke="#C83E2B" strokeWidth="2.5" strokeDasharray="3 2" />
              )}
            </g>
          )}
        </svg>

        {/* Dynamic Component Legend Callouts */}
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 w-full text-[10px] font-mono text-[#5A5C60] border-t border-[#E5E1D8] pt-2">
          <div className={`flex items-center gap-1 justify-center py-1 px-1.5 rounded transition ${isHighlighted("battery") ? "bg-[#C83E2B] text-white font-bold" : "bg-white border border-[#E0DCD3]"}`}>
            <Battery className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">{batt}</span>
          </div>
          <div className={`flex items-center gap-1 justify-center py-1 px-1.5 rounded transition ${isHighlighted("powertrain") ? "bg-[#C83E2B] text-white font-bold" : "bg-white border border-[#E0DCD3]"}`}>
            <Zap className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">{pt}</span>
          </div>
          <div className={`flex items-center gap-1 justify-center py-1 px-1.5 rounded transition ${isHighlighted("wheels") ? "bg-[#C83E2B] text-white font-bold" : "bg-white border border-[#E0DCD3]"}`}>
            <Circle className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">{wheels}</span>
          </div>
          <div className={`flex items-center gap-1 justify-center py-1 px-1.5 rounded transition ${isHighlighted("brakes") ? "bg-[#C83E2B] text-white font-bold" : "bg-white border border-[#E0DCD3]"}`}>
            <Disc className="w-3 h-3 text-red-600 shrink-0" />
            <span className="truncate">{brk}</span>
          </div>
          <div className={`flex items-center gap-1 justify-center py-1 px-1.5 rounded transition ${isHighlighted("tech") ? "bg-[#C83E2B] text-white font-bold" : "bg-white border border-[#E0DCD3]"}`}>
            <Gauge className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="truncate">{tech}</span>
          </div>
          <div className={`flex items-center gap-1 justify-center py-1 px-1.5 rounded transition ${isHighlighted("build") ? "bg-[#C83E2B] text-white font-bold" : "bg-white border border-[#E0DCD3]"}`}>
            <Shield className="w-3 h-3 text-stone-600 shrink-0" />
            <span className="truncate">{build}</span>
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <div className="font-semibold text-sm text-[#1F2022]">
            {model.name}
          </div>
          <div className="text-xs font-mono text-emerald-700 font-medium">
            BOM Cost: {fmtRs(cost)} | Retail Price: {fmtRs(model.price)}
          </div>
        </div>
      )}
    </div>
  );
};

function shadeColor(color: string, percent: number) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.round((R * (100 + percent)) / 100);
  G = Math.round((G * (100 + percent)) / 100);
  B = Math.round((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  R = R > 0 ? R : 0;
  G = G > 0 ? G : 0;
  B = B > 0 ? B : 0;

  const RR = R.toString(16).length === 1 ? "0" + R.toString(16) : R.toString(16);
  const GG = G.toString(16).length === 1 ? "0" + G.toString(16) : G.toString(16);
  const BB = B.toString(16).length === 1 ? "0" + B.toString(16) : B.toString(16);

  return "#" + RR + GG + BB;
}

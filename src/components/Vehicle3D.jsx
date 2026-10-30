import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Box, Layers, RotateCw, Maximize2 } from "lucide-react";

/**
 * Procedural 3D model of the scooter, built from the BOM configuration so every component
 * choice is visible: pack size and chemistry, motor size, wheel type, disc or drum per
 * wheel, mono or twin shocks, seat, body finish, dashboard tier. Units are metres.
 *
 * Each part carries the catalog category it belongs to, so clicking it (or its hotspot)
 * selects that category, and the exploded view pulls parts apart by category.
 */

// Hotspot anchor (assembled) and the offset it travels with in the exploded view.
const ANCHORS = {
  build: { at: [0.5, 0.72, 0.2], off: [0.25, 0.15, 0] },
  battery: { at: [0.12, 0.22, 0.14], off: [0, -0.02, 0.55] },
  powertrain: { at: [-0.66, 0.27, 0.06], off: [-0.3, 0, 0.42] },
  modes: { at: [0.47, 1.14, 0.26], off: [0, 0.15, 0] },
  tech: { at: [0.45, 1.19, 0], off: [0.05, 0.32, 0] },
  wheels: { at: [0.94, 0.2, 0], off: [0.35, 0, 0] },
  brakes: { at: [0.66, 0.36, 0.1], off: [0.35, 0, 0.22] },
  seat: { at: [-0.45, 0.85, 0], off: [0, 0.55, 0] },
  susp: { at: [0.62, 0.62, 0.09], off: [0.18, 0.08, 0] }
};

const VIEWS = {
  three: { pos: [2.3, 1.25, 2.5], target: [0, 0.58, 0] },
  side: { pos: [0, 0.7, 3.3], target: [0, 0.58, 0] },
  front: { pos: [3.2, 0.95, 0.35], target: [0, 0.62, 0] }
};

const ACCENT = new THREE.Color("#C83E2B");

class Helix extends THREE.Curve {
  constructor(radius, length, turns) {
    super();
    this.radius = radius;
    this.length = length;
    this.turns = turns;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(this.radius * Math.cos(a), t * this.length - this.length / 2, this.radius * Math.sin(a));
  }
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

function orientBetween(mesh, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function tube(a, b, r, mat, seg = 14) {
  const len = a.distanceTo(b);
  return orientBetween(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat), a, b);
}

function shock(a, b, springColor, springR = 0.028) {
  const g = new THREE.Group();
  const len = a.distanceTo(b);
  const inner = new THREE.Group();
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 12), new THREE.MeshStandardMaterial({ color: "#2a2b2e", metalness: 0.6, roughness: 0.4 })));
  const spring = new THREE.Mesh(
    new THREE.TubeGeometry(new Helix(springR, len * 0.72, 7), 120, 0.0055, 6, false),
    new THREE.MeshStandardMaterial({ color: springColor, metalness: 0.5, roughness: 0.35 })
  );
  inner.add(spring);
  orientBetween(inner, a, b);
  g.add(inner);
  return g;
}

function dashTexture(tech) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const x = c.getContext("2d");
  const lcd = tech === "CT1";
  x.fillStyle = lcd ? "#9fb39a" : "#0b1220";
  x.fillRect(0, 0, 256, 160);
  x.fillStyle = lcd ? "#26301f" : "#e8f1ff";
  x.font = "bold 64px Inter, Arial, sans-serif";
  x.textAlign = "center";
  x.fillText("42", lcd ? 128 : 84, 96);
  x.font = "18px Inter, Arial, sans-serif";
  x.fillText("km/h", lcd ? 128 : 84, 122);
  if (!lcd) {
    // battery bar
    x.fillStyle = "#1d2a3d";
    x.fillRect(20, 136, 216, 12);
    x.fillStyle = "#34d399";
    x.fillRect(20, 136, 150, 12);
    if (tech === "CT3" || tech === "CT4") {
      // navigation pane
      x.fillStyle = "#13233a";
      x.fillRect(150, 14, 96, 112);
      x.strokeStyle = "#3b82f6";
      x.lineWidth = 4;
      x.beginPath();
      x.moveTo(160, 116);
      x.lineTo(186, 80);
      x.lineTo(210, 86);
      x.lineTo(236, 30);
      x.stroke();
      x.fillStyle = "#f59e0b";
      x.beginPath();
      x.arc(236, 30, 6, 0, Math.PI * 2);
      x.fill();
    }
    if (tech === "CT4") {
      x.fillStyle = "#22c55e";
      x.font = "bold 13px Inter, Arial, sans-serif";
      x.textAlign = "left";
      x.fillText("4G  OTA", 18, 26);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildScooter(model, color) {
  const cfg = model.cfg;
  const add = model.add || {};
  const root = new THREE.Group();
  const parts = [];
  const put = (obj, cat, off = [0, 0, 0]) => {
    const g = obj.isGroup ? obj : new THREE.Group().add(obj);
    g.traverse((o) => {
      o.userData.cat = cat;
      if (o.isMesh) {
        // Own material per mesh: focus mode fades parts independently
        o.material = o.material.clone();
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.userData.cat = cat;
    g.userData.off = new THREE.Vector3(...off);
    g.userData.base = g.position.clone();
    root.add(g);
    parts.push(g);
    return g;
  };

  const finish = { BD1: { m: 0.65, r: 0.22, cc: 1 }, BD2: { m: 0.25, r: 0.32, cc: 0.6 }, BD3: { m: 0, r: 0.55, cc: 0 } }[cfg.build] || { m: 0.3, r: 0.3, cc: 0.5 };
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: finish.m, roughness: finish.r, clearcoat: finish.cc, clearcoatRoughness: 0.15 });
  const black = new THREE.MeshStandardMaterial({ color: "#1d1e21", roughness: 0.75 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.92 });
  const steel = new THREE.MeshStandardMaterial({ color: "#9a9ea5", metalness: 0.85, roughness: 0.35 });
  const alloy = new THREE.MeshStandardMaterial({ color: "#c3c7cc", metalness: 1, roughness: 0.22 });

  const RW = v(-0.66, 0.27, 0);
  const FW = v(0.72, 0.27, 0);

  // ---------- Body (build) ----------
  const extrude = (shape, depth, mat, bevel = 0.03) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 28 });
    geo.translate(0, 0, -depth / 2);
    return new THREE.Mesh(geo, mat);
  };

  const rear = new THREE.Shape();
  rear.moveTo(-0.1, 0.37);
  rear.lineTo(-0.36, 0.37);
  rear.quadraticCurveTo(-0.44, 0.6, -0.62, 0.62);
  rear.lineTo(-0.88, 0.6);
  rear.quadraticCurveTo(-0.98, 0.67, -0.9, 0.76);
  rear.lineTo(-0.16, 0.77);
  rear.quadraticCurveTo(-0.05, 0.7, -0.1, 0.37);
  put(extrude(rear, cfg.build === "BD3" ? 0.24 : 0.28, paint), "build", [0, 0.28, 0]);

  const floor = new THREE.Group();
  floor.add(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.05, 0.36, 3, 0.015), paint).translateX(0.12).translateY(0.355));
  floor.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.008, 0.3), black).translateX(0.12).translateY(0.383));
  put(floor, "build", [0, 0.12, 0]);

  const apron = new THREE.Shape();
  apron.moveTo(0.3, 0.36);
  apron.lineTo(0.44, 0.36);
  apron.quadraticCurveTo(0.62, 0.62, 0.57, 1.0);
  apron.lineTo(0.45, 1.03);
  apron.quadraticCurveTo(0.42, 0.62, 0.3, 0.36);
  const apronGroup = new THREE.Group();
  apronGroup.add(extrude(apron, 0.34, paint, 0.035));
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 24, 16),
    new THREE.MeshStandardMaterial({ color: "#fff7e0", emissive: ["CT3", "CT4"].includes(cfg.tech) ? "#cfe6ff" : "#ffd27a", emissiveIntensity: 1.4 })
  );
  lamp.scale.set(0.5, 0.8, 1.6);
  lamp.position.set(0.6, 0.86, 0);
  apronGroup.add(lamp);
  put(apronGroup, "build", [0.25, 0.15, 0]);

  const fender = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.022, 10, 40, Math.PI * 0.55), paint);
  fender.scale.set(1, 1, 3.2);
  fender.position.copy(FW);
  fender.rotation.z = Math.PI * 0.18;
  put(fender, "build", [0.35, 0.12, 0]);

  const tail = new THREE.Group();
  const tl = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.05, 0.2, 2, 0.012), new THREE.MeshStandardMaterial({ color: "#7a0d0d", emissive: "#ff2a2a", emissiveIntensity: 0.9 }));
  tl.position.set(-0.955, 0.69, 0);
  tail.add(tl);
  tail.add(tube(v(-0.78, 0.8, -0.13), v(-0.94, 0.8, -0.13), 0.011, steel));
  tail.add(tube(v(-0.78, 0.8, 0.13), v(-0.94, 0.8, 0.13), 0.011, steel));
  tail.add(tube(v(-0.94, 0.8, -0.13), v(-0.94, 0.8, 0.13), 0.011, steel));
  put(tail, "build", [-0.2, 0.3, 0]);

  if (add.colors) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.005), new THREE.MeshStandardMaterial({ color: "#f5f1e8", roughness: 0.4 }));
    const s2 = stripe.clone();
    stripe.position.set(-0.5, 0.66, 0.172);
    s2.position.set(-0.5, 0.66, -0.172);
    put(new THREE.Group().add(stripe, s2), "build", [0, 0.28, 0]);
  }

  // Handlebar, headset, mirrors (part of the body shell)
  const bars = new THREE.Group();
  bars.add(tube(v(0.48, 1.13, -0.34), v(0.48, 1.13, 0.34), 0.013, steel));
  bars.add(tube(v(0.48, 1.13, -0.36), v(0.48, 1.13, -0.27), 0.019, rubber));
  bars.add(tube(v(0.48, 1.13, 0.27), v(0.48, 1.13, 0.36), 0.019, rubber));
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.09, 0.26, 3, 0.03), paint);
  head.position.set(0.5, 1.1, 0);
  bars.add(head);
  for (const z of [-0.22, 0.22]) {
    bars.add(tube(v(0.48, 1.14, z), v(0.45, 1.3, z * 1.2), 0.006, black));
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), black);
    mirror.scale.set(0.35, 0.6, 1);
    mirror.position.set(0.45, 1.32, z * 1.2);
    bars.add(mirror);
  }
  put(bars, "build", [0, 0.15, 0]);

  // ---------- Dashboard (tech) ----------
  const dashSize = { CT1: [0.1, 0.055], CT2: [0.13, 0.08], CT3: [0.16, 0.1], CT4: [0.2, 0.12] }[cfg.tech] || [0.13, 0.08];
  const dash = new THREE.Group();
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.025, dashSize[1] + 0.02, dashSize[0] + 0.02, 2, 0.008), black);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(dashSize[0], dashSize[1]),
    new THREE.MeshStandardMaterial({ map: dashTexture(cfg.tech), emissive: "#ffffff", emissiveMap: dashTexture(cfg.tech), emissiveIntensity: cfg.tech === "CT1" ? 0.25 : 0.85 })
  );
  screen.position.x = -0.0135;
  screen.rotation.y = -Math.PI / 2;
  dash.add(bezel, screen);
  dash.position.set(0.44, 1.18, 0);
  dash.rotation.z = -0.55;
  put(dash, "tech", ANCHORS.tech.off);

  // ---------- Riding-mode switchgear (modes) ----------
  const modeCount = { RM1: 1, RM2: 2, RM3: 3, RM4: 4 }[cfg.modes] || 1;
  const sw = new THREE.Group();
  const swBox = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.045, 0.05, 2, 0.01), black);
  swBox.position.set(0.48, 1.135, 0.245);
  sw.add(swBox);
  const modeColors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];
  for (let i = 0; i < modeCount; i += 1) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 10), new THREE.MeshStandardMaterial({ color: modeColors[i], emissive: modeColors[i], emissiveIntensity: 0.6 }));
    btn.rotation.z = Math.PI / 2;
    btn.position.set(0.454, 1.15 - (i % 2) * 0.016, 0.233 + Math.floor(i / 2) * 0.022);
    sw.add(btn);
  }
  put(sw, "modes", ANCHORS.modes.off);

  // ---------- Battery ----------
  const pack = { BC1: [0.52, 0.17], BC2: [0.48, 0.16], BC3: [0.44, 0.15], BC4: [0.42, 0.15], BC5: [0.34, 0.13] }[cfg.battery] || [0.44, 0.15];
  const lfp = ["BC4", "BC5"].includes(cfg.battery);
  const batt = new THREE.Group();
  const casing = new THREE.Mesh(
    new RoundedBoxGeometry(pack[0], pack[1], 0.26, 3, 0.02),
    new THREE.MeshStandardMaterial({ color: lfp ? "#36566d" : "#2f3237", metalness: 0.55, roughness: 0.4 })
  );
  casing.position.set(0.12, 0.33 - pack[1] / 2 - 0.005, 0);
  batt.add(casing);
  const hv = new THREE.Mesh(new THREE.BoxGeometry(pack[0] * 0.9, 0.018, 0.003), new THREE.MeshStandardMaterial({ color: "#f97316", emissive: "#f97316", emissiveIntensity: 0.25 }));
  hv.position.set(0.12, casing.position.y, 0.132);
  batt.add(hv);
  // Visible cell modules on the side face: one module per ~10 km of rated range
  const modules = Math.round(pack[0] / 0.065);
  for (let i = 0; i < modules; i += 1) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(pack[0] / modules - 0.012, pack[1] * 0.45, 0.004), new THREE.MeshStandardMaterial({ color: lfp ? "#7fb2d4" : "#c9a227", metalness: 0.4, roughness: 0.5 }));
    cell.position.set(0.12 - pack[0] / 2 + (i + 0.5) * (pack[0] / modules), casing.position.y - pack[1] * 0.12, 0.133);
    batt.add(cell);
  }
  if (add.removable) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 20, Math.PI), black);
    handle.rotation.y = Math.PI / 2;
    handle.position.set(0.12, 0.33, 0);
    batt.add(handle);
  }
  put(batt, "battery", ANCHORS.battery.off);

  // ---------- Powertrain: hub motor, controller, swingarm ----------
  const motorR = { PT1: 0.14, PT2: 0.13, PT3: 0.12, PT4: 0.1 }[cfg.powertrain] || 0.12;
  const pt = new THREE.Group();
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(motorR, motorR, 0.11, 32), new THREE.MeshStandardMaterial({ color: "#3a3d42", metalness: 0.7, roughness: 0.35 }));
  motor.rotation.x = Math.PI / 2;
  motor.position.copy(RW);
  pt.add(motor);
  if (["PT1", "PT2"].includes(cfg.powertrain)) {
    for (let i = -2; i <= 2; i += 1) {
      const fin = new THREE.Mesh(new THREE.TorusGeometry(motorR + 0.004, 0.004, 6, 32), steel);
      fin.position.set(RW.x, RW.y, i * 0.02);
      pt.add(fin);
    }
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.125, 16), new THREE.MeshStandardMaterial({ color: "#C83E2B", metalness: 0.5, roughness: 0.4 }));
  cap.rotation.x = Math.PI / 2;
  cap.position.copy(RW);
  pt.add(cap);
  pt.add(tube(v(-0.22, 0.31, 0.11), v(-0.66, 0.27, 0.11), 0.022, black));
  pt.add(tube(v(-0.22, 0.31, -0.11), v(-0.66, 0.27, -0.11), 0.022, black));
  const ctrl = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.06, 0.09, 2, 0.01), new THREE.MeshStandardMaterial({ color: "#4b5563", metalness: 0.7, roughness: 0.3 }));
  ctrl.position.set(-0.3, 0.33, 0);
  pt.add(ctrl);
  if (add.regen) {
    const regen = new THREE.Mesh(new THREE.TorusGeometry(motorR * 0.7, 0.006, 6, 32), new THREE.MeshStandardMaterial({ color: "#22c55e", emissive: "#22c55e", emissiveIntensity: 0.6 }));
    regen.position.set(RW.x, RW.y, 0.06);
    pt.add(regen);
  }
  put(pt, "powertrain", ANCHORS.powertrain.off);

  // ---------- Wheels ----------
  const wheel = (c) => {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.048, 18, 56), rubber);
    tire.position.copy(c);
    tire.scale.z = 1.2;
    g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.075, 48, 1, true), cfg.wheels === "ALLOY" ? alloy : steel);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(c);
    g.add(rim);
    if (cfg.wheels === "ALLOY") {
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), alloy);
        spoke.position.set(c.x + Math.cos(a) * 0.115, c.y + Math.sin(a) * 0.115, 0);
        spoke.rotation.z = a;
        g.add(spoke);
      }
    } else {
      for (let i = 0; i < 18; i += 1) {
        const a = (i / 18) * Math.PI * 2;
        const z = i % 2 ? 0.025 : -0.025;
        g.add(tube(v(c.x + Math.cos(a) * 0.04, c.y + Math.sin(a) * 0.04, z * 1.6), v(c.x + Math.cos(a + 0.4) * 0.198, c.y + Math.sin(a + 0.4) * 0.198, z * 0.4), 0.0028, steel, 6));
      }
    }
    return g;
  };
  put(wheel(RW), "wheels", [-0.3, 0, 0]);
  const front = wheel(FW);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16), steel);
  hub.rotation.x = Math.PI / 2;
  hub.position.copy(FW);
  front.add(hub);
  put(front, "wheels", [0.35, 0, 0]);

  // ---------- Brakes ----------
  const brake = (c, disc, z) => {
    const g = new THREE.Group();
    if (disc) {
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.005, 40), steel);
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(c.x, c.y, z);
      g.add(rotor);
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.007, 8), black);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(c.x + Math.cos(a) * 0.082, c.y + Math.sin(a) * 0.082, z);
        g.add(hole);
      }
      const caliper = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.035, 0.03, 2, 0.008), new THREE.MeshStandardMaterial({ color: "#b91c1c", metalness: 0.4, roughness: 0.35 }));
      caliper.position.set(c.x - 0.07, c.y + 0.07, z + 0.012);
      caliper.rotation.z = -0.8;
      g.add(caliper);
    } else {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 28), new THREE.MeshStandardMaterial({ color: "#6b7078", metalness: 0.6, roughness: 0.5 }));
      drum.rotation.x = Math.PI / 2;
      drum.position.set(c.x, c.y, z - 0.012);
      g.add(drum);
    }
    return g;
  };
  put(brake(FW, ["BR1", "BR2"].includes(cfg.brakes), 0.07), "brakes", [0.35, 0, 0.22]);
  put(brake(RW, cfg.brakes === "BR1", 0.075), "brakes", [-0.3, 0, 0.62]);

  // ---------- Seat ----------
  const seatW = cfg.seat === "WIDE" ? 0.32 : 0.26;
  const seat = new THREE.Group();
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.075, seatW, 4, 0.035), new THREE.MeshStandardMaterial({ color: "#232427", roughness: 0.82 }));
  cushion.position.set(-0.46, 0.82, 0);
  seat.add(cushion);
  if (cfg.seat === "WIDE") {
    const top = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.03, seatW - 0.04, 3, 0.012), new THREE.MeshStandardMaterial({ color: "#3a2f2a", roughness: 0.75 }));
    top.position.set(-0.32, 0.86, 0);
    seat.add(top);
  }
  put(seat, "seat", ANCHORS.seat.off);

  // ---------- Suspension ----------
  const forkR = { SUS1: 0.022, SUS2: 0.02, SUS3: 0.016 }[cfg.susp] || 0.02;
  const susp = new THREE.Group();
  for (const z of [-0.075, 0.075]) {
    susp.add(tube(v(0.52, 1.0, z), v(0.62, 0.62, z), forkR * 0.8, alloy));
    susp.add(tube(v(0.62, 0.62, z), v(0.72, 0.27, z), forkR * 1.25, black));
  }
  susp.add(tube(v(0.52, 1.0, -0.075), v(0.52, 1.0, 0.075), 0.02, black));
  put(susp, "susp", ANCHORS.susp.off);
  const springColor = { SUS1: "#dc2626", SUS2: "#d4a017", SUS3: "#8a8f96" }[cfg.susp] || "#8a8f96";
  if (cfg.susp === "SUS1") {
    put(shock(v(-0.5, 0.33, 0), v(-0.38, 0.55, 0), springColor, 0.032), "susp", [0, 0.1, -0.25]);
  } else if (cfg.susp === "SUS2") {
    put(shock(v(-0.64, 0.3, 0.15), v(-0.76, 0.62, 0.15), springColor), "susp", [0, 0.1, 0.25]);
    put(shock(v(-0.64, 0.3, -0.15), v(-0.76, 0.62, -0.15), springColor), "susp", [0, 0.1, -0.25]);
  } else {
    put(shock(v(-0.64, 0.3, 0.15), v(-0.74, 0.6, 0.15), springColor, 0.022), "susp", [0, 0.1, 0.25]);
  }

  // ---------- Accessories ----------
  if (add.backrest) {
    const br = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.16, 0.22, 3, 0.02), new THREE.MeshStandardMaterial({ color: "#232427", roughness: 0.8 }));
    br.position.set(-0.86, 0.92, 0);
    br.rotation.z = 0.25;
    put(br, "seat", [-0.1, 0.55, 0]);
  }
  if (add.boot) {
    const boot = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.13, 0.22, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: "#f59e0b", transparent: true, opacity: 0.35, roughness: 0.6 })
    );
    boot.position.set(-0.45, 0.69, 0);
    put(boot, "build", [0, 0.42, 0.45]);
  }
  if (add.sidestand) {
    put(tube(v(-0.1, 0.3, -0.16), v(-0.2, 0.02, -0.28), 0.01, steel), "build", [0, 0, -0.1]);
  }

  return { root, parts };
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        if (m.emissiveMap) m.emissiveMap.dispose();
        m.dispose();
      });
    }
  });
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

export default function Vehicle3D({ model, color = "#C83E2B", activeCategory, onSelectCategory, labels = {}, categoryNames = {}, height = 400, fallback = null }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);
  const hotspotRefs = useRef({});
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(() => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [view, setView] = useState("three");
  const [failed, setFailed] = useState(() => !webglAvailable());
  const selectRef = useRef(onSelectCategory);
  selectRef.current = onSelectCategory;

  // One-time scene setup
  useEffect(() => {
    if (failed || !mountRef.current) return undefined;
    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    camera.position.set(...VIEWS.three.pos);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...VIEWS.three.target);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.3;
    controls.maxDistance = 5.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.autoRotateSpeed = 0.9;

    const sun = new THREE.DirectionalLight("#ffffff", 1.6);
    sun.position.set(1.8, 3.5, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -1.6;
    sun.shadow.camera.right = 1.6;
    sun.shadow.camera.top = 1.6;
    sun.shadow.camera.bottom = -1.6;
    sun.shadow.radius = 6;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight("#fffaf0", "#d9d2c4", 0.5));

    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.27, 96), new THREE.MeshBasicMaterial({ color: "#cfc7b8", transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    const st = {
      renderer,
      scene,
      camera,
      controls,
      scooter: null,
      parts: [],
      explodeT: 0,
      explodeTarget: 0,
      focus: null,
      camGoal: null,
      raf: 0,
      envTex,
      pmrem,
      pointerDown: null
    };
    stateRef.current = st;

    controls.addEventListener("start", () => {
      st.camGoal = null;
    });

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (ev) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = st.scooter ? raycaster.intersectObject(st.scooter, true) : [];
      const hit = hits.find((h) => h.object.visible && (!h.object.material.transparent || h.object.material.opacity > 0.3));
      return hit?.object.userData.cat || null;
    };
    const onDown = (ev) => {
      st.pointerDown = { x: ev.clientX, y: ev.clientY };
    };
    const onUp = (ev) => {
      const d = st.pointerDown;
      st.pointerDown = null;
      if (!d || Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 5) return;
      const cat = pick(ev);
      if (cat && ANCHORS[cat]) selectRef.current?.(cat);
    };
    const onMove = (ev) => {
      if (st.pointerDown) return;
      renderer.domElement.style.cursor = pick(ev) ? "pointer" : "grab";
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);

    const tmp = new THREE.Vector3();
    const clock = new THREE.Clock();
    const tick = () => {
      st.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());
      st.explodeT += (st.explodeTarget - st.explodeT) * Math.min(1, dt * 6);
      const e = st.explodeT * st.explodeT * (3 - 2 * st.explodeT);
      for (const p of st.parts) p.position.copy(p.userData.base).addScaledVector(p.userData.off, e);

      // Ghost the parts that are not in focus
      const pulse = 0.25 + 0.15 * Math.sin(clock.elapsedTime * 3);
      for (const p of st.parts) {
        const focused = !st.focus || p.userData.cat === st.focus;
        p.traverse((o) => {
          if (!o.isMesh) return;
          const m = o.material;
          if (m.userData.baseOpacity === undefined) {
            m.userData.baseOpacity = m.opacity;
            m.userData.baseTransparent = m.transparent;
            m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
            m.userData.baseEmissiveIntensity = m.emissiveIntensity;
          }
          const goal = focused ? m.userData.baseOpacity : 0.12;
          m.opacity += (goal - m.opacity) * Math.min(1, dt * 8);
          m.transparent = m.userData.baseTransparent || m.opacity < 0.99;
          m.depthWrite = !m.transparent || m.opacity > 0.9;
          if (m.emissive && st.focus && p.userData.cat === st.focus && !m.userData.baseEmissive?.getHex()) {
            m.emissive.copy(ACCENT);
            m.emissiveIntensity = pulse;
          } else if (m.emissive && m.userData.baseEmissive) {
            m.emissive.copy(m.userData.baseEmissive);
            m.emissiveIntensity = m.userData.baseEmissiveIntensity;
          }
        });
      }

      if (st.camGoal) {
        camera.position.lerp(st.camGoal.pos, Math.min(1, dt * 4));
        controls.target.lerp(st.camGoal.target, Math.min(1, dt * 4));
        if (camera.position.distanceTo(st.camGoal.pos) < 0.01) st.camGoal = null;
      }
      controls.update();
      renderer.render(scene, camera);

      // Hotspots follow their component on screen
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      for (const [cat, a] of Object.entries(ANCHORS)) {
        const el = hotspotRefs.current[cat];
        if (!el) continue;
        tmp.set(a.at[0] + a.off[0] * e, a.at[1] + a.off[1] * e, a.at[2] + a.off[2] * e).project(camera);
        el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -50%)`;
        el.style.opacity = tmp.z < 1 ? "1" : "0";
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(st.raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      controls.dispose();
      if (st.scooter) disposeTree(st.scooter);
      disposeTree(scene);
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stateRef.current = null;
    };
  }, [failed]);

  // Rebuild the vehicle whenever the specification or paint changes
  const specKey = JSON.stringify([model?.cfg, model?.add, color]);
  useEffect(() => {
    const st = stateRef.current;
    if (!st || !model) return;
    if (st.scooter) {
      st.scene.remove(st.scooter);
      disposeTree(st.scooter);
    }
    const { root, parts } = buildScooter(model, color);
    st.scene.add(root);
    st.scooter = root;
    st.parts = parts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specKey, failed]);

  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    st.explodeTarget = exploded ? 1 : 0;
    // Pull the camera back while exploded so the separated parts stay in frame
    const base = VIEWS[viewRef.current];
    const target = new THREE.Vector3(...base.target);
    if (exploded) target.y += 0.12;
    const dist = new THREE.Vector3(...base.pos).distanceTo(new THREE.Vector3(...base.target)) * (exploded ? 1.35 : 1);
    const dir = st.camera.position.clone().sub(st.controls.target).normalize();
    st.camGoal = { pos: target.clone().addScaledVector(dir, dist), target };
  }, [exploded, failed]);

  useEffect(() => {
    if (stateRef.current) stateRef.current.controls.autoRotate = autoRotate;
  }, [autoRotate, failed]);

  useEffect(() => {
    const st = stateRef.current;
    if (st) st.focus = activeCategory && ANCHORS[activeCategory] ? activeCategory : null;
  }, [activeCategory, failed]);

  const goView = (key) => {
    setView(key);
    const st = stateRef.current;
    if (!st) return;
    const target = new THREE.Vector3(...VIEWS[key].target);
    const pos = new THREE.Vector3(...VIEWS[key].pos);
    if (exploded) {
      target.y += 0.12;
      pos.sub(new THREE.Vector3(...VIEWS[key].target)).multiplyScalar(1.35).add(target);
    }
    st.camGoal = { pos, target };
  };

  if (failed) return fallback;

  const btn = (on) =>
    `px-2 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${on ? "bg-[#1F2022] text-white" : "text-[#3F4145] hover:bg-white"}`;

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height, background: "radial-gradient(ellipse at 50% 35%, #FFFFFF 0%, #F4F0E8 55%, #E9E3D7 100%)" }}>
      <div ref={mountRef} className="absolute inset-0" aria-label={`3D model of ${model?.name || "the scooter"}. Drag to rotate, scroll to zoom, select a component to edit it.`} role="img" />

      {/* Component hotspots */}
      <div className="absolute inset-0 pointer-events-none">
        {(Object.keys(categoryNames).length ? Object.keys(categoryNames) : Object.keys(ANCHORS)).filter((cat) => ANCHORS[cat]).map((cat, idx) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              ref={(el) => {
                hotspotRefs.current[cat] = el;
              }}
              type="button"
              onClick={() => onSelectCategory?.(cat)}
              className="absolute left-0 top-0 pointer-events-auto group flex items-center gap-1"
              style={{ transition: "opacity 150ms" }}
              aria-label={`${categoryNames[cat] || cat}: ${labels[cat] || ""}`}
              aria-pressed={active}
            >
              <span
                className={`w-5 h-5 rounded-full text-[10px] font-bold grid place-items-center shadow-md border-2 transition ${
                  active ? "bg-[#C83E2B] text-white border-white scale-125" : "bg-white/95 text-[#1F2022] border-[#C83E2B] group-hover:scale-110"
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm transition ${
                  active || exploded ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                } ${active ? "bg-[#1F2022] text-white" : "bg-white/95 text-[#1F2022]"}`}
              >
                {categoryNames[cat] || cat}
                {labels[cat] && <span className={`ml-1 font-normal ${active ? "text-white/70" : "text-[#6C6D70]"}`}>{labels[cat]}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Studio toolbar */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F3F0EA]/90 backdrop-blur border border-[#E5E1D8] shadow-sm">
        <button type="button" className={btn(!exploded)} onClick={() => setExploded(false)} aria-pressed={!exploded}>
          <Box className="w-3.5 h-3.5" /> Assembled
        </button>
        <button type="button" className={btn(exploded)} onClick={() => setExploded(true)} aria-pressed={exploded}>
          <Layers className="w-3.5 h-3.5" /> Exploded
        </button>
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1 p-1 rounded-lg bg-[#F3F0EA]/90 backdrop-blur border border-[#E5E1D8] shadow-sm">
        {[
          ["three", "¾"],
          ["side", "Side"],
          ["front", "Front"]
        ].map(([key, label]) => (
          <button key={key} type="button" className={btn(view === key)} onClick={() => goView(key)}>
            {label}
          </button>
        ))}
        <button type="button" className={btn(autoRotate)} onClick={() => setAutoRotate((x) => !x)} title="Turntable" aria-pressed={autoRotate}>
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        {activeCategory && (
          <button type="button" className={btn(false)} onClick={() => onSelectCategory?.(undefined)} title="Show the whole vehicle">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

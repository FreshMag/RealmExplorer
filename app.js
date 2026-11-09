"use strict";

const config = window.REALM_CONFIG;

function notify(message) {
  const notice = document.createElement("div");
  notice.className = "notice";

  const text = document.createElement("span");
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Chiudi avviso");
  close.addEventListener("click", () => notice.remove());

  notice.append(text, close);
  document.getElementById("notices").append(notice);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') field += text[++i];
      else quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

// A sheet with Italian locale publishes decimals as "12,5".
function parsePercent(value) {
  const text = (value ?? "").trim().replace(",", ".");
  if (text === "") return NaN;
  const number = Number(text);
  return number >= 0 && number <= 100 ? number : NaN;
}

function readPins(sheetName, rows) {
  const header = (rows[0] ?? []).map((name) => name.trim().toLowerCase());
  const xColumn = header.indexOf("x");
  const yColumn = header.indexOf("y");
  const colorColumn = header.indexOf("color");
  if (xColumn < 0 || yColumn < 0 || colorColumn < 0) {
    notify(`Foglio "${sheetName}": servono le colonne x, y e color.`);
    return [];
  }

  const pins = [];
  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => cell.trim() === "")) return;
    const sheetRow = index + 2;

    const x = parsePercent(row[xColumn]);
    const y = parsePercent(row[yColumn]);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      notify(`Foglio "${sheetName}", riga ${sheetRow}: x e y devono essere numeri tra 0 e 100.`);
      return;
    }

    let color = (row[colorColumn] ?? "").trim();
    if (color !== "" && !CSS.supports("color", color)) {
      notify(`Foglio "${sheetName}", riga ${sheetRow}: colore "${color}" non riconosciuto.`);
      color = "";
    }
    pins.push({ x, y, color: color || config.defaultColor });
  });
  return pins;
}

async function fetchChecked(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`errore HTTP ${response.status}`);
  return response;
}

async function loadSheet(sheet, group, toLatLng) {
  try {
    const response = await fetchChecked(sheet.url, { cache: "no-store" });
    const rows = parseCsv(await response.text());
    for (const pin of readPins(sheet.name, rows)) {
      L.circleMarker(toLatLng(pin.x, pin.y), {
        radius: 7,
        color: "#fbf3e2",
        weight: 2,
        fillColor: pin.color,
        fillOpacity: 1,
        interactive: false,
      }).addTo(group);
    }
  } catch (error) {
    notify(`Foglio "${sheet.name}" non caricato: ${error.message}.`);
  }
}

function createCoordinateTool(toPercent, toLatLng) {
  const formatPercent = (value) => value.toFixed(2).replace(".", config.decimalSeparator);

  return L.Control.extend({
    options: { position: "topleft" },

    onAdd(map) {
      const container = L.DomUtil.create("div", "coord-tool leaflet-control");
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      container.innerHTML = `
        <button type="button" class="coord-toggle" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="6.5" />
            <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
          </svg>
          Coordinate
        </button>
        <div class="coord-panel" hidden>
          <p class="coord-hint">Clicca un punto della mappa</p>
          <div class="coord-result" hidden>
            <span class="coord-value"><b>x</b><span class="coord-x"></span></span>
            <span class="coord-value"><b>y</b><span class="coord-y"></span></span>
            <button type="button" class="coord-copy" title="Incolla nella colonna x: y finisce nella cella accanto">Copia</button>
          </div>
          <p class="coord-status" aria-live="polite"></p>
        </div>`;

      const find = (selector) => container.querySelector(selector);
      const toggle = find(".coord-toggle");
      const panel = find(".coord-panel");
      const hint = find(".coord-hint");
      const result = find(".coord-result");
      const status = find(".coord-status");
      let picked = null;
      let marker = null;

      const clearPick = () => {
        marker?.remove();
        marker = null;
        picked = null;
        hint.hidden = false;
        result.hidden = true;
        status.textContent = "";
      };

      const onMapClick = (event) => {
        const { x, y } = toPercent(event.latlng);
        if (x < 0 || x > 100 || y < 0 || y > 100) return;

        picked = { x: formatPercent(x), y: formatPercent(y) };
        find(".coord-x").textContent = picked.x;
        find(".coord-y").textContent = picked.y;
        hint.hidden = true;
        result.hidden = false;
        status.textContent = "";

        marker?.remove();
        marker = L.circleMarker(toLatLng(x, y), {
          radius: 9,
          color: "#fbf3e2",
          weight: 3,
          dashArray: "4 3",
          fill: false,
          interactive: false,
        }).addTo(map);
      };

      const setActive = (active) => {
        toggle.setAttribute("aria-pressed", String(active));
        panel.hidden = !active;
        map.getContainer().classList.toggle("is-picking", active);
        clearPick();
        if (active) {
          map.on("click", onMapClick);
          map.doubleClickZoom.disable();
        } else {
          map.off("click", onMapClick);
          map.doubleClickZoom.enable();
        }
      };

      toggle.addEventListener("click", () => {
        setActive(toggle.getAttribute("aria-pressed") !== "true");
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && toggle.getAttribute("aria-pressed") === "true") {
          setActive(false);
        }
      });

      find(".coord-copy").addEventListener("click", async () => {
        try {
          // The tab makes the two values land in adjacent sheet cells.
          await navigator.clipboard.writeText(`${picked.x}\t${picked.y}`);
          status.textContent = "Copiato: incolla nella colonna x";
        } catch {
          status.textContent = "Copia non riuscita: seleziona i valori a mano";
        }
      });

      return container;
    },
  });
}

async function main() {
  document.title = config.title;
  document.getElementById("title").textContent = config.title;

  const response = await fetchChecked("tiles/meta.json");
  const meta = await response.json();

  // One map unit is one pixel of the most zoomed-out tile level.
  const width = meta.width / 2 ** meta.maxZoom;
  const height = meta.height / 2 ** meta.maxZoom;
  const bounds = L.latLngBounds([-height, 0], [0, width]);
  const toLatLng = (x, y) => L.latLng((-y / 100) * height, (x / 100) * width);
  const toPercent = (latlng) => ({
    x: (latlng.lng / width) * 100,
    y: (-latlng.lat / height) * 100,
  });

  const zoomSnap = 0.25;
  const map = L.map("map", {
    crs: L.CRS.Simple,
    zoomSnap,
    zoomDelta: 0.5,
    wheelPxPerZoomLevel: 120,
    maxZoom: meta.maxZoom + 1,
    maxBounds: bounds.pad(0.02),
    maxBoundsViscosity: 1,
  });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

  const fitZoom = () => {
    const size = map.getSize();
    const zoom = Math.log2(Math.min(size.x / width, size.y / height));
    return Math.floor(zoom / zoomSnap) * zoomSnap;
  };
  map.setMinZoom(fitZoom());
  map.setView(bounds.getCenter(), map.getMinZoom(), { animate: false });
  map.on("resize", () => map.setMinZoom(fitZoom()));

  L.tileLayer("tiles/{z}/{x}_{y}.jpg", {
    tileSize: meta.tileSize,
    bounds,
    minZoom: -5,
    minNativeZoom: 0,
    maxNativeZoom: meta.maxZoom,
    maxZoom: meta.maxZoom + 1,
  }).addTo(map);

  map.addControl(new (createCoordinateTool(toPercent, toLatLng))());

  const overlays = {};
  const loads = config.sheets.map((sheet) => {
    const group = L.layerGroup().addTo(map);
    overlays[sheet.name] = group;
    return loadSheet(sheet, group, toLatLng);
  });
  if (config.sheets.length > 1) {
    L.control.layers(null, overlays, { collapsed: false }).addTo(map);
  }
  await Promise.all(loads);
}

main().catch((error) => notify(`Mappa non caricata: ${error.message}.`));

"use strict";

// Calendar of Harptos: twelve months of 30 days, split into three tendays,
// with five festival days between some months and Shieldmeet after
// Midsummer once every four years.
window.Harptos = (() => {
  const MONTHS = [
    { name: "Hammer", nick: "Profondo inverno" },
    { name: "Alturiak", nick: "L'artiglio dell'inverno" },
    { name: "Ches", nick: "L'artiglio dei tramonti" },
    { name: "Tarsakh", nick: "L'artiglio delle tempeste" },
    { name: "Mirtul", nick: "Il disgelo" },
    { name: "Kythorn", nick: "Il tempo dei fiori" },
    { name: "Flamerule", nick: "Il colmo dell'estate" },
    { name: "Eleasis", nick: "Il sole alto" },
    { name: "Eleint", nick: "Lo sfiorire" },
    { name: "Marpenoth", nick: "Il cadere delle foglie" },
    { name: "Uktar", nick: "La putrefazione" },
    { name: "Nightal", nick: "Il calare" },
  ];

  const FESTIVALS = [
    { after: 0, name: "Midwinter", text: "Festa di metà inverno. Nobili e sovrani rinnovano alleanze e giuramenti." },
    { after: 3, name: "Greengrass", text: "Si festeggia l'arrivo della primavera con fiori e i primi germogli." },
    { after: 6, name: "Midsummer", text: "Festa di metà estate: banchetti, musica e promesse d'amore." },
    { after: 6, name: "Shieldmeet", leap: true, text: "Cade solo una volta ogni quattro anni, il giorno dopo Midsummer. Tempo di patti, tornei e consigli." },
    { after: 8, name: "Highharvestide", text: "La festa del raccolto, prima delle provviste per l'inverno." },
    { after: 10, name: "Feast of the Moon", text: "Si onorano i defunti e si raccontano le gesta degli antenati." },
  ];

  // Keyed by month index, then day.
  const MARKERS = {
    2: { 19: "Equinozio di primavera" },
    5: { 20: "Solstizio d'estate" },
    8: { 21: "Equinozio d'autunno" },
    11: { 20: "Solstizio d'inverno" },
  };

  const ROMAN = ["I", "II", "III"];

  const isLeap = (year) => year == null || year % 4 === 0;

  function periods(year) {
    const list = [];
    MONTHS.forEach((month, index) => {
      list.push({ kind: "month", index, ...month });
      for (const festival of FESTIVALS) {
        if (festival.after === index && (!festival.leap || isLeap(year))) {
          list.push({ kind: "festival", ...festival });
        }
      }
    });
    return list;
  }

  const normalize = (text) => text.toLowerCase().replace(/\s+/g, " ").trim();

  // Accepts "8 Hammer", "8° di Hammer", "8 Hammer 1492 DR", "Midwinter",
  // "Midwinter, 1492". Returns null if the text is not a Harptos date.
  function parse(text) {
    const clean = normalize(text ?? "").replace(/[°º]/g, "");
    const match = clean.match(/^(?:(\d{1,2})\s+)?(?:(?:di|of)\s+)?(.+?)(?:,?\s+(\d+)(?:\s*dr)?)?$/);
    if (!match) return null;
    const day = match[1] ? Number(match[1]) : null;
    const name = match[2].replace(/,$/, "").trim();
    const year = match[3] ? Number(match[3]) : null;

    if (day != null) {
      const index = MONTHS.findIndex((month) => normalize(month.name) === name);
      if (index < 0 || day < 1 || day > 30) return null;
      return { kind: "month", name: MONTHS[index].name, index, day, year };
    }
    const festival = FESTIVALS.find((item) => normalize(item.name) === name);
    if (!festival || (festival.leap && !isLeap(year))) return null;
    return { kind: "festival", name: festival.name, day: null, year };
  }

  const samePeriod = (period, date) => date != null && period.kind === date.kind && period.name === date.name;

  function mount() {
    const $ = (id) => document.getElementById(id);
    const el = {
      today: $("calendar-today"),
      name: $("cal-name"),
      sub: $("cal-sub"),
      body: $("cal-body"),
      notes: $("cal-notes"),
      prev: $("cal-prev"),
      next: $("cal-next"),
      gotoToday: $("cal-goto-today"),
      year: $("cal-year"),
    };

    let current = null;
    let list = periods(null);
    let shown = 0;

    function renderToday(rawText) {
      el.today.replaceChildren();
      if (current) {
        const strong = document.createElement("b");
        strong.textContent = rawText;
        const period = list.find((item) => samePeriod(item, current));
        el.today.append("Oggi è ", strong, ` · ${period.nick ?? "giorno di festa"}`);
      } else if (rawText) {
        el.today.textContent = `La data "${rawText}" non è una data del calendario di Harptos: usa un formato come "8 Hammer" o "Midwinter".`;
      } else {
        el.today.textContent = "Data corrente non impostata.";
      }
    }

    function renderMonth(period) {
      const grid = document.createElement("div");
      grid.className = "cal-grid";
      const markers = MARKERS[period.index] ?? {};

      for (let tenday = 0; tenday < 3; tenday++) {
        const label = document.createElement("span");
        label.className = "cal-tenday";
        label.textContent = ROMAN[tenday];
        label.title = `Decade ${tenday + 1}`;
        grid.append(label);

        for (let i = 1; i <= 10; i++) {
          const day = tenday * 10 + i;
          const cell = document.createElement("span");
          cell.className = "cal-day";
          cell.textContent = day;
          if (markers[day]) {
            cell.classList.add("is-marked");
            cell.title = markers[day];
          }
          if (samePeriod(period, current) && current.day === day) {
            cell.classList.add("is-today");
            cell.setAttribute("aria-current", "date");
          }
          grid.append(cell);
        }
      }
      el.body.replaceChildren(grid);

      el.notes.replaceChildren(
        ...Object.entries(markers).map(([day, label]) => {
          const item = document.createElement("li");
          item.className = "is-marked";
          item.textContent = `${day} ${period.name} · ${label}`;
          return item;
        }),
      );
    }

    function renderFestival(period) {
      const card = document.createElement("div");
      card.className = "cal-festival";
      if (samePeriod(period, current)) card.classList.add("is-today");
      const text = document.createElement("p");
      text.textContent = period.text;
      card.append(text);
      if (samePeriod(period, current)) {
        const badge = document.createElement("p");
        badge.className = "cal-festival-today";
        badge.textContent = "Oggi";
        card.prepend(badge);
      }
      el.body.replaceChildren(card);
      el.notes.replaceChildren();
    }

    function render() {
      const period = list[shown];
      el.name.textContent = period.name;
      if (period.kind === "month") {
        el.sub.textContent = `${period.nick} · mese ${period.index + 1} di 12`;
        renderMonth(period);
      } else {
        const before = MONTHS[period.after].name;
        const after = MONTHS[(period.after + 1) % 12].name;
        el.sub.textContent = period.leap
          ? `Giorno di festa dopo Midsummer · ogni 4 anni`
          : `Giorno di festa tra ${before} e ${after}`;
        renderFestival(period);
      }

      el.gotoToday.hidden = current == null || samePeriod(period, current);

      el.year.querySelectorAll("button").forEach((button, index) => {
        button.setAttribute("aria-pressed", String(index === shown));
      });
    }

    function renderYear() {
      el.year.replaceChildren(
        ...list.map((period, index) => {
          const item = document.createElement("li");
          item.className = period.kind === "festival" ? "is-festival" : "";
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = period.name;
          if (samePeriod(period, current)) button.classList.add("is-today");
          button.addEventListener("click", () => {
            shown = index;
            render();
          });
          item.append(button);
          return item;
        }),
      );
    }

    const step = (delta) => {
      shown = (shown + delta + list.length) % list.length;
      render();
    };
    el.prev.addEventListener("click", () => step(-1));
    el.next.addEventListener("click", () => step(1));
    el.gotoToday.addEventListener("click", () => {
      shown = list.findIndex((period) => samePeriod(period, current));
      render();
    });

    function setCurrent(rawText) {
      current = parse(rawText);
      list = periods(current?.year ?? null);
      const index = list.findIndex((period) => samePeriod(period, current));
      shown = index >= 0 ? index : 0;
      renderToday(rawText);
      renderYear();
      render();
    }

    setCurrent(null);
    return { setCurrent };
  }

  return { parse, mount };
})();

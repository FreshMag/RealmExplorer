window.REALM_CONFIG = {
  title: "Realm Explorer",

  // Ogni foglio pubblicato come CSV è un elenco di luoghi con le colonne
  // x, y, color e (facoltativa) hidden. x e y sono percentuali (0-100) a
  // partire dall'angolo in alto a sinistra della mappa. color accetta nomi
  // inglesi (red, green) o codici come #ff8800. Se hidden è TRUE (casella di
  // controllo spuntata) il luogo non viene mostrato.
  //
  // Per aggiungere un foglio basta aggiungere una riga qui sotto: con più di
  // un foglio compare un pannello per mostrarli o nasconderli.
  sheets: [
    {
      name: "Luoghi",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqt8N4LTggCM7xuBbQPllZBjMw2UxB5_rkF0QJCh5J_sH1AI7S63CmlotCyOSCnIRXOgUB8D2MgItU/pub?output=csv",
    },
  ],

  // Foglio "config": colonne key e value. Chiavi riconosciute:
  //   current_date  data corrente mostrata in cima al sito, nel formato del
  //                 calendario di Harptos ("8 Hammer", "8 Hammer 1492 DR",
  //                 "Midwinter").
  settingsUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqt8N4LTggCM7xuBbQPllZBjMw2UxB5_rkF0QJCh5J_sH1AI7S63CmlotCyOSCnIRXOgUB8D2MgItU/pub?gid=1572366160&single=true&output=csv",

  // Foglio "registry" della Rubrica: colonne address e name.
  registryUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqt8N4LTggCM7xuBbQPllZBjMw2UxB5_rkF0QJCh5J_sH1AI7S63CmlotCyOSCnIRXOgUB8D2MgItU/pub?gid=215774232&single=true&output=csv",

  // Colore usato quando la cella color è vuota o non valida.
  defaultColor: "#c8102e",

  // Separatore decimale delle coordinate copiate dallo strumento. Deve
  // corrispondere alle impostazioni locali del foglio Google: "," per
  // l'Italia, "." per gli Stati Uniti.
  decimalSeparator: ",",
};

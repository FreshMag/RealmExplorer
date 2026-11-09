window.REALM_CONFIG = {
  title: "Realm Explorer",

  // Ogni foglio pubblicato come CSV è un elenco di luoghi con le colonne
  // x, y, color. x e y sono percentuali (0-100) a partire dall'angolo in alto
  // a sinistra della mappa. color accetta nomi inglesi (red, green) o codici
  // come #ff8800.
  //
  // Per aggiungere un foglio basta aggiungere una riga qui sotto: con più di
  // un foglio compare un pannello per mostrarli o nasconderli.
  sheets: [
    {
      name: "Luoghi",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRqt8N4LTggCM7xuBbQPllZBjMw2UxB5_rkF0QJCh5J_sH1AI7S63CmlotCyOSCnIRXOgUB8D2MgItU/pub?output=csv",
    },
  ],

  // Colore usato quando la cella color è vuota o non valida.
  defaultColor: "#c8102e",

  // Separatore decimale delle coordinate copiate dallo strumento. Deve
  // corrispondere alle impostazioni locali del foglio Google: "," per
  // l'Italia, "." per gli Stati Uniti.
  decimalSeparator: ",",
};

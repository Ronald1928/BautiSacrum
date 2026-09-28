const { db } = require("../dbConnection"); // conexión SQLite

function guardarBautismo(datos) {
  return new Promise((resolve, reject) => {
    const {
      nombreSuscribe,
      libroBautizo,
      folioBautizo,
      numeroArchivo,
      nombreBautizado,
      diaNacimiento,
      mesNacimiento,
      anoNacimiento,
      lugarNacimiento,
      nombrePadre,
      nombreMadre,
      libroNacimiento,
      folioNacimiento,
      archivoNacimiento,
      anoArchivo,
      oficialia,
      diaBautismo,
      mesBautismo,
      anoBautismo,
      padrino,
      madrina,
      ministroSacramento,
      notasMarginales,
      diaEmision,
      mesEmision,
      anoEmision,
      genero,
    } = datos;

    const query = `
  INSERT INTO certificados_bautismo (
    nombreSuscribe, libroBautizo, folioBautizo, numeroArchivo,
    nombreBautizado, diaNacimiento, mesNacimiento, anoNacimiento,
    lugarNacimiento, nombrePadre, nombreMadre,
    libroNacimiento, folioNacimiento, archivoNacimiento, anoArchivo,
    oficialia, diaBautismo, mesBautismo, anoBautismo,
    padrino, madrina, ministroSacramento, notasMarginales,
    diaEmision, mesEmision, anoEmision, genero
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    db.run(
      query,
      [
        nombreSuscribe,
        libroBautizo,
        folioBautizo,
        numeroArchivo,
        nombreBautizado,
        diaNacimiento,
        mesNacimiento,
        anoNacimiento,
        lugarNacimiento,
        nombrePadre,
        nombreMadre,
        libroNacimiento,
        folioNacimiento,
        archivoNacimiento,
        anoArchivo,
        oficialia,
        diaBautismo,
        mesBautismo,
        anoBautismo,
        padrino,
        madrina,
        ministroSacramento,
        notasMarginales,
        diaEmision,
        mesEmision,
        anoEmision,
        genero,
      ],
      function (err) {
        if (err) {
          if (
            err.code === "23505" ||
            err.message.includes("UNIQUE constraint failed")
          ) {
            return reject(
              new Error(
                "ID ya registrado: ya existe un certificado con ese Número de Archivo, Libro y Folio",
              ),
            );
          }
          return reject(err);
        }
        resolve(this.lastID); // devolvemos el ID autogenerado
      },
    );
  });
}

module.exports = { guardarBautismo };

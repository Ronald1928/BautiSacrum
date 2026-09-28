const { columns } = require("../schema");
const editableColumns = columns.filter((c) => c !== "id" && c !== "created_at");
const { db, provider } = require("../dbConnection"); // conexión SQLite
const { guardarBautismo } = require("../models/bautismoModel");
const generarPdf = require("../pdf/generarPdf");

// Ruta para vista previa (no guarda en BD)
async function vistaPreviaPdf(req, res) {
  try {
    const datos = req.body;
    // Verificación básica
    if (!datos || Object.keys(datos).length === 0) {
      console.error("❌ Vista previa: No se recibieron datos en el body");
      return res.status(400).json({ message: "No se recibieron datos" });
    }

    const pdfBuffer = await generarPdf(datos);

    if (!pdfBuffer) {
      console.error("❌ Vista previa: Generar PDF devolvió null o undefined");
      return res.status(500).json({ message: "No se pudo generar el PDF" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generando vista previa:", error);
    res.status(500).json({ message: "Error al generar vista previa" });
  }
}

// Función para guardar en base de datos
async function guardarBautismoBD(req, res) {
  try {
    const datos = req.body;

    const campos = Object.keys(datos);
    if (!campos.length || campos.some((c) => !editableColumns.includes(c)))
      return res.status(400).json({ message: "Campos no válidos" });
    const valores = Object.values(datos);

    const placeholders = campos.map(() => "?").join(", ");
    const sql = `INSERT INTO certificados_bautismo (${campos.join(", ")})
                 VALUES (${placeholders})`;

    db.run(sql, valores, function (err) {
      if (err) {
        console.error("❌ Error al guardar bautismo:", err.message);
        if (
          err.code === "23505" ||
          err.message.includes("UNIQUE constraint failed")
        ) {
          return res.status(400).json({ message: "ID ya registrado" });
        }
        return res
          .status(500)
          .json({ message: "Error al guardar en la base de datos" });
      }
      res.json({ message: "Bautismo guardado correctamente", id: this.lastID });
    });
  } catch (error) {
    console.error("❌ Error en guardarBautismo:", error);
    res.status(500).json({ message: "Error al guardar bautismo" });
  }
}

async function crearBautismoYGenerarPdf(req, res) {
  try {
    const datos = req.body;

    // Primero generamos el PDF. Así, un fallo de PDF no deja un registro duplicado.
    const pdfBuffer = await generarPdf(datos);

    if (!pdfBuffer) {
      throw new Error("No se generó el PDF");
    }

    // Solo guardamos en la base de datos cuando el PDF ya fue creado correctamente.
    const id = await guardarBautismo(datos);
    datos.id = id;

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error:", error);
    if (!res.headersSent) {
      // Detectamos error de ID repetido
      if (
        error.code === "23505" ||
        error.message.includes("ID ya registrado")
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error al procesar la solicitud" });
      }
    }
  }
}

// Buscar certificados por nombre
async function buscarCertificados(req, res) {
  try {
    const { nombre } = req.query;
    db.all(
      "SELECT * FROM certificados_bautismo WHERE nombreBautizado LIKE ?",
      [`%${nombre}%`],
      (err, rows) => {
        if (err) {
          console.error("Error en búsqueda:", err);
          return res.status(500).send("Error en la búsqueda");
        }
        res.json(rows);
      },
    );
  } catch (error) {
    console.error("Error en búsqueda:", error);
    res.status(500).send("Error en la búsqueda");
  }
}

// Descargar certificado por ID
async function descargarCertificado(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      console.error("❌ Descargar PDF: No se proporcionó ID");
      return res.status(400).json({ message: "ID no proporcionado" });
    }

    db.get(
      "SELECT * FROM certificados_bautismo WHERE id = ?",
      [id],
      async (err, certificado) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ message: "Error al consultar certificado" });
        }

        if (!certificado) {
          console.warn(`⚠️ Certificado no encontrado para ID: ${id}`);
          return res.status(404).json({ message: "Certificado no encontrado" });
        }

        try {
          const pdfBuffer = await generarPdf(certificado);

          if (!pdfBuffer) {
            console.error(
              "❌ Descargar PDF: Generar PDF devolvió null o undefined",
            );
            return res
              .status(500)
              .json({ message: "No se pudo generar el PDF" });
          }
          // Generar el PDF con los datos
          //const pdfBuffer = await generarPdf(certificado);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=certificado_${id}.pdf`,
          );
          res.send(pdfBuffer);
        } catch (pdfError) {
          console.error("❌ Error generando PDF:", pdfError);
          res.status(500).json({
            message: "Error al generar el PDF",
            details: pdfError.message,
          });
        }
      },
    );
  } catch (error) {
    console.error("Error al descargar certificado:", error);
    res.status(500).json({ message: "Error al generar el PDF" });
  }
}

// Controlador para validar si un ID ya existe
async function checkIdDisponible(libroBautizo, folioBautizo, numeroArchivo) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM certificados_bautismo 
       WHERE libroBautizo = ? AND folioBautizo = ? AND numeroArchivo = ?`,
      [libroBautizo, folioBautizo, numeroArchivo],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? false : true); // false = ya existe, true = disponible
      },
    );
  });
}

// Eliminar certificado por ID
async function eliminarCertificado(req, res) {
  try {
    const { id } = req.params;
    db.run(
      "DELETE FROM certificados_bautismo WHERE id = ?",
      [id],
      function (err) {
        if (err) {
          console.error("Error eliminando certificado:", err);
          return res.status(500).send("Error al eliminar certificado");
        }
        if (this.changes === 0) {
          return res.status(404).json({ message: "Certificado no encontrado" });
        }
        res.json({ message: "Certificado eliminado correctamente" });
      },
    );
  } catch (error) {
    console.error("Error eliminando certificado:", error);
    res.status(500).send("Error al eliminar certificado");
  }
}

// Obtener todos los bautismos
function obtenerTodos(req, res) {
  db.all(
    provider === "postgres"
      ? "SELECT * FROM certificados_bautismo ORDER BY COALESCE(NULLIF(substring(libroBautizo from '^\\s*([+-]?[0-9]+)'), '')::numeric, 0), COALESCE(NULLIF(substring(folioBautizo from '^\\s*([+-]?[0-9]+)'), '')::numeric, 0), COALESCE(NULLIF(substring(numeroArchivo from '^\\s*([+-]?[0-9]+)'), '')::numeric, 0)"
      : "SELECT * FROM certificados_bautismo ORDER BY CAST(libroBautizo AS INTEGER), CAST(folioBautizo AS INTEGER), CAST(numeroArchivo AS INTEGER)",
    [],
    (err, rows) => {
      if (err) {
        console.error("❌ Error al obtener bautismos:", err.message);
        return res.status(500).json({ error: "Error al obtener bautismos" });
      }
      res.json(rows);
    },
  );
}

//Ruta para actualizar un bautismo
async function actualizarBautismo(req, res) {
  try {
    const { id } = req.params;
    // El frontend envía el registro completo; el ID y la fecha no se editan.
    const {
      id: _id,
      created_at: _createdAt,
      _syncVersion: expectedVersion,
      ...datosActualizados
    } = req.body;
    const campos = Object.keys(datosActualizados);
    if (!campos.length || campos.some((c) => !editableColumns.includes(c)))
      return res.status(400).json({ message: "Campos no válidos" });
    const valores = Object.values(datosActualizados);
    const setString = campos.map((campo) => `${campo} = ?`).join(", ");
    valores.push(id); // Agregar ID al final para la cláusula WHERE
    const sql = `UPDATE certificados_bautismo SET ${setString} WHERE id = ?`;

    const execute = db.runWithVersion
      ? (sql, values, callback) =>
          db.runWithVersion(sql, values, expectedVersion, callback)
      : db.run.bind(db);
    execute(sql, valores, function (err) {
      if (err) {
        if (err.code === "SYNC_STALE")
          return res.status(409).json({ error: err.message });
        console.error("❌ Error al actualizar bautismo:", err.message);
        return res.status(500).json({ error: "Error al actualizar bautismo" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Bautismo no encontrado" });
      }
      res.json({ message: "Bautismo actualizado correctamente" });
    });
  } catch (error) {
    console.error("❌ Error al actualizar bautismo:", error);
    res.status(500).json({ error: "Error al actualizar bautismo" });
  }
}

// Estadísticas de bautismos por año
async function estadisticasBautismos(req, res) {
  try {
    const { anio } = req.params;
    db.all(
      `SELECT 
       LOWER(mesBautismo) AS mes, 
       genero,
       mesNacimiento,
       anoNacimiento,
       anoBautismo
      FROM certificados_bautismo 
      WHERE anoBautismo = ? 
      `,
      [anio],
      (err, registros) => {
        if (err) {
          console.error("Error obteniendo estadísticas:", err);
          return res
            .status(500)
            .json({ error: "Error al obtener estadísticas" });
        }

        // Lista de meses en orden
        const mesesOrdenados = [
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "septiembre",
          "octubre",
          "noviembre",
          "diciembre",
        ];

        // Normalizamos el resultado
        const resultados = mesesOrdenados.map((mes) => ({
          mes,
          total: 0,
          hombres: 0,
          mujeres: 0,
          ninos: 0,
        }));

        function calcularEdad(anoNac, mesNac, anoBaut, mesBaut) {
          let edad = anoBaut - anoNac;

          const indexNac = mesesOrdenados.indexOf(mesNac?.toLowerCase());
          const indexBaut = mesesOrdenados.indexOf(mesBaut?.toLowerCase());

          if (indexBaut < indexNac) {
            edad--;
          }

          return edad;
        }

        let sumaEdadesNinos = 0;
        let cantidadNinos = 0;

        let sumaEdadesMujeres = 0;
        let cantidadMujeres = 0;

        let sumaEdadesHombres = 0;
        let cantidadHombres = 0;

        let totalHombres = 0;
        let totalMujeres = 0;
        let totalNinos = 0;

        let grupo0a1 = 0;
        let grupo1a7 = 0;
        let grupoMayor7 = 0;

        registros.forEach((r) => {
          const mesIndex = mesesOrdenados.indexOf(r.mes?.toLowerCase());
          if (mesIndex === -1) return;

          resultados[mesIndex].total++;

          if (r.anoNacimiento && r.mesNacimiento) {
            const edad = calcularEdad(
              r.anoNacimiento,
              r.mesNacimiento,
              r.anoBautismo,
              r.mes, // mesBautismo ya viene como r.mes
            );

            if (edad <= 1) {
              grupo0a1++;
            } else if (edad > 1 && edad <= 7) {
              grupo1a7++;
            } else if (edad > 7) {
              grupoMayor7++;
            }

            if (edad < 18) {
              // Niños
              resultados[mesIndex].ninos++;
              totalNinos++;

              sumaEdadesNinos += edad;
              cantidadNinos++;
            } else if (edad >= 18 && r.genero === "Masculino") {
              // Hombres
              resultados[mesIndex].hombres++;
              totalHombres++;

              sumaEdadesHombres += edad;
              cantidadHombres++;
            } else if (edad >= 18 && r.genero === "Femenino") {
              // Mujeres
              resultados[mesIndex].mujeres++;
              totalMujeres++;

              sumaEdadesMujeres += edad;
              cantidadMujeres++;
            }
          }
        });

        const promedioEdadNinos =
          cantidadNinos > 0 ? Math.round(sumaEdadesNinos / cantidadNinos) : 0;
        const promedioEdadHombres =
          cantidadHombres > 0
            ? Math.round(sumaEdadesHombres / cantidadHombres)
            : 0;
        const promedioEdadMujeres =
          cantidadMujeres > 0
            ? Math.round(sumaEdadesMujeres / cantidadMujeres)
            : 0;

        const totalAnual = resultados.reduce(
          (acc, item) => acc + item.total,
          0,
        );

        const resumenGeneral = {
          ninos: totalNinos,
          hombres: totalHombres,
          mujeres: totalMujeres,
          total: totalAnual,
        };

        const totalPorGrupo = {
          grupo0a1,
          grupo1a7,
          grupoMayor7,
        };

        res.json({
          meses: resultados,
          totalAnual,
          resumenGeneral,
          promedioEdadNinos,
          promedioEdadHombres,
          promedioEdadMujeres,
          totalPorGrupo,
        });
      },
    );
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
}

module.exports = {
  crearBautismoYGenerarPdf,
  guardarBautismoBD,
  vistaPreviaPdf,
  buscarCertificados,
  estadisticasBautismos,
  descargarCertificado,
  checkIdDisponible,
  eliminarCertificado,
  obtenerTodos,
  actualizarBautismo,
};

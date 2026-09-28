const express = require("express");
const router = express.Router();
const bautismoController = require("../controllers/bautismoController");

// Para vista previa (no guarda en BD)
router.post("/vista-previa", bautismoController.vistaPreviaPdf);

// Guardar en DB
router.post("/", bautismoController.guardarBautismoBD);

// Ruta POST para guardar y generar PDF
router.post(
  "/generar-certificado",
  bautismoController.crearBautismoYGenerarPdf
);

// Búsqueda de certificados
router.get("/buscar", bautismoController.buscarCertificados);

// Estadísticas por año
router.get(
  "/estadisticas-bautismos/:anio",
  bautismoController.estadisticasBautismos
);

router.get("/all", bautismoController.obtenerTodos);

// Descargar certificado
router.get("/:id/pdf", bautismoController.descargarCertificado);

// Handler de ruta que llama a la función y responde al frontend
router.get("/check-id", async (req, res) => {
  const { libroBautizo, folioBautizo, numeroArchivo } = req.query;

  try {
    const disponible = await bautismoController.checkIdDisponible(
      libroBautizo,
      folioBautizo,
      numeroArchivo
    );

    if (!disponible) {
      return res.json({
        available: false,
        message: "⚠️ Este número de archivo ya está registrado",
      });
    }

    return res.json({
      available: true,
      message: "✅ Número de archivo disponible",
    });
  } catch (err) {
    res.status(500).json({ error: "Error validando ID", details: err.message });
  }
});

// Actualizar certificado
router.put("/:id", bautismoController.actualizarBautismo);

// Eliminar certificado
router.delete("/:id", bautismoController.eliminarCertificado);

module.exports = router;

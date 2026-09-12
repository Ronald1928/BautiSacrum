// Check authorization and a real PostgreSQL query before replacing saved credentials.
async function verifyCloudConnection(url, token, { fetchImpl = fetch } = {}) {
  async function request(route) {
    let response;
    try {
      response = await fetchImpl(url + route, {
        headers: { Authorization: "Bearer " + token },
        redirect: "error",
        signal: AbortSignal.timeout(90000),
      });
    } catch {
      throw new Error(
        "No se pudo contactar con Render. Comprueba Internet y vuelve a intentarlo; el servidor puede tardar en despertar.",
      );
    }
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "Render rechazó la clave de activación. Usa el token original del equipo, no su hash SHA-256.",
      );
    if (!response.ok)
      throw new Error(
        "Render no pudo consultar Neon. Revisa la configuración del servidor y vuelve a intentarlo.",
      );
    try {
      return await response.json();
    } catch {
      throw new Error("El servidor no devolvió una respuesta válida.");
    }
  }
  const identity = await request("/v1/identity");
  if (
    identity.protocol !== 1 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identity.databaseId,
    )
  )
    throw new Error("La API no es compatible con esta aplicación.");
  const page = await request(
    "/v1/pull?after=0&databaseId=" + encodeURIComponent(identity.databaseId),
  );
  if (
    !Array.isArray(page.rows) ||
    typeof page.more !== "boolean" ||
    !/^\d+$/.test(String(page.cursor))
  )
    throw new Error("Neon no devolvió una respuesta de sincronización válida.");
  return { databaseId: identity.databaseId };
}
module.exports = { verifyCloudConnection };

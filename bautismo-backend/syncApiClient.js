function createSyncApiClient(
  url,
  token,
  { allowLocalHttp = false, fetchImpl = fetch } = {},
) {
  if (!url || !token) return null;
  const base = new URL(url);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      !(
        allowLocalHttp &&
        base.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(base.hostname)
      ))
  )
    throw new Error(
      "La API requiere una dirección HTTPS sin credenciales ni parámetros.",
    );
  const root = base.href.replace(/\/$/, "");
  async function request(route, body) {
    let response;
    try {
      response = await fetchImpl(root + route, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + token,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "error",
        signal: AbortSignal.timeout(90000),
      });
    } catch {
      throw new Error("No se pudo contactar con la API privada.");
    }
    if (!response.ok)
      throw Object.assign(
        new Error(
          response.status === 401
            ? "La clave de este equipo no está autorizada."
            : response.status === 409
              ? "Esta copia local pertenece a otra base compartida."
              : "La API no pudo completar la sincronización.",
        ),
        { configuration: [401, 403, 409].includes(response.status) },
      );
    return response.json();
  }
  return {
    identity: () => request("/v1/identity"),
    push: (operations, databaseId) =>
      request("/v1/push", { operations, databaseId }),
    pull: (after, databaseId) =>
      request(
        "/v1/pull?after=" +
          encodeURIComponent(after) +
          "&databaseId=" +
          encodeURIComponent(databaseId),
      ),
    lookup: (body) => request("/v1/lookup", body),
  };
}
module.exports = { createSyncApiClient };

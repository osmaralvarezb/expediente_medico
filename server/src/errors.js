// Error de dominio con código HTTP: los Services lo lanzan y el Controller lo traduce a respuesta.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

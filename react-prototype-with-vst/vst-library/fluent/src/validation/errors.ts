/**
 * InvalidIntentError
 *
 * Thrown by PlanogramBuilder when an action or the final build result
 * violates the business rules enforced by the ICoreProcessor in strict mode.
 */
export class InvalidIntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidIntentError";
  }
}

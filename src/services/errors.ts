export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`Not implemented: ${what}. Provide an HTTP implementation.`);
    this.name = 'NotImplementedError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

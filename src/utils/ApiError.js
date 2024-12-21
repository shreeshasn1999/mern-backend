class ApiError extends Error {
  constructor(
    statusCode,
    message = 'Something went wrong!',
    errors = [],
    errorStack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    if (errorStack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };

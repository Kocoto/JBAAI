class CustomError extends Error {
  status: number;
  errorEnabled: boolean;
  // data?: any;

  constructor(
    status: number,
    message: string,
    errorEnabled: boolean = true,
    data?: any
  ) {
    super(message);
    this.status = status;
    this.name = "CustomError";
    this.errorEnabled = errorEnabled;
    Object.setPrototypeOf(this, CustomError.prototype);
    // this.data = data;
  }
}

export default CustomError;

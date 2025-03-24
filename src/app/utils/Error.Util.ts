class CustomError extends Error {
  status: number;
  // data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.name = "CustomError";
    Object.setPrototypeOf(this, CustomError.prototype);
    // this.data = data;
  }
}

export default CustomError;

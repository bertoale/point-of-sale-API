class SuccessResponse {
  constructor(message = "Operation successful", data = null) {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}

class ErrorResponse {
  constructor(message = "error message") {
    this.success = false;
    this.message = message;
  }
}

// Fungsi helper untuk response sukses
function Success(
  res,
  status = 200,
  message = "Operation successful",
  data = null
) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

// Fungsi helper untuk response error
function Error(res, status = 400, message = "error message") {
  return res.status(status).json({
    success: false,
    message,
  });
}

export { SuccessResponse, ErrorResponse, Success, Error };

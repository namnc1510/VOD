function successResponse(data, meta) {
  const response = {
    success: true,
    data
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
}

function errorResponse(message, details) {
  const response = {
    success: false,
    error: {
      message
    }
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  return response;
}

module.exports = {
  successResponse,
  errorResponse
};

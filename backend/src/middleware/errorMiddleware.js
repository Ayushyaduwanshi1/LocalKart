const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('[Error Details]:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return res.status(404).json({
      success: false,
      message,
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    const value = err.keyValue ? err.keyValue[field] : '';
    let message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists. Please use a unique value.`;

    if (field === 'sku') {
      message = `Product with SKU '${value}' already exists.`;
    } else if (field === 'barcode') {
      message = `Product with barcode '${value}' already exists.`;
    } else if (field === 'phone') {
      message = `A customer or user with phone '${value}' already exists.`;
    } else if (field === 'email') {
      message = `An account with email '${value}' already exists.`;
    } else if (field === 'orderNumber') {
      message = `Order number '${value}' already exists.`;
    }

    return res.status(409).json({
      success: false,
      message,
      field,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authorization token has expired. Please log in again.',
    });
  }

  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
  };

  if (err.availableStock !== undefined || error.availableStock !== undefined) {
    response.availableStock = err.availableStock !== undefined ? err.availableStock : error.availableStock;
  }

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = { errorHandler };

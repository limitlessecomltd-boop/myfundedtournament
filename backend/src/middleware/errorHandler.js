// errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || "Internal server error" });
}
module.exports = errorHandler;

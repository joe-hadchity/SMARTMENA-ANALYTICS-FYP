function notFound(req, res) {
  res.status(404).json({
    message: "Not found",
    path: req.originalUrl,
  });
}

module.exports = notFound;

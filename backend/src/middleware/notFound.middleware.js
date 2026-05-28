const notFound = (req, res, next) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
};

export default notFound;

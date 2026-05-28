// Wraps an async Express controller so any thrown error or rejected promise
// is forwarded to the central error middleware via `next`.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;

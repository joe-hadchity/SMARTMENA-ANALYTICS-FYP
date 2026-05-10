const authService = require("../services/authService");

async function login(req, res) {
  const payload = await authService.login(req.body);
  res.json(payload);
}

async function register(req, res) {
  const payload = await authService.register(req.body);
  res.status(201).json(payload);
}

async function me(req, res) {
  const token = authService.extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" });
  }
  const payload = await authService.me(token);
  res.json(payload);
}

async function bootstrapBorn2Hike(req, res) {
  const payload = await authService.bootstrapBorn2HikeUser(req.body || {});
  res.status(201).json(payload);
}

module.exports = {
  bootstrapBorn2Hike,
  login,
  me,
  register,
};

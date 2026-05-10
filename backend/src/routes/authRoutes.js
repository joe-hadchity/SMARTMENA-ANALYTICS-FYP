const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const {
  loginSchema,
  registerSchema,
  born2HikeBootstrapSchema,
} = require("../validators/authValidator");
const {
  bootstrapBorn2Hike,
  login,
  me,
  register,
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", validate(loginSchema), asyncHandler(login));
router.post("/register", validate(registerSchema), asyncHandler(register));
router.get("/me", asyncHandler(me));
router.post(
  "/bootstrap-born2hike",
  validate(born2HikeBootstrapSchema),
  asyncHandler(bootstrapBorn2Hike),
);

module.exports = router;

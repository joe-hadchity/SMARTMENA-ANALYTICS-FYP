const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { getHealth } = require("../controllers/healthController");

const router = express.Router();

router.get("/", asyncHandler(getHealth));

module.exports = router;

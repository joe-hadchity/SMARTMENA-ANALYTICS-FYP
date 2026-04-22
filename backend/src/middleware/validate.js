/**
 * Generic zod validator. Pass a zod schema + the request section to validate.
 * On success: replaces req[source] with the parsed (coerced) value.
 * On failure: responds 400 with a consistent error body.
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        details: result.error.flatten(),
      });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;

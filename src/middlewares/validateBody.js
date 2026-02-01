// src/middlewares/validateBody.js
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

module.exports = function validateBody(schema) {
  const validate = ajv.compile(schema);

  return (req, res, next) => {
    const ok = validate(req.body);

    if (!ok) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validate.errors?.map((e) => ({
          field: e.instancePath || e.params?.missingProperty || "",
          message: e.message,
        })),
      });
    }

    next();
  };
};

// src/modules/users/user.schema.js
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["userName", "email", "password"],
  properties: {
    userName: { type: "string", minLength: 2, maxLength: 50 },
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 6, maxLength: 72 }, // bcrypt-safe length
  },
};

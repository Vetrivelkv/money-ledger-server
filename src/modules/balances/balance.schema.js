/*
  POST /balances
  Create or update opening balance for a (year, month).
*/
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["year", "month", "openingBalance"],
  properties: {
    year: { type: "integer", minimum: 1900, maximum: 2100 },
    month: { type: "integer", minimum: 1, maximum: 12 },
    openingBalance: { type: "number" },
  },
};

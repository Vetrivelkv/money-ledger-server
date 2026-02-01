/*
  POST /balances
  Create or update opening balance for a (year, month).

  If updating an existing opening balance, a transaction row is written
  for the delta (correction). You can pass an optional description.
*/
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["year", "month", "openingBalance"],
  properties: {
    year: { type: "integer", minimum: 1900, maximum: 2100 },
    month: { type: "integer", minimum: 1, maximum: 12 },
    openingBalance: { type: "number" },
    description: { type: "string", minLength: 1, maxLength: 200 },
  },
};

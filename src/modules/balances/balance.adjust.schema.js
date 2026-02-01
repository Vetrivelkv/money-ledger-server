/*
  PATCH /balances/:id/adjust
  Apply a manual adjustment delta (+/-) to current balance.

  Also writes a row into balance_transactions with description.
*/
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["delta", "description"],
  properties: {
    delta: { type: "number" },
    description: { type: "string", minLength: 1, maxLength: 200 },
  },
};

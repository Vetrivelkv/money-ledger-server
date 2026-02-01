/*
  PATCH /balances/:id/adjust
  Apply a manual adjustment delta (+/-) to current balance.
*/
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["delta"],
  properties: {
    delta: { type: "number" },
  },
};

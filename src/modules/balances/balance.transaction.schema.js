/*
  POST /balances/transaction
  Add a balance transaction for a (year, month).

  This is the main API for recording balance-affecting events:
  salary, cash from family, corrections, etc.

  type:
    - CREDIT increases balance
    - DEBIT decreases balance
*/
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["year", "month", "type", "amount", "description"],
  properties: {
    year: { type: "integer", minimum: 1900, maximum: 2100 },
    month: { type: "integer", minimum: 1, maximum: 12 },
    type: { type: "string", enum: ["CREDIT", "DEBIT"] },
    amount: { type: "number", exclusiveMinimum: 0 },
    description: { type: "string", minLength: 1, maxLength: 200 },
  },
};

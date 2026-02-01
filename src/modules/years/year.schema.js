// Schema for creating a year.
// months: "all" OR an array of month numbers (1..12)
module.exports = {
  type: "object",
  additionalProperties: false,
  required: ["year", "months"],
  properties: {
    year: { type: "integer", minimum: 1900, maximum: 2100 },
    months: {
      anyOf: [
        { type: "string", enum: ["all"] },
        {
          type: "array",
          items: { type: "integer", minimum: 1, maximum: 12 },
          minItems: 1,
          maxItems: 12,
          uniqueItems: true
        }
      ]
    }
  }
};

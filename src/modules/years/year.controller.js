const r = require("../../db/rethink");

const YEARS_TABLE = "years";
const USERS_TABLE = "users";

function normalizeMonths(months) {
  if (months === "all") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const unique = Array.from(new Set(months));
  unique.sort((a, b) => a - b);
  return unique;
}

module.exports = {
  // POST /years
  createYear: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      const { year, months } = req.body;
      const monthsEnabled = normalizeMonths(months);

      // ✅ Prevent duplicates globally by year (NOT per user)
      const existing = await r
        .table(YEARS_TABLE)
        .getAll(year, { index: "year" })
        .nth(0)
        .default(null)
        .run();

      if (existing) {
        return res.status(409).json({ message: "Year already exists" });
      }

      const doc = {
        userId, // stored for "created by"
        year,
        monthsEnabled,
        createdAt: new Date().toISOString(),
      };

      const result = await r.table(YEARS_TABLE).insert(doc).run();
      const id = result.generated_keys?.[0];

      return res.status(201).json({
        year: {
          id,
          year: doc.year,
          monthsEnabled: doc.monthsEnabled,
          createdAt: doc.createdAt,
          userId: doc.userId,
        },
      });
    } catch (err) {
      console.error("createYear error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },

  // GET /years  (✅ returns all years, visible to everyone)
  listYears: async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId)
        return res.status(401).json({ message: "Not authenticated" });

      // ✅ no filtering
      const rows = await r.table(YEARS_TABLE).orderBy(r.desc("year")).run();

      // Optional: enrich with creator userName so client can display "created by"
      const creatorIds = Array.from(
        new Set(rows.map((x) => x.userId).filter(Boolean)),
      );

      let usersById = {};
      if (creatorIds.length) {
        const users = await r
          .table(USERS_TABLE)
          .getAll(...creatorIds)
          .run();
        usersById = users.reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});
      }

      return res.json({
        years: rows.map((y) => ({
          id: y.id,
          year: y.year,
          monthsEnabled: y.monthsEnabled || [],
          createdAt: y.createdAt,
          userId: y.userId,
          createdBy: usersById[y.userId]?.userName || null,
        })),
      });
    } catch (err) {
      console.error("listYears error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  },
};

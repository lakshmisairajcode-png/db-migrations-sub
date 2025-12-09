module.exports = {
  async up(db, client) {
    console.log("---- Starting Migration: Update document_types CPT ----");

    const result = await db.collection("document_types").updateMany(
      { code: "CPT" },
      {
        $set: {
          label: "UPDATED_FROM_POC_CUSTOM_RUNNER",
          updatedAt: new Date()
        }
      }
    );

    console.log("Matched Documents: ", result.matchedCount);
    console.log("Modified Documents:", result.modifiedCount);

    console.log("---- Migration Completed ----");
  },

  async down(db, client) {
    console.log("Rollback not implemented");
  }
};

const db = require("../config/db");

/**
 * Office QR Model — manages the single permanent office QR row (id = 1).
 *
 * The QR code VALUE never changes: SAFE-SOLUTIONS-HQ-001
 * Only the rendered PNG image can be regenerated (e.g. if the printed
 * poster is lost). Regenerating does NOT create a new code.
 */
const OfficeQrModel = {
  /**
   * Returns the single office QR record, or null if the seeder hasn't run.
   */
  async get() {
    const { rows } = await db.query("SELECT * FROM office_qr WHERE id = 1");
    return rows[0] || null;
  },

  /**
   * Overwrites the stored PNG image for the existing permanent QR code.
   * Does NOT change the code value.
   *
   * @param {string}      imageBase64   Raw base64-encoded PNG (no data: prefix)
   * @param {string|null} regeneratedBy UUID of the user who triggered this
   */
  async regenerateImage(imageBase64, regeneratedBy = null) {
    const { rows } = await db.query(
      `UPDATE office_qr
       SET image_base64 = $1, regenerated_by = $2
       WHERE id = 1
       RETURNING *`,
      [imageBase64, regeneratedBy || null]
    );
    return rows[0] || null;
  }
};

module.exports = OfficeQrModel;
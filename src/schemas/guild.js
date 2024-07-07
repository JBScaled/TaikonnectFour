const { Schema, model } = require("mongoose");

const guildSchema = new Schema({
  _id: Schema.Types.ObjectId,
  guildId: String,
  guildName: String,
  guildIcon: { type: String, required: false },
  users: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

module.exports = model("Guild", guildSchema, "guilds");

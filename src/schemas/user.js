const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  _id: Schema.Types.ObjectId,
  userId: String,
  username: String,
  guild: String,
  //guilds: [{ type: Schema.Types.ObjectId, ref: "Guild" }],
  wallet: {
    address: String,
    privateKey: String,
  },
  additionalAddress: String,
});

module.exports = model("User", userSchema, "users");

const { Schema, model } = require("mongoose");

const activeGameSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true },
  gameId: { type: Number, required: true, unique: true },
  creator: { type: String, required: true }, // Wallet address of the creator
  opponent: { type: String, required: true }, // Wallet address of the opponent
  stake: { type: Number, required: true },
  currentPlayer: { type: String, required: true }, // Wallet address of the current player
});

module.exports = model("ActiveGame", activeGameSchema, "activeGames");

const { SlashCommandBuilder } = require("discord.js");
const { Web3 } = require("web3");
require("dotenv").config();
const { contractAddress } = process.env;
const contractABI = require("../../../contractABI");

const web3 = new Web3(
  new Web3.providers.HttpProvider("https://rpc.hekla.taiko.xyz")
);
const contract = new web3.eth.Contract(contractABI, contractAddress);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("get-game-status")
    .setDescription("Gets the game board status for a given gameId.")
    .addIntegerOption((option) =>
      option
        .setName("gameid")
        .setDescription("The ID of the game to retrieve")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const gameId = interaction.options.getInteger("gameid");

    try {
      const gameBoard = await contract.methods.getGameBoard(gameId).call();

      const rows = gameBoard.length;
      const cols = gameBoard[0].length;
      const rotatedGameBoard = [];

      for (let col = cols - 1; col >= 0; col--) {
        const newRow = [];
        for (let row = 0; row < rows; row++) {
          newRow.push(gameBoard[row][col]);
        }
        rotatedGameBoard.push(newRow);
      }

      // Process the game board and replace cell values with emojis
      const colouredGameBoard = rotatedGameBoard
        .map((row) => {
          return row
            .map((cell) => {
              if (cell == 1) return "🔵";
              if (cell == 2) return "🔴";
              return "⚫";
            })
            .join(" "); // Join cells with space for better display
        })
        .join("\n"); // Join rows with new line for better display

      // Format the game board for display
      let response = `Game Board Status for Game ID ${gameId}:\n`;

      await interaction.reply(response + colouredGameBoard);
    } catch (error) {
      console.error("Error fetching game status:", error);
      await interaction.reply({
        content: "Failed to fetch game status. It likely does not exist.",
        ephemeral: true,
      });
    }
  },
};

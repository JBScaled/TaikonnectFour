const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const { Web3 } = require("web3");
const User = require("../../schemas/user");
const { contractAddress } = process.env;
const contractABI = require("../../../contractABI");

const web3 = new Web3(
  new Web3.providers.HttpProvider("https://rpc.hekla.taiko.xyz")
);
const contract = new web3.eth.Contract(contractABI, contractAddress);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("make-move")
    .setDescription("Make a move in an existing game of Connect Four")
    .addStringOption((option) =>
      option
        .setName("gameid")
        .setDescription("The ID of the game you wish to make a move in.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("column")
        .setDescription("The column number where you want to drop your disc.")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(6)
    ),

  async execute(interaction, client) {
    await interaction.deferReply(); // Acknowledge the interaction

    const userId = interaction.user.id;
    let userProfile = await User.findOne({ userId });

    if (!userProfile) {
      await interaction.editReply({
        content: `Please create a wallet first.`,
      });
      return;
    }

    const gameId = interaction.options.getString("gameid");
    const column = interaction.options.getInteger("column");

    try {
      const account = web3.eth.accounts.privateKeyToAccount(
        userProfile.wallet.privateKey
      );
      web3.eth.accounts.wallet.add(account);
      web3.eth.defaultAccount = account.address;

      const options = {
        from: account.address,
        gasPrice: await web3.eth.getGasPrice(),
        gas: 300000,
      };

      // Call the makeMove function on the contract
      const transaction = await contract.methods
        .makeMove(gameId, column)
        .send(options);

      if (transaction.transactionHash) {
        console.log("Transaction hash:", transaction.transactionHash);
        console.log("Move made successfully!");

        try {
          // Fetch the new game board status
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
          let newGameBoard = `Game Board Status for Game ID ${gameId}:\n${colouredGameBoard}`;

          await interaction.editReply({
            content: `Move successfully made!\nTransaction Hash: ${transaction.transactionHash}\n\n${newGameBoard}`,
          });
          console.log("New Game Board Status:", newGameBoard);
        } catch {
          await interaction.editReply({
            content: `Move successfully made!\nTransaction Hash: ${transaction.transactionHash}\n\n The winner was ${userProfile.username}!!!!`,
          });
        }
      }
    } catch (error) {
      console.error("Error making move:", error);
      await interaction.editReply({
        content: `There was an error sending your Tx. ${error.message}`,
      });
    }
  },
};

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
    .setName("join-game")
    .setDescription("Join an existing game of Connect Four")
    .addStringOption(option =>
      option
        .setName("gameid")
        .setDescription("The ID of the game you wish to join.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction

    const userId = interaction.user.id;
    let userProfile = await User.findOne({ userId });

    if (!userProfile) {
      await interaction.editReply({
        content: `Please create a wallet first.`,
      });
      return;
    }

    const gameId = interaction.options.getString("gameid");

    try {
      // Call the contract to get the stake amount for the specified game
      const gameInfo = await contract.methods.games(gameId).call();
      const stakeAmount = gameInfo.stake;

      if (!stakeAmount) {
        await interaction.editReply({
          content: `Game with ID ${gameId} does not exist or has no stake.`,
        });
        return;
      }

      const account = web3.eth.accounts.privateKeyToAccount(
        userProfile.wallet.privateKey
      );
      web3.eth.accounts.wallet.add(account);
      web3.eth.defaultAccount = account.address;

      const options = {
        from: account.address,
        gasPrice: await web3.eth.getGasPrice(),
        gas: 300000,
        value: stakeAmount, // Use the retrieved stake amount
      };

      // Call the joinGame function on the contract
      const transaction = await contract.methods
        .joinGame(gameId)
        .send(options);

      if (transaction.transactionHash) {
        await interaction.editReply({
          content: `Successfully joined the game!\nTransaction Hash: ${transaction.transactionHash}`,
        });

        console.log("Transaction hash:", transaction.transactionHash);
        console.log("Successfully joined the game!");
      }
    } catch (error) {
      console.error("Error joining game:", error);
      await interaction.editReply({
        content: `There was an error sending your Tx. ${error.message}`,
      });
    }
  },
};

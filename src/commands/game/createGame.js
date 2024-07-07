const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const { Web3 } = require("web3");
const User = require("../../schemas/user");
const ActiveGame = require("../../schemas/activeGame");
const { contractAddress } = process.env;
const contractABI = require("../../../contractABI");

const web3 = new Web3(
  new Web3.providers.HttpProvider("https://rpc.hekla.taiko.xyz")
);
const contract = new web3.eth.Contract(contractABI, contractAddress);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-game")
    .setDescription("Create a new game of Connect Four")
    .addNumberOption(option =>
      option
        .setName("stake")
        .setDescription("The amount you wish to wager on this game.")
        .setRequired(true)
        .setMinValue(0.005)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction

    const userId = interaction.user.id;
    const userProfile = await User.findOne({ userId });

    if (!userProfile) {
      await interaction.editReply({
        content: `Please create a wallet first.`,
      });
      return;
    }

    const stake = interaction.options.getNumber("stake");
    const stakeInWei = web3.utils.toWei(stake.toString(), "ether"); // Convert to Wei

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
        value: stakeInWei,
      };

      // Call the createGame function on the contract
      const transaction = await contract.methods
        .createGame(stakeInWei)
        .send(options);

      if (transaction.transactionHash) {
        await interaction.editReply({
          content: `Game successfully created!\nTransaction Hash: ${transaction.transactionHash}`,
        });

        console.log("Transaction hash:", transaction.transactionHash);
        console.log("Game created successfully!");
      }
    } catch (error) {
      console.error("Error creating game:", error);
      await interaction.editReply({
        content: `There was an error sending your Tx. ${error.message}`,
      });
    }
  },
};

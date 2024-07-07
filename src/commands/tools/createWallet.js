const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const { Web3 } = require("web3");
const User = require("../../schemas/user");

const web3 = new Web3();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create-wallet")
    .setDescription("Creates a new wallet if one doesn't already exist."),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    let userProfile = await User.findOne({ userId });

    if (!userProfile) {
      userProfile = new User({
        _id: new mongoose.Types.ObjectId(),
        userId,
        username: interaction.user.username,
        guild: interaction.guild.id, // Assuming the guild schema is already updated
      });
    }
    
    if (!userProfile.wallet || !userProfile.wallet.address) {
      const newWallet = web3.eth.accounts.create();
      userProfile.wallet = {
        address: newWallet.address,
        privateKey: newWallet.privateKey,
      };
      await userProfile.save().catch(console.error);
      await interaction.reply({
        content: `A new wallet has been created!\nAddress: ${newWallet.address}`,
      });
    } else {
      await interaction.reply({
        content: `You already have a wallet.\nAddress: ${userProfile.wallet.address}`,
        ephemeral: true, 
      });
    }
  },
};

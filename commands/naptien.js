// commands/naptien.js (giữ nguyên, mở modal)
const { SlashCommandBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('naptien').setDescription('Bắt đầu nạp tiền Bee Coin'),
    async execute(interaction) {
        const modal = new ModalBuilder().setCustomId('topup_modal').setTitle('Nhập số tiền nạp');
        const amountInput = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Số tiền (VND, min 10,000)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(5)
            .setPlaceholder('10000');
        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        await interaction.showModal(modal);
    },
};
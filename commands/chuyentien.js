// commands/chuyentien.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chuyentien')
        .setDescription('Chuyển Bee Coin cho người khác')
        .addUserOption(option => option.setName('nguoi_nhan').setDescription('Người nhận').setRequired(true))
        .addIntegerOption(option => option.setName('so_tien').setDescription('Số tiền Bee Coin').setRequired(true)),
    async execute(interaction, client) {
        const receiver = interaction.options.getUser('nguoi_nhan');
        const amount = interaction.options.getInteger('so_tien');
        const senderId = interaction.user.id;

        if (amount <= 0) {
            const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Số tiền phải > 0.').setColor('Red');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (receiver.id === senderId) {
            const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Không thể chuyển cho chính mình.').setColor('Red');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const usersPath = path.join(__dirname, '../data/users.json');
        let users = {};
        if (fs.existsSync(usersPath)) {
            users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        }
        
        const sender = users[senderId] || { balance: 0 };
        if (sender.balance < amount) {
            const errorEmbed = new EmbedBuilder().setTitle('❌ Không đủ tiền!').setDescription('Số dư Bee Coin không đủ.').setColor('Red');
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        // Generate txnRef
        const txnRef = `t-${senderId}-${Date.now()}`;

        // Save pending
        const pendingPath = path.join(__dirname, '../data/pending.json');
        let pending = {};
        if (fs.existsSync(pendingPath)) {
            pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
        }
        pending[txnRef] = { type: 'transfer', senderId, receiverId: receiver.id, amount };
        fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2));

        // Create embed with transfer details
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const transferEmbed = new EmbedBuilder()
            .setTitle('💸 Xác nhận chuyển tiền')
            .setDescription(`Bạn muốn chuyển **${amount} <a:beecoin:1425342792569196607>** cho <@${receiver.id}>?\n\nSố dư hiện tại: **${sender.balance} <a:beecoin:1425342792569196607>**\nSố dư sau chuyển: **${sender.balance - amount} <a:beecoin:1425342792569196607>**`)
            .setColor('Blue')
            .setTimestamp()
            .setFooter({ text: `Txn Ref: ${txnRef}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`transfer_approve_${txnRef}`).setLabel('✅ Xác nhận').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`transfer_cancel_${txnRef}`).setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [transferEmbed], components: [row] });
    },
};
// commands/vi.js (giữ nguyên)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder().setName('vi').setDescription('Kiểm tra ví Bee Coin'),
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const usersPath = path.join(__dirname, '../data/users.json');
        let users = {};
        if (fs.existsSync(usersPath)) {
            users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        }
        const user = users[userId] || { balance: 0 };
        const embed = new EmbedBuilder()
            .setTitle('💼 Ví Bee Coin của bạn')
            .setDescription(`Số dư: **${user.balance} <a:beecoin:1425342792569196607>**\n(Dùng để thuê User và mua dịch vụ trên server)`)
            .setColor('Gold')
            .setThumbnail(interaction.user.displayAvatarURL());
        await interaction.reply({ embeds: [embed] });
    },
};
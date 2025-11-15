// commands/ongmat.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '../data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ONGMAT_FILE = path.join(DATA_DIR, 'ongmat.json');
const COUNTERS_FILE = path.join(DATA_DIR, 'counters.json');

function loadData(file, defaultValue = {}) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
    name: 'ongmat',
    async execute(interaction, client) {
        // This is a placeholder for slash command if needed; main logic in setup
    },
    setup(client) {
        // Handle ongmat button
        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isModalSubmit()) return;

            if (interaction.customId === 'ongmat_button') {
                if (interaction.user.bot) return;
                const modal = new ModalBuilder().setCustomId('ongmat_modal').setTitle('Đăng ký Ong Mật');
                const hoTenInput = new TextInputBuilder()
                    .setCustomId('ho_ten')
                    .setLabel('Họ và tên')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(100);
                const tuoiInput = new TextInputBuilder()
                    .setCustomId('tuoi')
                    .setLabel('Tuổi')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(3);
                const gioiTinhInput = new TextInputBuilder()
                    .setCustomId('gioi_tinh')
                    .setLabel('Giới tính')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(10);
                const linkFbInput = new TextInputBuilder()
                    .setCustomId('link_fb')
                    .setLabel('Link Facebook')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(200);
                const moTaInput = new TextInputBuilder()
                    .setCustomId('mo_ta')
                    .setLabel('Mô tả dịch vụ')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMaxLength(1000);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(hoTenInput),
                    new ActionRowBuilder().addComponents(tuoiInput),
                    new ActionRowBuilder().addComponents(gioiTinhInput),
                    new ActionRowBuilder().addComponents(linkFbInput),
                    new ActionRowBuilder().addComponents(moTaInput)
                );
                await interaction.showModal(modal);
            } else if (interaction.customId === 'ongmat_modal') {
                const hoTen = interaction.fields.getTextInputValue('ho_ten');
                const tuoi = interaction.fields.getTextInputValue('tuoi');
                const gioiTinh = interaction.fields.getTextInputValue('gioi_tinh');
                const linkFb = interaction.fields.getTextInputValue('link_fb');
                const moTa = interaction.fields.getTextInputValue('mo_ta');

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const userId = interaction.user.id;
                    const regId = `${userId}-${Date.now()}`;

                    let ongmat = loadData(ONGMAT_FILE, {});
                    ongmat[regId] = {
                        userId,
                        hoTen,
                        tuoi,
                        gioiTinh,
                        linkFb,
                        moTa,
                        status: 'pending',
                        timestamp: new Date().toISOString()
                    };
                    saveData(ONGMAT_FILE, ongmat);

                    const dangkyChannel = await interaction.guild.channels.fetch(process.env.DANGKY_CHANNEL_ID);
                    if (!dangkyChannel) {
                        const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Không tìm thấy kênh đăng ký.').setColor('Red');
                        return await interaction.editReply({ embeds: [errorEmbed] });
                    }

                    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                    const requestEmbed = new EmbedBuilder()
                        .setTitle('🆕 YÊU CẦU ĐĂNG KÝ ONG MẬT')
                        .setDescription(`Người dùng: <@${userId}>\nThời gian: ${now}`)
                        .addFields(
                            { name: 'Họ và tên', value: hoTen, inline: true },
                            { name: 'Tuổi', value: tuoi, inline: true },
                            { name: 'Giới tính', value: gioiTinh, inline: true },
                            { name: 'Link Facebook', value: `[${linkFb}](${linkFb})`, inline: false },
                            { name: 'Mô tả dịch vụ', value: moTa, inline: false }
                        )
                        .setColor('Orange')
                        .setTimestamp()
                        .setFooter({ text: `Reg ID: ${regId}` });

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`ongmat_approve_${regId}`).setLabel('✅ Phê duyệt').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`ongmat_reject_${regId}`).setLabel('❌ Từ chối').setStyle(ButtonStyle.Danger)
                    );

                    await dangkyChannel.send({ embeds: [requestEmbed], components: [row] });

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Đăng ký thành công!')
                        .setDescription('Yêu cầu đăng ký Ong Mật đã được gửi đến admin. Chờ phê duyệt để trở thành Ong Mật!')
                        .setColor('Green');
                    await interaction.editReply({ embeds: [successEmbed] });
                } catch (error) {
                    console.error(error);
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Có lỗi xảy ra khi xử lý đăng ký.').setColor('Red');
                    await interaction.editReply({ embeds: [errorEmbed] });
                }
            } else if (interaction.customId.startsWith('ongmat_approve_')) {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                const regId = interaction.customId.split('_')[2];
                let ongmat = loadData(ONGMAT_FILE, {});
                const entry = ongmat[regId];
                if (!entry) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                entry.status = 'approved';
                saveData(ONGMAT_FILE, ongmat);

                // DM success to user
                const userObj = await client.users.fetch(entry.userId);
                const dmEmbed = new EmbedBuilder()
                    .setTitle('✅ Đăng ký Ong Mật thành công!')
                    .setDescription('Admin đã phê duyệt đơn đăng ký của bạn. Chào mừng bạn trở thành Ong Mật trong Tổ Ong!')
                    .addFields(
                        { name: 'Họ và tên', value: entry.hoTen, inline: true },
                        { name: 'Tuổi', value: entry.tuoi, inline: true },
                        { name: 'Giới tính', value: entry.gioiTinh, inline: true },
                        { name: 'Link FB', value: entry.linkFb, inline: false },
                        { name: 'Mô tả dịch vụ', value: entry.moTa, inline: false }
                    )
                    .setColor('Green')
                    .setTimestamp();
                try {
                    await userObj.send({ embeds: [dmEmbed] });
                } catch (err) {
                    console.log('DM failed');
                }

                // Send to show channel
                const showChannel = await interaction.guild.channels.fetch(process.env.ONGMATSHOW_CHANNEL_ID);
                if (showChannel) {
                    const showEmbed = new EmbedBuilder()
                        .setTitle('🐝 Ong Mật Đã Được Phê Duyệt')
                        .setDescription(`Chào mừng Ong Mật mới: **${entry.hoTen}**`)
                        .addFields(
                            { name: 'Tuổi', value: entry.tuoi, inline: true },
                            { name: 'Giới tính', value: entry.gioiTinh, inline: true },
                            { name: 'Link FB', value: `[${entry.linkFb}](${entry.linkFb})`, inline: false },
                            { name: 'Mô tả dịch vụ', value: entry.moTa, inline: false }
                        )
                        .setColor('Green')
                        .setTimestamp()
                        .setFooter({ text: `Ong Mật ID: ${regId}` });

                    const showRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`hire_ongmat_${regId}`).setLabel('Thuê Ngay').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId(`donate_ongmat_${regId}`).setLabel('Donate').setStyle(ButtonStyle.Secondary)
                    );

                    await showChannel.send({ embeds: [showEmbed], components: [showRow] });
                }

                // Edit original message
                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã phê duyệt và thông báo qua DM.**');
                await interaction.update({ embeds: [originalEmbed], components: [] });

                await interaction.followUp({ content: '✅ Đã phê duyệt!', flags: MessageFlags.Ephemeral });
            } else if (interaction.customId.startsWith('ongmat_reject_')) {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                const regId = interaction.customId.split('_')[2];
                let ongmat = loadData(ONGMAT_FILE, {});
                const entry = ongmat[regId];
                if (!entry) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                entry.status = 'rejected';
                saveData(ONGMAT_FILE, ongmat);

                // DM reject to user
                const userObj = await client.users.fetch(entry.userId);
                const dmEmbed = new EmbedBuilder()
                    .setTitle('❌ Đăng ký Ong Mật bị từ chối!')
                    .setDescription('Admin đã từ chối đơn đăng ký của bạn. Vui lòng liên hệ admin để biết lý do.')
                    .setColor('Red')
                    .setTimestamp();
                try {
                    await userObj.send({ embeds: [dmEmbed] });
                } catch (err) {
                    console.log('DM failed');
                }

                // Edit original message
                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã từ chối và thông báo qua DM.**');
                await interaction.update({ embeds: [originalEmbed], components: [] });

                await interaction.followUp({ content: '❌ Đã từ chối!', flags: MessageFlags.Ephemeral });
            } else if (interaction.customId.startsWith('hire_ongmat_')) {
                const regId = interaction.customId.split('_')[2];
                let ongmat = loadData(ONGMAT_FILE, {});
                const entry = ongmat[regId];
                if (!entry || entry.status !== 'approved') {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Ong Mật không khả dụng.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    let counters = loadData(Counters_FILE, { ongmatChannel: 0 });
                    const counter = ++counters.ongmatChannel;
                    saveData(COUNTERS_FILE, counters);

                    const guild = interaction.guild;
                    const channelName = `ong-mật-${counter}`;
                    const privateChannel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: null,
                        permissionOverwrites: [
                            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                            { id: entry.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                            { id: process.env.ADMIN_USER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                        ]
                    });

                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle('💬 Kênh trao đổi Ong Mật')
                        .setDescription(`Chào mừng <@${interaction.user.id}> (Ong Khách) và <@${entry.userId}> (Ong Mật)!\nHãy thảo luận chi tiết về dịch vụ ở đây.`)
                        .setColor('Blue')
                        .setTimestamp();

                    await privateChannel.send({ embeds: [welcomeEmbed] });

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Tạo kênh thành công!')
                        .setDescription(`Kênh riêng đã tạo: ${privateChannel}\nBắt đầu trao đổi với Ong Mật ngay!`)
                        .setColor('Green');
                    await interaction.editReply({ embeds: [successEmbed] });
                } catch (error) {
                    console.error(error);
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Có lỗi khi tạo kênh.').setColor('Red');
                    await interaction.editReply({ embeds: [errorEmbed] });
                }
            } else if (interaction.customId.startsWith('donate_ongmat_')) {
                const regId = interaction.customId.split('_')[2];
                let ongmat = loadData(ONGMAT_FILE, {});
                const entry = ongmat[regId];
                if (!entry || entry.status !== 'approved') {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Ong Mật không khả dụng.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                const modal = new ModalBuilder().setCustomId(`donate_modal_${regId}`).setTitle('Donate Bee Coin');
                const amountInput = new TextInputBuilder()
                    .setCustomId('donate_amount')
                    .setLabel('Số tiền Bee Coin donate')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(1)
                    .setPlaceholder('10');
                modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
                await interaction.showModal(modal);
            } else if (interaction.customId.startsWith('donate_modal_')) {
                const regId = interaction.customId.split('_')[2];
                let ongmat = loadData(ONGMAT_FILE, {});
                const entry = ongmat[regId];
                if (!entry || entry.status !== 'approved') {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Ong Mật không khả dụng.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                const amountStr = interaction.fields.getTextInputValue('donate_amount');
                const amount = parseInt(amountStr);
                if (amount <= 0) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Số tiền phải > 0.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                let users = loadData(USERS_FILE, {});
                const senderId = interaction.user.id;
                const sender = users[senderId] || { balance: 0 };
                if (sender.balance < amount) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Không đủ tiền!').setDescription('Số dư Bee Coin không đủ.').setColor('Red');
                    return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
                }

                // Execute donate
                sender.balance -= amount;
                const receiver = users[entry.userId] || { balance: 0 };
                receiver.balance += amount;
                users[senderId] = sender;
                users[entry.userId] = receiver;
                saveData(USERS_FILE, users);

                // DM to sender
                const senderDM = new EmbedBuilder()
                    .setTitle('✅ Donate thành công!')
                    .setDescription(`Bạn đã donate **${amount} <a:beecoin:1425342792569196607>** cho Ong Mật **${entry.hoTen}**.`)
                    .addFields({ name: 'Số dư hiện tại', value: `${sender.balance} <a:beecoin:1425342792569196607>`, inline: true })
                    .setColor('Green')
                    .setTimestamp();
                try {
                    await interaction.user.send({ embeds: [senderDM] });
                } catch (err) {
                    console.log('DM to sender failed');
                }

                // DM to receiver
                const receiverDM = new EmbedBuilder()
                    .setTitle('✅ Nhận donate thành công!')
                    .setDescription(`Bạn đã nhận **${amount} <a:beecoin:1425342792569196607>** donate từ <@${senderId}>.`)
                    .addFields({ name: 'Số dư hiện tại', value: `${receiver.balance} <a:beecoin:1425342792569196607>`, inline: true })
                    .setColor('Green')
                    .setTimestamp();
                try {
                    await client.users.fetch(entry.userId).then(user => user.send({ embeds: [receiverDM] }));
                } catch (err) {
                    console.log('DM to receiver failed');
                }

                await interaction.reply({ content: `✅ Đã donate **${amount} <a:beecoin:1425342792569196607>** thành công!`, flags: MessageFlags.Ephemeral });
            }
        });
    }
};
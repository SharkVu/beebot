require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, AttachmentBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Data paths
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending.json');
const COUNTERS_FILE = path.join(DATA_DIR, 'counters.json');
const TOPUP_MSG_FILE = path.join(DATA_DIR, 'topupMessage.json');
const WITHDRAW_MSG_FILE = path.join(DATA_DIR, 'withdrawMessage.json');
const ONGMAT_MSG_FILE = path.join(DATA_DIR, 'ongmatMessage.json');
const ONGMAT_FILE = path.join(DATA_DIR, 'ongmat.json');

// Load data
function loadData(file, defaultValue = {}) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
let users = loadData(USERS_FILE);
let pending = loadData(PENDING_FILE);
let counters = loadData(COUNTERS_FILE, { topupChannel: 0, ongmatChannel: 0 });
let topupMsgData = loadData(TOPUP_MSG_FILE, { messageId: null, channelId: process.env.TOPUP_CHANNEL_ID });
let withdrawMsgData = loadData(WITHDRAW_MSG_FILE, { messageId: null, channelId: process.env.WITHDRAW_CHANNEL_ID });
let ongmatMsgData = loadData(ONGMAT_MSG_FILE, { messageId: null, channelId: process.env.ONGMAT_CHANNEL_ID });
let ongmat = loadData(ONGMAT_FILE, {});

// Ensure counters.topupChannel is number
counters.topupChannel = parseInt(counters.topupChannel) || 0;
counters.ongmatChannel = parseInt(counters.ongmatChannel) || 0;

// Save data
function saveData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Commands collection
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
}

client.once('clientReady', async () => {
    console.log(`Bot ${client.user.tag} online!`);

    // Sync commands
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    await client.application.commands.set(commands);

    // Handle topup button: Delete old if exists, send new
    const topupChannel = client.channels.cache.get(process.env.TOPUP_CHANNEL_ID);
    if (topupChannel) {
        if (topupMsgData.messageId) {
            try {
                await topupChannel.messages.delete(topupMsgData.messageId);
                console.log(`Đã xóa embed/nút topup cũ: ${topupMsgData.messageId}`);
            } catch (err) {
                console.log('Không tìm thấy message topup cũ để xóa');
            }
        }

        const infoEmbed = new EmbedBuilder()
            .setTitle('💰 Nạp tiền Bee Coin')
            .setDescription('Vui lòng ấn nút nạp tiền bên dưới để nạp tiền vào tài khoản của bạn đổi Bee Coin (<a:beecoin:1425342792569196607>). Số tiền nạp tối thiểu là 10,000 VND.')
            .setColor('Gold')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('topup_button').setLabel('Nạp Tiền').setStyle(ButtonStyle.Success)
        );

        const newMsg = await topupChannel.send({ embeds: [infoEmbed], components: [row] });
        topupMsgData.messageId = newMsg.id;
        saveData(TOPUP_MSG_FILE, topupMsgData);
        console.log(`Nút topup mới đã gửi. Message ID: ${newMsg.id}`);
    }

    // Handle withdraw button: Delete old if exists, send new
    const withdrawChannel = client.channels.cache.get(process.env.WITHDRAW_CHANNEL_ID);
    if (withdrawChannel) {
        if (withdrawMsgData.messageId) {
            try {
                await withdrawChannel.messages.delete(withdrawMsgData.messageId);
                console.log(`Đã xóa embed/nút withdraw cũ: ${withdrawMsgData.messageId}`);
            } catch (err) {
                console.log('Không tìm thấy message withdraw cũ để xóa');
            }
        }

        const withdrawEmbed = new EmbedBuilder()
            .setTitle('💸 Rút tiền Bee Coin')
            .setDescription('Vui lòng ấn nút rút tiền bên dưới để rút Bee Coin về tài khoản ngân hàng. Số tiền rút tối thiểu là 10 Bee Coin (sẽ trừ 30% phí duy trì server).')
            .setColor('Gold')
            .setTimestamp();

        const withdrawRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('withdraw_button').setLabel('Rút Tiền').setStyle(ButtonStyle.Primary)
        );

        const newWithdrawMsg = await withdrawChannel.send({ embeds: [withdrawEmbed], components: [withdrawRow] });
        withdrawMsgData.messageId = newWithdrawMsg.id;
        saveData(WITHDRAW_MSG_FILE, withdrawMsgData);
        console.log(`Nút withdraw mới đã gửi. Message ID: ${newWithdrawMsg.id}`);
    }

    // Handle ongmat button: Delete old if exists, send new
    const ongmatChannel = client.channels.cache.get(process.env.ONGMAT_CHANNEL_ID);
    if (ongmatChannel) {
        if (ongmatMsgData.messageId) {
            try {
                await ongmatChannel.messages.delete(ongmatMsgData.messageId);
                console.log(`Đã xóa embed/nút ongmat cũ: ${ongmatMsgData.messageId}`);
            } catch (err) {
                console.log('Không tìm thấy message ongmat cũ để xóa');
            }
        }

        const ongmatEmbed = new EmbedBuilder()
            .setTitle('🐝 Đăng ký tham gia Ong Mật')
            .setDescription('Bạn muốn trở thành Ong Mật (người được thuê) trong Tổ Ong? Ấn nút bên dưới để đăng ký và chờ admin phê duyệt.')
            .setColor('Gold')
            .setTimestamp();

        const ongmatRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ongmat_button').setLabel('Đăng ký tham gia Ong Mật').setStyle(ButtonStyle.Success)
        );

        const newOngmatMsg = await ongmatChannel.send({ embeds: [ongmatEmbed], components: [ongmatRow] });
        ongmatMsgData.messageId = newOngmatMsg.id;
        saveData(ONGMAT_MSG_FILE, ongmatMsgData);
        console.log(`Nút ongmat mới đã gửi. Message ID: ${newOngmatMsg.id}`);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Có lỗi xảy ra.').setColor('Red');
            await interaction.reply({ embeds: [errorEmbed] });
        }
    } else if (interaction.isButton()) {
        if (interaction.customId === 'topup_button') {
            if (interaction.user.bot) return;
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
        } else if (interaction.customId === 'withdraw_button') {
            if (interaction.user.bot) return;
            // Check balance >= 10
            const userId = interaction.user.id;
            let usersLocal = loadData(USERS_FILE);
            const user = usersLocal[userId] || { balance: 0 };
            if (user.balance < 10) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không đủ tiền!').setDescription('Số dư Bee Coin phải >= 10 để rút.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const modal = new ModalBuilder().setCustomId('withdraw_modal').setTitle('Nhập thông tin rút tiền');
            const accountInput = new TextInputBuilder()
                .setCustomId('account')
                .setLabel('Số tài khoản')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(8)
                .setMaxLength(20)
                .setPlaceholder('1234567890');
            const bankInput = new TextInputBuilder()
                .setCustomId('bank')
                .setLabel('Tên ngân hàng')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Vietcombank');
            const ownerInput = new TextInputBuilder()
                .setCustomId('owner')
                .setLabel('Chủ tài khoản')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Nguyen Van A');
            const beeAmountInput = new TextInputBuilder()
                .setCustomId('bee_amount')
                .setLabel('Số tiền rút (BeeCoin, min 10)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(2)
                .setPlaceholder('10');
            modal.addComponents(
                new ActionRowBuilder().addComponents(accountInput),
                new ActionRowBuilder().addComponents(bankInput),
                new ActionRowBuilder().addComponents(ownerInput),
                new ActionRowBuilder().addComponents(beeAmountInput)
            );
            await interaction.showModal(modal);
        } else if (interaction.customId === 'ongmat_button') {
            if (interaction.user.bot) return;
            const userId = interaction.user.id;
            let ongmatLocal = loadData(ONGMAT_FILE);
            const hasRegistration = Object.values(ongmatLocal).some(entry => entry.userId === userId && entry.status !== 'rejected');
            if (hasRegistration) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Bạn đã đăng ký rồi! Mỗi người chỉ được đăng ký 1 lần.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
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
        } else if (interaction.customId.startsWith('approve_')) {
            // Check admin/manager permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const txnRef = interaction.customId.split('_')[1];
            let pendingLocal = loadData(PENDING_FILE);
            const pend = pendingLocal[txnRef];
            if (!pend || pend.type !== 'topup') {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const userId = pend.userId;
            const amount = pend.amount;
            const firstTopup = pend.firstTopup;
            let usersLocal = loadData(USERS_FILE);
            let user = usersLocal[userId] || { balance: 0, firstTopup: true };
            const baseCoins = (amount / 10000) * 7;
            let bonus = 0;
            if (firstTopup) {
                bonus = baseCoins * 0.05;
                user.firstTopup = false;
            }
            const totalCoins = Math.floor(baseCoins) + Math.ceil(bonus);
            user.balance += totalCoins;
            usersLocal[userId] = user;
            saveData(USERS_FILE, usersLocal);
            delete pendingLocal[txnRef];
            saveData(PENDING_FILE, pendingLocal);

            // DM success to user
            const userObj = await client.users.fetch(userId);
            const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const dmEmbed = new EmbedBuilder()
                .setTitle('✅ Nạp tiền thành công!')
                .setDescription(`Bạn đã nạp **${amount.toLocaleString()} VND** và nhận **${totalCoins} <a:beecoin:1425342792569196607>** ${bonus > 0 ? '(+5% bonus lần đầu)' : ''}.`)
                .addFields({ name: 'Số dư hiện tại', value: `${user.balance} <a:beecoin:1425342792569196607>`, inline: true })
                .setColor('Green')
                .setTimestamp();
            try {
                await userObj.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log('DM failed');
            }

            // Announce to saoke channel
            const saokeChannel = client.channels.cache.get(process.env.SAOKE_CHANNEL_ID);
            if (saokeChannel) {
                const announceEmbed = new EmbedBuilder()
                    .setTitle('SAO KÊ NẠP TIỀN')
                    .setDescription(`Người dùng: <@${userId}>\nSố tiền nạp: ${amount.toLocaleString()} VND\nSố coin nhận: ${totalCoins} <a:beecoin:1425342792569196607> ${bonus > 0 ? '(+5% bonus)' : ''}\nThời gian: ${now}\nĐã nạp tiền thành công`)
                    .setColor('Green')
                    .setTimestamp();
                await saokeChannel.send({ embeds: [announceEmbed] });
            }

            // Edit original message
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã xác nhận thành công và thông báo qua DM.**');
            await interaction.update({ embeds: [originalEmbed], components: [] });

            await interaction.followUp({ content: '✅ Đã phê duyệt!', flags: MessageFlags.Ephemeral });
        } else if (interaction.customId.startsWith('reject_')) {
            // Check admin/manager permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const txnRef = interaction.customId.split('_')[1];
            let pendingLocal = loadData(PENDING_FILE);
            const pend = pendingLocal[txnRef];
            if (!pend || pend.type !== 'topup') {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const userId = pend.userId;

            // DM reject to user
            const userObj = await client.users.fetch(userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('❌ Yêu cầu nạp tiền bị từ chối!')
                .setDescription('Admin đã từ chối yêu cầu của bạn. Vui lòng liên hệ admin để biết lý do.')
                .setColor('Red')
                .setTimestamp();
            try {
                await userObj.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log('DM failed');
            }

            delete pendingLocal[txnRef];
            saveData(PENDING_FILE, pendingLocal);

            // Edit original message
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã từ chối và thông báo qua DM.**');
            await interaction.update({ embeds: [originalEmbed], components: [] });

            await interaction.followUp({ content: '❌ Đã từ chối!', flags: MessageFlags.Ephemeral });
        } else if (interaction.customId.startsWith('withdraw_approve_')) {
            // Check admin/manager permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const txnRef = interaction.customId.split('_')[2];
            let pendingLocal = loadData(PENDING_FILE);
            const pend = pendingLocal[txnRef];
            if (!pend || pend.type !== 'withdraw') {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const userId = pend.userId;
            const beeAmount = pend.beeAmount;
            let usersLocal = loadData(USERS_FILE);
            let user = usersLocal[userId] || { balance: 0 };
            if (user.balance < beeAmount) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Số dư không đủ.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
            user.balance -= beeAmount;
            usersLocal[userId] = user;
            saveData(USERS_FILE, usersLocal);
            delete pendingLocal[txnRef];
            saveData(PENDING_FILE, pendingLocal);

            // DM success to user
            const userObj = await client.users.fetch(userId);
            const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const vndAmount = pend.vndAmount;
            const dmEmbed = new EmbedBuilder()
                .setTitle('✅ Rút tiền thành công!')
                .setDescription(`Bạn đã rút **${beeAmount} <a:beecoin:1425342792569196607>** tương đương **${vndAmount.toLocaleString()} VND** (sau trừ 30% phí server).`)
                .addFields(
                    { name: 'Thông tin chuyển khoản', value: `Tài khoản: ${pend.account}\nNgân hàng: ${pend.bank}\nChủ tài khoản: ${pend.owner}`, inline: false },
                    { name: 'Số dư hiện tại', value: `${user.balance} <a:beecoin:1425342792569196607>`, inline: true }
                )
                .setColor('Green')
                .setTimestamp();
            try {
                await userObj.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log('DM failed');
            }

            // Announce to saoke channel
            const saokeChannel = client.channels.cache.get(process.env.SAOKE_CHANNEL_ID);
            if (saokeChannel) {
                const announceEmbed = new EmbedBuilder()
                    .setTitle('SAO KÊ RÚT TIỀN')
                    .setDescription(`Người dùng: <@${userId}>\nSố coin rút: ${beeAmount} <a:beecoin:1425342792569196607>\nSố tiền VND: ${vndAmount.toLocaleString()} VND (sau phí 30%)\nThời gian: ${now}\nĐã rút tiền thành công`)
                    .setColor('Blue')
                    .setTimestamp();
                await saokeChannel.send({ embeds: [announceEmbed] });
            }

            // Edit original message
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã xác nhận thành công và thông báo qua DM.**');
            await interaction.update({ embeds: [originalEmbed], components: [] });

            await interaction.followUp({ content: '✅ Đã phê duyệt rút!', flags: MessageFlags.Ephemeral });
        } else if (interaction.customId.startsWith('withdraw_reject_')) {
            // Check admin/manager permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const txnRef = interaction.customId.split('_')[2];
            let pendingLocal = loadData(PENDING_FILE);
            const pend = pendingLocal[txnRef];
            if (!pend || pend.type !== 'withdraw') {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const userId = pend.userId;

            // DM reject to user
            const userObj = await client.users.fetch(userId);
            const dmEmbed = new EmbedBuilder()
                .setTitle('❌ Yêu cầu rút tiền bị từ chối!')
                .setDescription('Admin đã từ chối yêu cầu của bạn. Vui lòng liên hệ admin để biết lý do.')
                .setColor('Red')
                .setTimestamp();
            try {
                await userObj.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.log('DM failed');
            }

            delete pendingLocal[txnRef];
            saveData(PENDING_FILE, pendingLocal);

            // Edit original message
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã từ chối và thông báo qua DM.**');
            await interaction.update({ embeds: [originalEmbed], components: [] });

            await interaction.followUp({ content: '❌ Đã từ chối rút!', flags: MessageFlags.Ephemeral });
        } else if (interaction.customId.startsWith('ongmat_approve_')) {
            // Check admin/manager permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const regId = interaction.customId.split('_')[2];
            let ongmatLocal = loadData(ONGMAT_FILE);
            const entry = ongmatLocal[regId];
            if (!entry) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            entry.status = 'approved';
            saveData(ONGMAT_FILE, ongmatLocal);

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
                    .setThumbnail(entry.avatarUrl)
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
            // Check admin/manager permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ admin/manager mới ấn được.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const regId = interaction.customId.split('_')[2];
            let ongmatLocal = loadData(ONGMAT_FILE);
            const entry = ongmatLocal[regId];
            if (!entry) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            entry.status = 'rejected';
            saveData(ONGMAT_FILE, ongmatLocal);

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
            let ongmatLocal = loadData(ONGMAT_FILE);
            const entry = ongmatLocal[regId];
            if (!entry || entry.status !== 'approved') {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Ong Mật không khả dụng.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                let countersLocal = loadData(COUNTERS_FILE);
                countersLocal.ongmatChannel = parseInt(countersLocal.ongmatChannel) || 0;
                const counter = ++countersLocal.ongmatChannel;
                saveData(COUNTERS_FILE, countersLocal);

                const guild = interaction.guild;
                const channelName = `ong-mật-${counter}`;

                const permissionOverwrites = [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: entry.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ];

                if (process.env.ADMIN_USER_ID) {
                    permissionOverwrites.push({
                        id: process.env.ADMIN_USER_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    });
                }

                const privateChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: null,
                    permissionOverwrites
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
            let ongmatLocal = loadData(ONGMAT_FILE);
            const entry = ongmatLocal[regId];
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
        } else if (interaction.customId.startsWith('transfer_approve_')) {
            console.log(`[DEBUG] Transfer approve button clicked: ${interaction.customId} by user ${interaction.user.id}`);

            // Reload pending from file using correct path
            let pendingLocal = {};
            if (fs.existsSync(PENDING_FILE)) {
                pendingLocal = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
                console.log(`[DEBUG] Pending file exists and loaded. Keys: ${Object.keys(pendingLocal).join(', ')}`);
            } else {
                console.log(`[DEBUG] Pending file does not exist at ${PENDING_FILE}`);
            }

            // Only sender can approve
            const txnRef = interaction.customId.split('_')[2];
            console.log(`[DEBUG] Extracted txnRef: ${txnRef}`);
            const pend = pendingLocal[txnRef];
            console.log(`[DEBUG] Pending entry for ${txnRef}:`, pend);

            if (!pend || pend.type !== 'transfer') {
                console.log(`[DEBUG] Invalid pending: !pend=${!pend}, type=${pend ? pend.type : 'undefined'}`);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            if (interaction.user.id !== pend.senderId) {
                console.log(`[DEBUG] Unauthorized: user ${interaction.user.id} != sender ${pend.senderId}`);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ người gửi tiền mới có thể phê duyệt.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const senderId = pend.senderId;
            const receiverId = pend.receiverId;
            const amount = pend.amount;

            let usersLocal = loadData(USERS_FILE);
            let sender = usersLocal[senderId] || { balance: 0 };
            let receiver = usersLocal[receiverId] || { balance: 0 };

            console.log(`[DEBUG] Sender balance before: ${sender.balance}, amount: ${amount}`);

            if (sender.balance < amount) {
                console.log(`[DEBUG] Insufficient balance: ${sender.balance} < ${amount}`);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Bạn không đủ tiền để chuyển.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            // Execute transfer
            sender.balance -= amount;
            receiver.balance += amount;
            usersLocal[senderId] = sender;
            usersLocal[receiverId] = receiver;
            saveData(USERS_FILE, usersLocal);
            delete pendingLocal[txnRef];
            saveData(PENDING_FILE, pendingLocal);  // Save using saveData function

            // Sync global pending for consistency (optional but good)
            pending = pendingLocal;

            console.log(`[DEBUG] Transfer executed. Sender new balance: ${sender.balance}, Receiver new balance: ${receiver.balance}`);
            console.log(`[DEBUG] Pending after delete. Keys: ${Object.keys(pendingLocal).join(', ')}`);

            // DM to sender
            const senderObj = await client.users.fetch(senderId);
            const senderDM = new EmbedBuilder()
                .setTitle('✅ Chuyển tiền thành công!')
                .setDescription(`Bạn đã chuyển **${amount} <a:beecoin:1425342792569196607>** cho <@${receiverId}>.`)
                .addFields({ name: 'Số dư hiện tại', value: `${sender.balance} <a:beecoin:1425342792569196607>`, inline: true })
                .setColor('Green')
                .setTimestamp();
            try {
                await senderObj.send({ embeds: [senderDM] });
                console.log(`[DEBUG] DM to sender sent successfully`);
            } catch (err) {
                console.log('DM to sender failed:', err);
            }

            // DM to receiver
            const receiverObj = await client.users.fetch(receiverId);
            const receiverDM = new EmbedBuilder()
                .setTitle('✅ Nhận tiền thành công!')
                .setDescription(`Bạn đã nhận **${amount} <a:beecoin:1425342792569196607>** từ <@${senderId}>.`)
                .addFields({ name: 'Số dư hiện tại', value: `${receiver.balance} <a:beecoin:1425342792569196607>`, inline: true })
                .setColor('Green')
                .setTimestamp();
            try {
                await receiverObj.send({ embeds: [receiverDM] });
                console.log(`[DEBUG] DM to receiver sent successfully`);
            } catch (err) {
                console.log('DM to receiver failed:', err);
            }

            // Edit original message
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã xác nhận và chuyển tiền thành công.**');
            await interaction.update({ embeds: [originalEmbed], components: [] });

            await interaction.followUp({ content: '✅ Chuyển tiền thành công!' });
        } else if (interaction.customId.startsWith('transfer_cancel_')) {
            console.log(`[DEBUG] Transfer cancel button clicked: ${interaction.customId} by user ${interaction.user.id}`);

            // Reload pending from file using correct path
            let pendingLocal = {};
            if (fs.existsSync(PENDING_FILE)) {
                pendingLocal = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
                console.log(`[DEBUG] Pending file exists and loaded. Keys: ${Object.keys(pendingLocal).join(', ')}`);
            } else {
                console.log(`[DEBUG] Pending file does not exist at ${PENDING_FILE}`);
            }

            // Only sender can cancel
            const txnRef = interaction.customId.split('_')[2];
            console.log(`[DEBUG] Extracted txnRef: ${txnRef}`);
            const pend = pendingLocal[txnRef];
            console.log(`[DEBUG] Pending entry for ${txnRef}:`, pend);

            if (!pend || pend.type !== 'transfer') {
                console.log(`[DEBUG] Invalid pending: !pend=${!pend}, type=${pend ? pend.type : 'undefined'}`);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Yêu cầu không tồn tại.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            if (interaction.user.id !== pend.senderId) {
                console.log(`[DEBUG] Unauthorized: user ${interaction.user.id} != sender ${pend.senderId}`);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không có quyền!').setDescription('Chỉ người gửi tiền mới có thể hủy.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            const senderId = pend.senderId;
            const receiverId = pend.receiverId;

            // DM to receiver about cancellation
            const receiverObj = await client.users.fetch(receiverId);
            const receiverDM = new EmbedBuilder()
                .setTitle('❌ Yêu cầu chuyển tiền bị hủy!')
                .setDescription(`<@${senderId}> đã hủy yêu cầu chuyển tiền.`)
                .setColor('Red')
                .setTimestamp();
            try {
                await receiverObj.send({ embeds: [receiverDM] });
                console.log(`[DEBUG] DM to receiver (cancel) sent successfully`);
            } catch (err) {
                console.log('DM failed:', err);
            }

            delete pendingLocal[txnRef];
            saveData(PENDING_FILE, pendingLocal);  // Save using saveData function

            // Sync global pending for consistency (optional but good)
            pending = pendingLocal;

            console.log(`[DEBUG] Cancel executed. Pending after delete. Keys: ${Object.keys(pendingLocal).join(', ')}`);

            // Edit original message
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(interaction.message.embeds[0].description + '\n\n**Đã hủy yêu cầu chuyển tiền.**');
            await interaction.update({ embeds: [originalEmbed], components: [] });

            await interaction.followUp({ content: '❌ Đã hủy chuyển tiền!' });
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'topup_modal') {
            const amountStr = interaction.fields.getTextInputValue('amount');
            const amount = parseInt(amountStr.replace(/,/g, ''));
            if (amount < 10000) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Số tiền tối thiểu 10,000 VND.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed] });
            }

            // Reply immediately to prevent timeout
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                // Create private channel
                const guild = interaction.guild;
                const userId = interaction.user.id.toString();
                const last4Digits = userId.slice(-4); // Lấy 4 chữ số cuối của UID
                const channelName = `nạp-tiền-BC${last4Digits}`;

                const permissionOverwrites = [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ];

                if (process.env.ADMIN_USER_ID) {
                    permissionOverwrites.push({
                        id: process.env.ADMIN_USER_ID,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    });
                }

                const privateChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: null,
                    permissionOverwrites
                });

                // Generate txnRef
                const txnRef = `${interaction.user.id}-${Date.now()}`;

                // Short content: Nạp -BC<4 last digits of UID>
                const shortUid = interaction.user.id.slice(-4);
                const transferContent = `Nạp -BC${shortUid}`;

                // Save pending
                let pendingLocal = loadData(PENDING_FILE);
                let usersLocal = loadData(USERS_FILE);
                const firstTopup = (usersLocal[interaction.user.id] || { firstTopup: true }).firstTopup;
                pendingLocal[txnRef] = { type: 'topup', userId: interaction.user.id, amount, channelId: privateChannel.id, firstTopup };
                saveData(PENDING_FILE, pendingLocal);

                // Send QR to private channel
                const qrPath = path.join(__dirname, 'assets/qr.png');
                if (!fs.existsSync(qrPath)) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('File QR không tồn tại ở assets/qr.png.').setColor('Red');
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                const qrAttachment = new AttachmentBuilder(qrPath, 'qr.png');

                const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const qrEmbed = new EmbedBuilder()
                    .setTitle('📱 QR Nạp Tiền')
                    .setDescription(`**Số tiền:** ${amount.toLocaleString()} VND\n**Hướng dẫn:** Quét QR bên dưới bằng app ngân hàng để chuyển khoản đúng số tiền.\n**Nội dung chuyển:** "${transferContent}". \nSau khi chuyển, gửi screenshot hoặc báo txnRef cho admin (qua kênh này) để cộng Bee Coin (tỷ lệ: 10,000 VND = 7 <a:beecoin:1425342792569196607>, +5% bonus lần đầu).\n**Lưu ý:** Chuyển khoản chỉ trong Việt Nam. Admin sẽ confirm thủ công.`)
                    .setColor('Blue')
                    .setImage('attachment://qr.png')
                    .setTimestamp()
                    .setFooter({ text: `Txn Ref: ${txnRef} - Báo admin để confirm` });

                await privateChannel.send({ embeds: [qrEmbed], files: [qrAttachment] });

                // Send request to config channel
                const configChannel = client.channels.cache.get(process.env.CONFIG_CHANNEL_ID);
                if (!configChannel) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Không tìm thấy kênh config.').setColor('Red');
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                const requestEmbed = new EmbedBuilder()
                    .setTitle('YÊU CẦU NẠP TIỀN')
                    .setDescription(`Người dùng: <@${interaction.user.id}>\nSố tiền: ${amount.toLocaleString()} VND\nThời gian: ${now}`)
                    .setColor('Orange')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`approve_${txnRef}`).setLabel('Phê duyệt').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`reject_${txnRef}`).setLabel('Từ chối').setStyle(ButtonStyle.Danger)
                );

                await configChannel.send({ embeds: [requestEmbed], components: [row] });

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Yêu cầu nạp tiền!')
                    .setDescription(`Kênh riêng đã tạo: ${privateChannel}\nQR đã gửi vào kênh. Chuyển khoản xong, chờ admin confirm để cộng tiền vào ví (/vi để kiểm tra).`)
                    .setColor('Green');
                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                console.error(error);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Có lỗi xảy ra khi xử lý yêu cầu.').setColor('Red');
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        } else if (interaction.customId === 'withdraw_modal') {
            const account = interaction.fields.getTextInputValue('account');
            const bank = interaction.fields.getTextInputValue('bank');
            const owner = interaction.fields.getTextInputValue('owner');
            const beeAmountStr = interaction.fields.getTextInputValue('bee_amount');
            const beeAmount = parseInt(beeAmountStr);
            if (beeAmount < 10) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Số tiền rút tối thiểu 10 Bee Coin.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            // Reply immediately to prevent timeout
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const userId = interaction.user.id;
                let usersLocal = loadData(USERS_FILE);
                const user = usersLocal[userId] || { balance: 0 };
                if (user.balance < beeAmount) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Không đủ tiền!').setDescription('Số dư Bee Coin không đủ để rút.').setColor('Red');
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                // Calculate VND: (beeAmount / 7) * 10000 * 0.6 (trừ 40%)
                const vndAmount = Math.floor((beeAmount / 7) * 10000 * 0.7);

                // Generate txnRef
                const txnRef = `w-${interaction.user.id}-${Date.now()}`;

                // Save pending
                let pendingLocal = loadData(PENDING_FILE);
                pendingLocal[txnRef] = { type: 'withdraw', userId, beeAmount, vndAmount, account, bank, owner };
                saveData(PENDING_FILE, pendingLocal);

                // Send request to config channel
                const configChannel = client.channels.cache.get(process.env.CONFIG_CHANNEL_ID);
                if (!configChannel) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Không tìm thấy kênh config.').setColor('Red');
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const requestEmbed = new EmbedBuilder()
                    .setTitle('YÊU CẦU RÚT TIỀN')
                    .setDescription(`Người dùng: <@${interaction.user.id}>\nSố Bee Coin rút: ${beeAmount}\nSố tiền VND: ${vndAmount.toLocaleString()} (sau trừ 30% phí)\nThông tin: Tài khoản ${account} - ${bank} - ${owner}\nThời gian: ${now}`)
                    .setColor('Orange')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`withdraw_approve_${txnRef}`).setLabel('Phê duyệt').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`withdraw_reject_${txnRef}`).setLabel('Từ chối').setStyle(ButtonStyle.Danger)
                );

                await configChannel.send({ embeds: [requestEmbed], components: [row] });

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Yêu cầu rút tiền!')
                    .setDescription(`Yêu cầu rút **${beeAmount} <a:beecoin:1425342792569196607>** đã gửi đến admin. Chờ confirm để nhận **${vndAmount.toLocaleString()} VND**.`)
                    .setColor('Green');
                await interaction.editReply({ embeds: [successEmbed] });
            } catch (error) {
                console.error(error);
                const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Có lỗi xảy ra khi xử lý yêu cầu.').setColor('Red');
                await interaction.editReply({ embeds: [errorEmbed] });
            }
        } else if (interaction.customId === 'ongmat_modal') {
            const hoTen = interaction.fields.getTextInputValue('ho_ten');
            const tuoi = interaction.fields.getTextInputValue('tuoi');
            const gioiTinh = interaction.fields.getTextInputValue('gioi_tinh');
            const linkFb = interaction.fields.getTextInputValue('link_fb');
            const moTa = interaction.fields.getTextInputValue('mo_ta');

            // Reply immediately to prevent timeout
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            try {
                const userId = interaction.user.id;
                const regId = `${userId}-${Date.now()}`;
                const userObj = await client.users.fetch(userId);
                const avatarUrl = userObj.displayAvatarURL({ dynamic: true, size: 256 });

                // Save to ongmat
                let ongmatLocal = loadData(ONGMAT_FILE);
                ongmatLocal[regId] = {
                    userId,
                    hoTen,
                    tuoi,
                    gioiTinh,
                    linkFb,
                    moTa,
                    avatarUrl,
                    status: 'pending',
                    timestamp: new Date().toISOString()
                };
                saveData(ONGMAT_FILE, ongmatLocal);

                // Send request to dangky channel
                const dangkyChannel = await interaction.guild.channels.fetch(process.env.DANGKY_CHANNEL_ID);
                if (!dangkyChannel) {
                    const errorEmbed = new EmbedBuilder().setTitle('❌ Lỗi!').setDescription('Không tìm thấy kênh đăng ký.').setColor('Red');
                    return await interaction.editReply({ embeds: [errorEmbed] });
                }

                const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const requestEmbed = new EmbedBuilder()
                    .setTitle('🆕 YÊU CẦU ĐĂNG KÝ ONG MẬT')
                    .setDescription(`Người dùng: <@${userId}>\nThời gian: ${now}`)
                    .setThumbnail(avatarUrl)
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
        } else if (interaction.customId.startsWith('donate_modal_')) {
            const regId = interaction.customId.split('_')[2];
            let ongmatLocal = loadData(ONGMAT_FILE);
            const entry = ongmatLocal[regId];
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

            let usersLocal = loadData(USERS_FILE);
            const senderId = interaction.user.id;
            const sender = usersLocal[senderId] || { balance: 0 };
            if (sender.balance < amount) {
                const errorEmbed = new EmbedBuilder().setTitle('❌ Không đủ tiền!').setDescription('Số dư Bee Coin không đủ.').setColor('Red');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            // Execute donate
            sender.balance -= amount;
            const receiver = usersLocal[entry.userId] || { balance: 0 };
            receiver.balance += amount;
            usersLocal[senderId] = sender;
            usersLocal[entry.userId] = receiver;
            saveData(USERS_FILE, usersLocal);

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
                const receiverObj = await client.users.fetch(entry.userId);
                await receiverObj.send({ embeds: [receiverDM] });
            } catch (err) {
                console.log('DM to receiver failed');
            }

            await interaction.reply({ content: `✅ Đã donate **${amount} <a:beecoin:1425342792569196607>** thành công!`, flags: MessageFlags.Ephemeral });
        }
    }
});

// Login
client.login(process.env.BOT_TOKEN);
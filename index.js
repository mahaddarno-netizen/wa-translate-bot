const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { translate } = require('google-translate-api-x')
const qrcode = require('qrcode-terminal')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, printQRInTerminal: true })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr) qrcode.generate(qr, { small: true })
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('Bot nyala!')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if(!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        const from = msg.key.remoteJid

        if(text?.startsWith('/tr ')) {
            const parts = text.split(' ')
            const targetLang = parts[1]
            const textToTranslate = parts.slice(2).join(' ')

            try {
                const res = await translate(textToTranslate, { to: targetLang })
                await sock.sendMessage(from, {
                    text: `*[${res.from.language.iso} → ${targetLang}]*\n${res.text}`
                }, { quoted: msg })
            } catch (e) {
                await sock.sendMessage(from, { text: 'Gagal translate. Contoh: /tr id hello' }, { quoted: msg })
            }
        }
    })
}

startBot()

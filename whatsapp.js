
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");
require("dotenv").config();

const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

const OWNER_NUMBERS = [
    "6282154017135", // Slot 1: Nomor kamu
    "6281347562627"  // Slot 2: Nomor teman
]

const commandList = {
    ".sticker": "sticker",
    ".s": "sticker",
    ".menu": "menu",
    ".help": "menu",
    ".ping": "ping",
    ".pinterest": "pinterest",
    ".pin": "pin",
    ".botoff": "botoff",
    ".boton": "boton"
};


let botEnabled = true;

const { createSticker } = require("./sticker");

async function downloadImage(imageMessage) {
    const stream = await downloadContentFromMessage(
        imageMessage,
        "image"
    );

    const chunks = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

async function sendRandomImage(sock, jid, type, quoted) {
    try {
        let imageUrl;
        let caption;

        if (type === "kucing" || type === "cat") {
            const response = await fetch(
                "https://api.thecatapi.com/v1/images/search"
            );

            const data = await response.json();

            imageUrl = data[0]?.url;
            caption = "🐱 Kucing random";

        } else if (type === "anime") {
            const response = await fetch(
                "https://api.nekosapi.com/v4/images/random?rating=safe&limit=1"
            );

            if (!response.ok) {
                throw new Error(`Neko API error: ${response.status}`);
            }

            const data = await response.json();

            imageUrl = data[0]?.url || data[0]?.image_url;
            caption = "🌸 Anime random dari Neko API";

        } else {
            await sock.sendMessage(jid, {
                text: "Gunakan:\n.pin kucing\n.pin anime"
            }, { quoted });

            return;
        }
             if (!imageUrl) {
            throw new Error("URL gambar tidak ditemukan");
        }

        await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption
        }, { quoted });

    } catch (error) {
        console.error("Random image error:", error);

        await sock.sendMessage(jid, {
            text: "Gagal mengambil gambar. Coba lagi nanti."
        }, { quoted });
    }
}  

async function searchPinterest(sock, jid, query, quoted) {
    const token = process.env.PINTEREST_ACCESS_TOKEN;

    if (!token) {
        await sock.sendMessage(jid, {
            text: "Token Pinterest belum diatur di file .env"
        }, { quoted });

        return;
    }

    if (!query) {
        await sock.sendMessage(jid, {
            text: "Contoh penggunaan:\n.pinterest anime"
        }, { quoted });

        return;
    }

    try {
        const url = new URL(
            "https://api.pinterest.com/v5/search/partner/pins"
        );

        url.searchParams.set("term", query);
        url.searchParams.set("country_code", "ID");
        url.searchParams.set("limit", "5");

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(
                `Pinterest API error: ${response.status}`
            );
        }

        const data = await response.json();
        const pins = data.items || [];

        if (pins.length === 0) {
            await sock.sendMessage(jid, {
                text: `Tidak ada hasil Pinterest untuk: ${query}`
            }, { quoted });

            return;
        }

        for (const pin of pins.slice(0, 5)) {
            const images = pin.media?.images || {};

            const imageUrl =
                images["1200x"]?.url ||
                images["600x"]?.url ||
                images["400x300"]?.url;

            if (!imageUrl) continue;

            await sock.sendMessage(jid, {
                image: { url: imageUrl },
                caption: pin.title || `Pinterest: ${query}`
            }, { quoted });
        }

    } catch (error) {
        console.error("Pinterest error:", error);

        await sock.sendMessage(jid, {
            text: "Pinterest gagal diakses. Periksa token dan akses API kamu."
        }, { quoted });
    }
}

async function startBot() {
    const authFolder = path.join(__dirname, "../session");

    const { state, saveCreds } =
        await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("Scan QR berikut dengan WhatsApp:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log("Bot WhatsApp berhasil terhubung!");
        }

        if (connection === "close") {
            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log("Koneksi terputus. Menghubungkan ulang...");
                startBot();
            } else {
                console.log("Sesi logout. Hapus folder session dan scan ulang.");
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        for (const message of messages) {
            try {
                if (!message.message) continue;


                const jid = message.key.remoteJid;

                if (!jid) continue;

                const content = message.message;

                const text =
                    content.conversation ||
                    content.extendedTextMessage?.text ||
                    content.imageMessage?.caption ||
                    "";

                
const rawText = text.trim();
const parts = rawText.split(/\s+/);

const commandName = (parts[0] || "").toLowerCase();
const commandArgs = parts.slice(1).join(" ").trim();

const commandType = commandList[commandName];


                
function normalizeNumber(value) {
    if (!value) return "";

    return String(value)
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "");
}

const senderCandidates = [
    message.key.participant,
    message.key.participantAlt,
    message.key.remoteJid,
    message.key.remoteJidAlt
];

const senderNumbers = senderCandidates
    .map(normalizeNumber)
    .filter(Boolean);

const ownerNumbers = OWNER_NUMBERS.map(normalizeNumber);

const isOwner = senderNumbers.some(number =>
    ownerNumbers.includes(number)
);

console.log("Nomor pengirim terdeteksi:", senderNumbers);
console.log("Apakah pemilik:", isOwner);
console.log("Command:", commandName);



const sender =
    message.key.participant ||
    message.key.remoteJid;

const senderNumber = sender.split("@")[0];

// Periksa apakah pengirim adalah pemilik bot
// Command untuk mematikan bot
if (commandName === ".botoff") {
    if (!isOwner) {
        await sock.sendMessage(jid, {
            text: "Maaf, command ini hanya untuk pemilik bot."
        }, {
            quoted: message
        });

        continue;
    }

    botEnabled = false;

    await sock.sendMessage(jid, {
        text: "Bot berhasil dimatikan. Semua command dinonaktifkan."
    }, {
        quoted: message
    });

    console.log("Bot dimatikan oleh pemilik.");
    continue;
}

// Command untuk mengaktifkan bot
if (commandName === ".boton") {
    if (!isOwner) {
        await sock.sendMessage(jid, {
            text: "Maaf, command ini hanya untuk pemilik bot."
        }, {
            quoted: message
        });

        continue;
    }

    botEnabled = true;

    await sock.sendMessage(jid, {
        text: "Bot berhasil diaktifkan kembali!"
    }, {
        quoted: message
    });

    console.log("Bot diaktifkan oleh pemilik.");
    continue;
}

// Jika bot sedang mati, abaikan command anggota
if (!botEnabled) {
    continue;
}
                  

if (!commandType) {
    continue;
}


if (commandType === "menu") {
    await sock.sendMessage(jid, {
        text: `
╭─── BOT WHATSAPP ───
│
├ .sticker
├ .s
├ .menu
├ .help
├ .ping
├ .pinterest [kata kunci]
├ .pin kucing
├ .pin anime
├ .botoff (Admin only)
├ .boton (Admin only)
│
╰───────────────────
        `
    }, { quoted: message });

    continue;
}

if (commandType === "ping") {
    await sock.sendMessage(jid, {
        text: "Pong! Bot aktif."
    }, { quoted: message });

    continue;
}

if (commandType === "pinterest") {
    await searchPinterest(
        sock,
        jid,
        commandArgs,
        message
    );

    continue;
}

if (commandType === "pin") {
    await sendRandomImage(
        sock,
        jid,
        commandArgs.toLowerCase(),
        message
    );

    continue;
}

if (commandType === "ping") {
    await sock.sendMessage(jid, {
        text: "Pong! Bot aktif."
    }, {
        quoted: message
    });

    continue;
}

// Command sticker diteruskan ke proses pembuat stiker
if (commandType !== "sticker") {
    continue;
}


                let imageMessage = content.imageMessage;

                // Jika perintah membalas gambar
                if (!imageMessage) {
                    const quoted =
                        content.extendedTextMessage
                            ?.contextInfo
                            ?.quotedMessage;

                    imageMessage = quoted?.imageMessage;
                }

                if (!imageMessage) {
                    await sock.sendMessage(jid, {
                        text: "Kirim atau balas gambar dengan perintah .sticker"
                    }, {
                        quoted: message
                    });

                    continue;
                }

                await sock.sendMessage(jid, {
                    text: "Sedang membuat stiker..."
                }, {
                    quoted: message
                });

                const imageBuffer =
                    await downloadImage(imageMessage);

                const stickerBuffer =
                    await createSticker(imageBuffer);

                await sock.sendMessage(jid, {
                    sticker: stickerBuffer
                }, {
                    quoted: message
                });

                console.log("Stiker berhasil dikirim!");

            } catch (error) {
                console.error("Error membuat stiker:", error);
            }
        }
    });
}

startBot().catch(console.error);

	
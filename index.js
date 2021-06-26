// https://github.com/salismazaya/whatsapp-bot
// Jika ingin mengubah / mengedit, mohon untuk tidak menghilangkan link github asli di dalam bot terimakasih ^_^

const fs = require("fs");
const messageHandler = require("./messageHandler.js");
const http = require("http");
const qrcode = require("qrcode");
const { WAConnection } = require("@adiwajshing/baileys");

const conn = new WAConnection();
conn.version = [2, 2119, 6];
conn.maxCachedMessages = 15;

const server = http.createServer((req, res) => {
	if (req.url == "/") {
		res.end(fs.readFileSync("templates/index.html", "utf-8"));
	} else {
		res.end("404");
	}
})

const io = require("socket.io")(server);
io.on("connection", (socket) => {
	conn.on("qr", async (qr) => {
		const imgURI = await qrcode.toDataURL(qr);
		socket.emit("qr", imgURI);
	});

	conn.on("open", () => {
		socket.emit("connected");
	});
})


server.listen(process.env.PORT || 3000);

if (fs.existsSync("login.json")) conn.loadAuthInfo("login.json");

conn.on("chat-update", async (message) => {
	try {
		if (!message.hasNewMessage) return;
		message = message.messages.all()[0];
		if (!message.message || message.key.fromMe || message.key && message.key.remoteJid == 'status@broadcast') return;
		if (message.message.ephemeralMessage) {
			message.message = message.message.ephemeralMessage.message;
		}
		
		await messageHandler(conn, message);
	} catch(e) {
		console.log("[ERROR] " + e.message);
		conn.sendMessage(message.key.remoteJid, "Terjadi error! coba lagi nanti", "conversation", { quoted: message });
	}
});

const start = () => {
	conn.connect()
		.then(() => {
			fs.writeFileSync("login.json", JSON.stringify(conn.base64EncodedAuthInfo()));
			console.log("[OK] Login sukses! kirim !help untuk menampilkan perintah");
		})
		.catch(e => {
			if (fs.existsSync("login.json")) fs.unlinkSync("login.json");
			console.log("[ERROR] Login gagal!");
			conn.clearAuthInfo();
			start();
		});
}

start();

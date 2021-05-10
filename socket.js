//socketIo 모듈을 불러오기
const SocketIO = require("socket.io");
const Chat = require("./schema/chathistory");
const moment = require("moment");

//app.js와 websocket을 연결하는 작업
module.exports = (server, app) => {
	//path는 클라이언트쪽 코드와 맞춰놔야함(현재입력값이 디폴트값임.)
	const io = SocketIO(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"],
		},
	});
	app.set("io", io);
	// namespace
	const chatSpace = io.of("/chat");
	const globalSpace = io.of("/global");
	//server-side
	chatSpace.on("connection", async (socket) => {
		// 접속 이후 이하의 코드가 실행됨
		console.log("chat 네임스페이스에 접속", socket.id);
		socket.on("join", async (data) => {
			const req = socket.request;
			const {
				headers: { referer },
			} = req;
			console.log(referer); // 현재 웹페이지의 url을 가져올 수 있음, url에서 방 아이디 부분을 추출.
			const { room, username } = data;
			console.log("===roomId=====", data.room);
			console.log("===roomuser===", data.username);
			console.log("===referer===", referer);
			// room에 join되어 있는 클라이언트에게 메시지를 전송한다.
			socket.join(room); //특정 방에 접속하는 코드
			const chats = await Chat.find({ room });
			// room에 join된 클라이언트들에게 chats을 보낸다.
			chatSpace.to(room).emit("load", chats);
		});
		//send emit으로 받는 데이터
		socket.on("send", async (data) => {
			const { room } = data;
			const content = new Chat({
				room,
				msg: data.msg,
				user: data.username,
				time: data.time,
				// createAt은 임의로 생략
			});
			console.log("====content====", content);
			console.log("===data.msg====", data.msg);
			console.log("===data.username===", data.username);
			console.log("====time", data.time);
			await content.save();
			// 저장한 데이터를 클라이언트에게 receive라는 emit으로 전송
			io.of("/chat").to(room).emit("receive", content);
			//접속해제 시 방을 떠나는 코드
			socket.on("disconnect", () => {
				console.log("chat 네임스페이스 접속 해제");
				socket.leave(room);
			});
		});
	});

	//global socket 알림, 채팅 목록
	globalSpace.on("connection", function (socket) {
		socket.on("globalSend", async function (data) {
			console.log("====global====", data);
			globalSpace.emit("globalReceive", data);
		});
	});
};

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Khúc này báo cho server biết file mặt tiền ở đâu
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const rooms = {}; // Sổ ghi chép 10 phòng
const MAX_ROOMS = 10;
const MAX_USERS_PER_ROOM = 5;

io.on('connection', (socket) => {
  socket.emit('update_room_count', Object.keys(rooms).length, MAX_ROOMS);

  socket.on('join_room', (roomId) => {
    if (!rooms[roomId]) {
        if (Object.keys(rooms).length >= MAX_ROOMS) {
            socket.emit('error_msg', 'Rạp đã full 10 phòng, đợi xíu nha mấy ba!');
            return;
        }
        rooms[roomId] = { users: 0 };
    }

    if (rooms[roomId].users >= MAX_USERS_PER_ROOM) {
        socket.emit('error_msg', 'Phòng này chật cứng 5 người rồi!');
        return;
    }

    socket.join(roomId);
    rooms[roomId].users++;
    socket.roomId = roomId;

    io.to(roomId).emit('update_user_count', rooms[roomId].users, MAX_USERS_PER_ROOM);
    io.emit('update_room_count', Object.keys(rooms).length, MAX_ROOMS);
  });

  socket.on('send_msg', (msg) => {
     if (socket.roomId) io.to(socket.roomId).emit('receive_msg', msg);
  });

  socket.on('sync_video', (data) => {
     if (socket.roomId) socket.to(socket.roomId).emit('sync_video', data); 
  });

  socket.on('change_video', (videoId) => {
     if(socket.roomId) io.to(socket.roomId).emit('change_video', videoId);
  });

  socket.on('disconnect', () => {
     if (socket.roomId && rooms[socket.roomId]) {
         rooms[socket.roomId].users--;
         io.to(socket.roomId).emit('update_user_count', rooms[socket.roomId].users, MAX_USERS_PER_ROOM);
         if (rooms[socket.roomId].users === 0) {
             delete rooms[socket.roomId]; 
             io.emit('update_room_count', Object.keys(rooms).length, MAX_ROOMS);
         }
     }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => { console.log('Máy chủ đã chạy!'); });

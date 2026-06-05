const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');

let io;
// Map to track userId -> Set of socket IDs
const userSockets = new Map();

function normalizeToken(rawToken = '') {
  let token = String(rawToken || '').trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  for (let i = 0; i < 3; i += 1) {
    const unquoted = token.replace(/^"|"$/g, '').trim();
    if (unquoted === token) {
      break;
    }
    token = unquoted;
  }
  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === 'string') {
      token = parsed.trim();
    }
  } catch {
    // Ignore parse errors and keep token as-is.
  }
  return token;
}

const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173'];

function initSocketManager(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, credentials: true }
  });

  io.use((socket, next) => {
    try {
      const token = normalizeToken(socket.handshake.auth.token);
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userId = String(payload.userId ?? payload.id ?? '').trim();
      
      if (!userId) {
        return next(new Error('Invalid token payload'));
      }
      
      socket.userId = userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Notify online status if needed
    // socket.broadcast.emit('user_online', userId);

    socket.on('disconnect', () => {
      const userSet = userSockets.get(userId);
      if (userSet) {
        userSet.delete(socket.id);
        if (userSet.size === 0) {
          userSockets.delete(userId);
          // socket.broadcast.emit('user_offline', userId);
        }
      }
    });

    socket.on('send_message', async (data, callback) => {
      try {
        const { receiverId, content } = data;
        if (!receiverId || !content) {
          if (callback) callback({ error: 'Missing parameters' });
          return;
        }
        
        // Ensure they are friends before allowing message
        const friendshipCheck = await db.query(`
          SELECT * FROM friendships 
          WHERE status = 'accepted' 
          AND (
            (requester_id = $1 AND addressee_id = $2) 
            OR 
            (requester_id = $2 AND addressee_id = $1)
          )
        `, [userId, receiverId]);
        
        if (friendshipCheck.rows.length === 0) {
          if (callback) callback({ error: 'Not friends' });
          return;
        }

        // Insert message
        const result = await db.query(`
          INSERT INTO direct_messages (sender_id, receiver_id, content) 
          VALUES ($1, $2, $3) 
          RETURNING id, sender_id, receiver_id, content, read, created_at
        `, [userId, receiverId, content]);
        
        const newMessage = result.rows[0];

        // Send to receiver if online
        const receiverSockets = userSockets.get(String(receiverId));
        if (receiverSockets) {
          receiverSockets.forEach(sockId => {
            io.to(sockId).emit('receive_message', newMessage);
          });
        }
        
        // Send to other sender sockets (if multiple tabs open)
        const senderSockets = userSockets.get(String(userId));
        if (senderSockets) {
          senderSockets.forEach(sockId => {
            if (sockId !== socket.id) {
              io.to(sockId).emit('receive_message', newMessage);
            }
          });
        }

        if (callback) callback({ success: true, message: newMessage });
      } catch (err) {
        console.error('send_message error:', err);
        if (callback) callback({ error: 'Internal server error' });
      }
    });
    
    socket.on('mark_read', async (data, callback) => {
      try {
        const { messageIds } = data; // Array of message ids
        if (!messageIds || messageIds.length === 0) return;
        
        await db.query(`
          UPDATE direct_messages 
          SET read = true 
          WHERE id = ANY($1) AND receiver_id = $2
        `, [messageIds, userId]);
        
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('mark_read error:', err);
        if (callback) callback({ error: 'Internal server error' });
      }
    });
  });
  
  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}

function isUserOnline(userId) {
  return userSockets.has(String(userId));
}

module.exports = {
  initSocketManager,
  getIo,
  isUserOnline
};

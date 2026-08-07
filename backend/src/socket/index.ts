const { Server } = require('socket.io')
const http = require('http')

let io = null

function init() {
  const httpServer = http.createServer()

  io = new Server(httpServer, {
    cors: {
      origin: process.env.DASHBOARD_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log('[Socket.io] Client connected:', socket.id)

    socket.on('join:company', (companyId) => {
      socket.join(`company:${companyId}`)
      console.log(`[Socket.io] ${socket.id} joined company:${companyId}`)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id)
    })
  })

  const port = process.env.SOCKET_PORT || 3001
  httpServer.listen(port, () => {
    console.log(`[Socket.io] Broadcasting on port ${port}`)
  })

  return io
}

function broadcastVanUpdate(companyId, vanData) {
  if (!io) return
  io.to(`company:${companyId}`).emit('van:update', vanData)
}

function broadcastAlert(companyId, alert) {
  if (!io) return
  io.to(`company:${companyId}`).emit('alert:new', alert)
}

function getIo() {
  return io
}

module.exports = { init, broadcastVanUpdate, broadcastAlert, getIo }


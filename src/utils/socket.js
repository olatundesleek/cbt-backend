let io = null;
export function setIo(socketIo) {
  io = socketIo;
}
export function getIo() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
export default { setIo, getIo };

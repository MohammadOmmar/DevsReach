/**
 * DEPRECATED - This service has been replaced by socketService.ts
 * SignalR was removed in favor of Socket.IO which matches the Node.js backend.
 * 
 * See: frontend/src/services/socketService.ts
 * 
 * This file kept only as a reference. Delete after confirming socket.io-client works.
 */
export const startSignalRConnection = () => {
  console.warn('SignalR is deprecated. Use connectSocket from socketService.ts instead.');
};
export const stopSignalRConnection = () => {};
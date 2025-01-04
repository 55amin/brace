const { contextBridge, ipcRenderer } = require('electron');
// Define valid channels to prevent unauthorised communication
const validInvokeChannels = ['create-admin'];
const validSendChannels = []; 
const validReceiveChannels = []; 

contextBridge.exposeInMainWorld('api', {
    invoke: (channel, data) => {
        if (validInvokeChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        } else {
            console.warn('Blocked invoke to invalid channel: ', channel);
        }
    },
    send: (channel, data) => {
        if (validSendChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        } else {
            console.warn('Blocked send to invalid channel: ', channel);
        }
    },
    receive: (channel, func) => {
        if (validReceiveChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        } else {
            console.warn('Blocked receive from invalid channel: ', channel);
        }
    }
});

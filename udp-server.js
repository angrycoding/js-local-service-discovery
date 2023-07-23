#!/usr/bin/env node

// CODE TO RUN ON RASPBERRY PI SIDE

const dgram = require('dgram');
const Request = require('request');
const getLocalIP4 = require('quick-local-ip').getLocalIP4;

const socket = dgram.createSocket({
	type: 'udp4',
	reuseAddr: true
});

socket.on('listening', function () {
	const address = socket.address();
	console.log('UDP socket listening on ' + address.address + ":" + address.port);
});

socket.on('message', (browserId, remote) => {
	console.info(browserId.toString(), remote)
	browserId = browserId.toString();
	console.info(browserId)
	if (!browserId.includes('start_')) return;
	browserId = (browserId.split('start_').pop() || '');
	if (!browserId.includes('end')) return;
	browserId = (browserId.split('end').shift() || '');
	if (!browserId.includes('-')) return;
	browserId = (browserId.split('-')[0] || '');
	if (!browserId) return;

	const sendToCentralServer = {
		browserId,
		deviceIp: getLocalIP4()
	}

	console.info('sendToCentralServer', sendToCentralServer)

	Request({
		url: 'http://127.0.0.1:1338/retropie',
		method: 'POST',
		timeout: 1000 * 10,
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		json: sendToCentralServer
	});

});

socket.bind('5353', '0.0.0.0');

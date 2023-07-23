const Express = require('express');

var server = Express();
server.listen(1338, '0.0.0.0');

const MAX_ELEMENTS_PER_IP = 10;
const MAX_TIME_TO_KEEP_MS = 1000 * 60 * 3;
const CLEANUP_INTERVAL_MS = 1000 * 60 * 1;

server.use(Express.json({
	strict: false,
	type: 'application/x-www-form-urlencoded'
}));

const respondWithJSON = (request, response, data) => {
	if (arguments.length < 3) data = 0;
	response.header('Access-Control-Allow-Origin', '*');
	response.end(JSON.stringify(data));
};

const mappingTable = {

}

server.post('/getHosts', (request, response) => {
	
	// const remoteAddress = request.socket.remoteAddress;
	// if (typeof remoteAddress !== 'string' || !remoteAddress) return respondWithJSON(request, response);

	const browserId = request.body.browserId;
	if (typeof browserId !== 'string' || !browserId) return;
	

	if (!mappingTable.hasOwnProperty(browserId)) return respondWithJSON(request, response);
	if (!mappingTable[browserId].length) return respondWithJSON(request, response);
	respondWithJSON(request, response, mappingTable[browserId].map(x => x.deviceIp));
});

server.post('/retropie', (request, response) => {
	response.end();


	console.info(request.socket.remoteAddress, request.socket.remotePort)
	

	const browserId = request.body.browserId;
	if (typeof browserId !== 'string' || !browserId) return;

	const deviceIp = request.body.deviceIp;
	if (typeof deviceIp !== 'string' || !deviceIp) return;


	const addresses = (
		mappingTable.hasOwnProperty(browserId) ?
		mappingTable[browserId] :
		mappingTable[browserId] = []
	);


	const existingIndex = addresses.findIndex(item => item.deviceIp === deviceIp);
	const when = Date.now();
	
	if (existingIndex !== -1) {
		const existingAddress = addresses[existingIndex];
		addresses.splice(existingIndex, 1);
		addresses.push({ ...existingAddress, when });
	} else {
		addresses.push({ when, deviceIp });
	}

	mappingTable[browserId] = addresses.slice(-MAX_ELEMENTS_PER_IP);

	
});


const checkExpiredAddresses = () => {
	console.info('checkExpiredAddresses:start');
	for (const browserId in mappingTable) {
		
		mappingTable[browserId] = mappingTable[browserId].filter(address => {
			const isExpired = (Date.now() - address.when >= MAX_TIME_TO_KEEP_MS);
			if (isExpired) console.info(`expired ${browserId} -> ${JSON.stringify(address)}`);
			return !isExpired;
		});

		if (!mappingTable[browserId].length) {
			console.info(`remove ${browserId} from table`);
			delete mappingTable[browserId];
		}

	}

	console.info('checkExpiredAddresses:finish');
	setTimeout(checkExpiredAddresses, CLEANUP_INTERVAL_MS);

};


checkExpiredAddresses();

import { getCurrentBrowserFingerPrint } from "@rajesh896/broprint.js";

const getRetropieIp = async(fingerprint: string): Promise<string[]> => {
	try {
		let response: any = await fetch(`http://127.0.0.1:1338/getHosts`, {
			method: "POST",
			body: JSON.stringify({
				browserId: fingerprint
			}),
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			}
		});
	
		response = await response.json();
		if (!(response instanceof Array)) response = [];
		response = response.filter((i: any) => typeof i === 'string' && i.length);
		if (response.length) return response;
	
	}
	catch (e) {

	}
	return [];
}


  
(async() => {
	const fingerprint = String(await getCurrentBrowserFingerPrint());
	document.body.innerHTML += '<div>' + fingerprint + '</div>';

	const retropieIps = await getRetropieIp(fingerprint);
	document.body.innerHTML += '<div>' + 'retropieIp' + JSON.stringify(retropieIps) + '</div>';

	

	const hostName = `//start_${fingerprint}-${Date.now()}end.local`;

	navigator.sendBeacon(hostNameWithPrefix);

	const img = new Image();
	img.src = hostNameWithPrefix;

})();

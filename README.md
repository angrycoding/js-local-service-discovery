# Discover servers, IOT devices, IP cameras running in your local network

Imagine the situation, you've created some very useful webserver and you host it in your house on Raspberry PI, esp8266 or something like that, now you want to build some simple web application to manage it. So how can you communicate with such device from web app running on your mobile phone (while both in the same network). In order to connect to the webserver running on Raspberry PI side from HTML page opened on your mobile phone you need to know Raspberry PI's IP address in order to make a connection. So how do you find it out?

## Naive approach

We know that our phone and Raspberry PI are running in the same network, so we can simply scan each ip adress in our local network checking for some specific port. That could look like this:

```javascript

// Simple web server running on Raspberry PI

const Net = require('net');

const server = Net.createServer(socket => {
  console.info('GOT_CONNECTION');
  // do something useful
});

server.listen(1337, '0.0.0.0');
```

Script to run in the browser:

```javascript
for (let c = 0; c <= 255; c++) {
  const ipToCheck = `192.168.0.${c}`;
  try {
    const response = await fetch(`${ipToCheck}:1337`);
    // check if we've got response
  } catch (e) {}
}
```

This will work, but will take ages...

## My proposal

Let's get use of MDNS: https://en.wikipedia.org/wiki/Multicast_DNS
MDNS is basically the same thing as regular DNS (and works pretty similar), with one exception (at least that's what I'm aware of): it's used to resolve hostnames with ".local" suffix. So all requests made to "foobar.local" or "blabla.local" will be attempted to be resolved against MDNS service running in the local network. There is well known thing called Avahi: https://wiki.archlinux.org/title/avahi that is used by Raspbian so you can find your Rpi by "raspberrypi.local" instead of looking up it's ip on your router or scanning network.

MDNS service is running on UDP port 5353 and since it's UDP you're free to run several instances of MDNS servers bound to the same 5353 UDP port.

So in order to listen traffic originated to MDNS server we need to create simple UDP server on our Raspberry PI (or esp8266) and bind it to 5353:

```javascript
const dgram = require('dgram');

const socket = dgram.createSocket({
	type: 'udp4',
	reuseAddr: true
});

socket.on('listening', function () {
	const address = socket.address();
	console.log('UDP socket listening on ' + address.address + ":" + address.port);
});

socket.on('message', (data, sender) => {
  console.info(data.toString(), sender);
});

socket.bind('5353', '0.0.0.0');
```

Try to run it and you'll see MDNS requests made by devices in your local network (for my home setup I see a lot of traffic produced by chromecast). You can also try to open your favorite web browser, type "blabla.local" and pretty soon you'll see MDNS request made by the web browser with "blabla.local" hostname.

Pretty cool thing here is that by running such server in our local network:

1. We are not interrupting existing MDNS servers (we just listen traffic and never attempt to respond)
2. We can see what hostname is requested along with the local ip address of the requester.

So how does it all help us to communicate with Raspberry PI webserver from web application running on different device in the same network?

## Central server

So here is the idea:

1. Browser initiates "scan" process by sending request to specially formed ".local" suffixed hostname. This hostname can include some information about sender (like user id, or cookie, or whatever else you prefer to identify it, for instance you can use browser's fingerprint: https://github.com/Rajesh-Royal/Broprint.js as such unique id). So we can generate hostname like "start_${**fingerprint**}-${Date.now()}end.local" and send any request to it using fetch, sendBeacon, iframe.src, image.src, XMLHTTPRequest and so on. 

2. Soon or late request to this special hostname will endup in our UDP server running on port 5353, at that point we can extract **fingerprint** from hostname and send it to the central server along with our local ip address (here I mean Raspberry PI or esp8266 ip address).

3. When central server receives this information it creates a record in some mapping table (could be simple JS object, or some kind of database), saying that **fingerpint**=**ip_address**. For example our **fingerpint** = "OSOoNio3i48j83ijI" and Raspberry PI local ip address = "192.168.1.102", then server will record mappingTable['OSOoNio3i48j83ijI'] = '192.168.1.102';

4. Browser asks central server to give him list of all collected ip addresses for his **fingerprint**. Having this list browser now can establish direct connection to the webserver.

Check source code to get more understanding.

## Limitations & observations

1. It seems that despite the rules maximal length of hostname accepted by the browser is 1 segment = 63 characters, which makes it 57 characters (without .local). **Note** that it's not one segment length, it's overall length

2. Allowed characters are ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-, 37 characters, so base37 (or just simple random string out of this alphabet) can be used to encode payload to be url safe

3. There is something broken in Linux at least, mdns host resolution takes about 10 seconds, when you request it from the browser using traditional XMLHTTPRequest, link[rel=dns-prefetch], sendBeacon and so on. As far as I can understand such delay caused by OS that tries to use traditional DNS first and pass it to MDNS only if it fails (yeah yeah, seems to be very obvious that ".local" suffix cannot be the part of the host that can be resolved using normal DNS server). You can check that yourself by resolving MDNS manually from console using "avahi-resolve-host-name foobar1.local"

4. WebRTC on chrome does some optimizations, so this piece of code:

```javascript
var pc = new RTCPeerConnection({
	iceServers:[{
		urls: `stun:mysuperhost.local`,
		credential: "a mulatto",
		username: "an albino"
	}],
});


pc.createDataChannel('');

const offer1 = await pc.createOffer();
pc.setLocalDescription(offer1);




pc.onicecandidate = function(ice)
{
	pc.onicecandidate = null;
};
```

Sends out MDNS request almost instantly without any delay, but unfortunatelly this only works in Chrome :(

5. Since our DIY MDNS server is listening all requests sent to 5353 port, we need to distinguish requests made by browser (identification) from other requests, normally we would use
some prefix on the hostname (like id_randomstring.local) but given the fact that we're limited with only 57 characters, it might make sense to come up with something more clever (in case if you need it of course), like generating random identifier so the crc8 checksum will always be equals to 127 for instance, or some other "magic" number. If you need more, then well :) you can always encode it into the sequence of requests and then aggregate them back on the backend side, keeping in mind that they might come out of order, so you're going to have to come up with some ordering mechanism pretty much similar with the one that concatenates UDP packets.

## Browser support

- Firefox on Linux
- MS Edge on Linux
- Opera on Linux
- Chrome on Linux
- Edge on Windows 7
- Opera on Windows 7
- Chrome on Windows 7
- Chrome for Android
- Firefox for Android

So I checked several different web browsers and it works almost everywhere, with some exceptions:

1. Couldn't get it working under Firefox for windows (I believe that it's some kind of bug there, because it doesn't work with any ".local" suffixed hostnames).
2. Some of the browsers are too picky about the way you ping this random hostname (that's why I added Date.now() there and that's why I request it using several methods)

-----

So feel free to use source code in this repo for anything. In case if you have any questions, contact me, also any comments, suggestions, improvements are welcome.



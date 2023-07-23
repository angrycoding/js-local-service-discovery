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

MDNS service is running on UDP port 5353 and since it's UDP you're free to run several instances of MDNS servers bound to the same 5354 UDP port.

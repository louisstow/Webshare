importScripts('md5.js');

self.addEventListener('message', function (e) {
	var hash = md5(e.data);
	self.postMessage(hash);
}, false);
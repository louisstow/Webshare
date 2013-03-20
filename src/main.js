var CHUNK_SIZE = 1000; //1000bytes... for testing

var dbRef = new Firebase("https://filertc.firebaseIO.com/");
var worker = new Worker('src/worker.js');

var UploadView = Spineless.View.extend({
	init: function () {
		UploadView.super(this, "init", arguments);
		worker.addEventListener('message', this.onHash.bind(this), false);
	},

	template: "upload",

	events: {
		'submit form': 'uploadFile',
		'change file': 'processFile'
	},

	processFile: function (e) {
		var file = e.target.files[0];
		
		this.data = {
			size: file.size,
			name: file.name,
			chunks: {}
		};

		this.preview.innerHTML = file.name + " <var>" + file.size + "bytes</var>";

		var chunkAmount = Math.ceil(file.size / CHUNK_SIZE);
		this.data.chunkAmount = chunkAmount;
		
		//loop every chunk and hash it
		for (var i = 0; i < chunkAmount; ++i) {
			//create the file reader and events
			var reader = new FileReader();

			var blob = file.slice(
				i * CHUNK_SIZE,
				Math.min(i * CHUNK_SIZE + CHUNK_SIZE, file.size - 1)
			);

			reader.onloadend = this.dataLoaded.bind(this, i, blob.size);
			reader.readAsBinaryString(blob);
		}
	},

	hashFile: function (chunks) {
		var blob = [];
		for (var hash in chunks) {
			if (!chunks.hasOwnProperty(hash)) { continue; }
			blob[chunks[hash].index] = chunks[hash].data;
		}
		
		blob = blob.join("");
		console.log(blob.length)

		worker.postMessage(blob);
	},

	dataLoaded: function (n, size, evt) {
		if (evt.target.readyState !== FileReader.DONE) {
			return;
		}
		
		//var hash = md5(evt.target.result);
		hash = Math.random() * 1000 | 0;
		this.data.chunks[hash] = {
			index: n,
			size: size,
			data: evt.target.result
		};

		if (n === this.data.chunkAmount -1) {
			this.hashFile(this.data.chunks);
		}

		//TODO: store this chunk in the DB

		this.progress.style.width = (Math.floor((n + 1) / this.data.chunkAmount) * 100) + "%";

		console.log("DATA LOADED");
	},

	onHash: function (e) {
		console.log("ON HASH", e.data);
		worker.removeEventListener('message', this.onHash);
		this.data.hash = e.data;
	},

	uploadFile: function (e) {
		e.preventDefault();

		return false;
	}
});

var uploadView = new UploadView();
var CHUNK_SIZE = 1000; //1000bytes... for testing

var dbRef = new Firebase("https://filertc.firebaseIO.com/");
var fileRef = dbRef.child('file');
var chunkRef = dbRef.child('chunk');
var peerRef = dbRef.child('peer');

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
		
		this.fileData = {
			size: file.size,
			name: file.name,
			chunks: []
		};

		this.chunkData = {};

		this.preview.innerHTML = file.name + " <var>" + file.size + "bytes</var>";

		var chunkAmount = Math.ceil(file.size / CHUNK_SIZE);
		this.fileData.chunkAmount = chunkAmount;

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

		this.hashFile(file);
	},

	hashFile: function (file) {
		var reader = new FileReader();
		reader.onloadend = function (evt) {
			worker.postMessage(evt.target.result);
		};

		reader.readAsText(file);
	},

	dataLoaded: function (n, size, evt) {
		if (evt.target.readyState !== FileReader.DONE) {
			return;
		}

		var hash = md5(evt.target.result);
		this.chunkData[hash] = {
			index: n,
			size: size
		};

		this.fileData.chunks[n] = hash;

		//TODO: store this chunk in the DB
		this.progress.style.width = (Math.floor((n + 1) / this.fileData.chunkAmount) * 100) + "%";

		console.log("DATA LOADED");
	},

	onHash: function (e) {
		console.log("ON HASH", e.data);
		worker.removeEventListener('message', this.onHash);
		this.fileData.hash = e.data;
	},

	uploadFile: function (e) {
		console.log(this.fileData, this.chunkData);
		
		fileRef.push(this.fileData);

		//push metadata for each chunk
		for (var hash in this.chunkData) {
			var chunk = this.chunkData[hash];

			chunkRef.push({
				hash: hash,
				size: chunk.size,
				index: chunk.index,
				fileHash: this.fileData.hash
			});
		}

		e.preventDefault();

		return false;
	}
});

var uploadView = new UploadView();
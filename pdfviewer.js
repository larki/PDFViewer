const user = "";
const pass = "";
const port = 4000;




var http = require('http');
var fs = require('fs');
var send = require('send');
var url = require('url');
var ejs = require('ejs');
var express = require('express');
var bp = require('body-parser');
var sio = require('socket.io');
var compress= require('compression');
var child_process = require('child_process');
var basicAuth = require('basic-auth');
var attach = require('neovim').attach;
//var api = require('neovim/scripts/api');



var watchFile=false;
var nvimSocket = '/tmp/nvimREVERSE';


var pdf='';

console.log("PDFViewer running on port "+port+"...");

var app = express();
app.use(compress());
app.use(bp.urlencoded({extended: true}));

var server = http.createServer(app);
var io = sio(server);

io.sockets.setMaxListeners(0);

server.listen(port);

var auth = function(req, res, next) { 
	function denied(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			return res.sendStatus(401);
	}

	if(!user)
		return next();

	var input = basicAuth(req);
	if(!input || !input.name || (pass && !input.pass))
		return denied(res);
	if(input.name === user && input.pass === pass)
		return next();
	else
		return denied(res);

};
//var auth = function(req, res, next) {return next();};

function pdfPathUpdated() {
	if(watchFile){
		fs.watchFile(pdf, function (curr,prev) {
			console.log('Current mtime'+curr.mtime);
			console.log('Previous  mtime'+prev.mtime);
			console.log(curr.mtime.getTime()> prev.mtime.getTime());
		}
		);
	}
	io.emit('pdfPathUpdated');
}

app.set('views', __dirname+'/views');
app.set('view engine', 'ejs');
app.use(express.static(__dirname+'/views'));
app.get('/', auth, function (req,res,next){
	if(pdf!="") {
		console.log('current pdf:'+pdf);
		getNumberOfPages(pdf, function (num) {
			res.render('index', {pages: num});
		});
	}
	else {
		res.render('nopdf');
	}
});
app.get('/doc', function(req,res,next) { res.render('doc', {p: port});});

app.get('/getPDF',auth, function (req, res, next) {
	if(pdf)
		res.sendFile(pdf, {root: '/'});
	else
		res.render('nopdf');
});




var exec = require('child_process').exec;
function execute(command, callback){
	exec(command, function(er, out){ callback(out); });
}

function getNumberOfPages(pdfFile, callback) {
	execute('pdftk '+pdfFile+' dump_data output | grep NumberOfPages', function(out) { 
	callback(out.split(' ')[1]);
	});
}


//Communication: Neovim -> Webapp
//Functions invoked by controller, e.g. Neovim
app.post('/watchPDF', function(req, res, next) {
	console.log(req.body.pdf);
	var arg  = req.body.pdf;
	if(pdf!= '') {
		fs.unwatchFile(pdf);
	}
	try { 
		var file = fs.lstatSync(String(arg));
		if(file.isFile()&& String(arg).slice(-4)=='.pdf'){
			console.log(String(arg));
			pdf = String(arg);
			pdfPathUpdated();
		}

	} catch (e) {
		console.log('Not a file!');
		console.log(e);
	}
	res.end();
});

app.post('/forward',function(req,res,next) {
	io.emit('forwardSearch', req.body);
	console.log('Forward search: '+JSON.stringify(req.body));
	res.end();
});
app.get('/doRerender',function(req,res,next) {
	io.emit('doRerender', req.body);
	console.log('Rerender!');
	res.end();
});
app.post('/scrollDown', function(req, res, next) {
	io.emit('doScroll', req.body);
	console.log('Passed on '+JSON.stringify(req.body));
	res.end();
});
app.post('/registerNeovim', async function(req, res, next) {
	let socket;

	nvimSocket = req.body.socket;
	console.log(nvimSocket);

	const nvim = attach({ socket: nvimSocket});
//	const result = await nvim.requestApi();
//	subscribeTo = ['watchPDF', 
//		'doScroll', 
//		'scrollToTop', 
//		'scrollToBottom', 
//		'scrollToPage', 
//		'nextPage', 
//		'previousPage',
//		'doRender',
//		'toggleCrop',
//		'toggleZoom'];

	functions = {
		'watchPDF': function (args) { 
			console.log(args);
			if(pdf!= '') {
				fs.unwatchFile(pdf);
			}
			try { 

				var join = args[0].join(' ');//paths with spaces
				var file = fs.lstatSync(join);
				if(file.isFile()&& join.slice(-4)=='.pdf'){
					pdf = join;
					pdfPathUpdated();
				}

			} catch (e) {
				console.log('Not a file!');
			}
		},
		'doScroll': function (args) {
			io.emit('doScroll', {amount: args[0]});
			console.log('scroll!');
		},
		'scrollToTop': function (args) {
			io.emit('scrollToTop');
			console.log('scroll to Top!');
		} , 
		'scrollToBottom': function (args) {
			io.emit('scrollToBottom');
			console.log('scroll to bottom!');
		},
		'scrollToPage': function (args) {
			io.emit('scrollToPage', args[0]);
			console.log('scroll to page '+args[0]);
		},
		'nextPage': function (args) {
			io.emit('nextPage');
			console.log('nextPage!');
		},
		'previousPage': function (args) {
			io.emit('previousPage');
			console.log('previousPage!');
		},
		'doRender': function (args) {
			io.emit('doRender');
			console.log('doRender!');
		},
		'toggleCrop': function (args) {
			io.emit('toggleCrop');
			console.log('toggleCrop');
		},
		'toggleZoom': function (args) {
			io.emit('toggleZoom');
			console.log('toggleZoom!');
		}

	};

	for (var key in functions) {
		nvim.subscribe(key);
	}


	nvim.on('notification', (method,args) => {
		try{
			functions[method](args);
		}
		catch (e) {}
	});


//	var vim = new neovim(nvimSocket, function (e) {
//		console.log('Neovim client connected through socket :'+req.body.socket);
//		JSON.stringify(e);
//		//trigger with :call rpcnotify(0, "doScroll", scrollAmount)
//		vim.rpc.subscribe("doScroll", function () {});
//		vim.on('doScroll', function (arg) {
//			io.emit('doScroll', {amount: arg});
//			console.log('scroll!');
//		});
//		vim.rpc.subscribe("scrollToTop", function () {});
//		vim.on('scrollToTop', function (arg) {
//			io.emit('scrollToTop');
//			console.log('scroll to Top!');
//		});
//		vim.rpc.subscribe("scrollToBottom", function () {});
//		vim.on('scrollToBottom', function (arg) {
//			io.emit('scrollToBottom');
//			console.log('scroll to bottom!');
//		});
//		vim.rpc.subscribe("scrollToPage", function () {});
//		vim.on('scrollToPage', function (arg) {
//			io.emit('scrollToPage', arg);
//			console.log('scroll to page '+arg+'!');
//		});
//		vim.rpc.subscribe("nextPage", function () {});
//		vim.on('nextPage', function (arg) {
//			io.emit('nextPage');
//		});
//		vim.rpc.subscribe("previousPage", function () {});
//		vim.on('previousPage', function (arg) {
//			io.emit('previousPage');
//		});
//		vim.rpc.subscribe("doRerender", function() {});
//		vim.on('doRerender', function() {
//			io.emit('doRerender');
//		});
//
//		vim.rpc.subscribe("toggleCrop", function () {});
//		vim.on("toggleCrop", function() {
//			io.emit('toggleCrop', {});
//			console.log('Toggle crop!');
//		});
//		vim.rpc.subscribe("toggleZoom", function () {});
//		vim.on("toggleZoom", function() {
//			io.emit('toggleZoom', {});
//			console.log('Toggle zoom!');
//		});
//
//		vim.rpc.subscribe("watchPDF", function() {});
//		vim.on("watchPDF", function (arg) {
//			if(pdf!= '') {
//				fs.unwatchFile(pdf);
//				}
//			try { 
//				
//				var join = arg[0].join(' ');//paths with spaces
//				var file = fs.lstatSync(join);
//				if(file.isFile()&& join.slice(-4)=='.pdf'){
//					pdf = join;
//					pdfPathUpdated();
//					}
//				
//			} catch (e) {
//				console.log('Not a file!');
//			}
//
//		});
//
//	});
	res.end();
});


//Communication: Webapp -> Neovim
io.sockets.on('connection', function(socket) { 
	socket.on('message', function(msg) { 
		console.log('Viewer Connected with message '+msg);
	});
	socket.on('reverseSearch', function(coords) {
		console.log('Reverse Search!'+coords);
		var coords = JSON.parse(coords);
		var pdfData = pdf.split("/");
		var path = pdf.substring(0, pdf.length-pdfData[pdfData.length-1].length);
//		console.log('path: '+path);
//		console.log('synctex edit -d '+path+' -o '+coords.page+':'+coords.x+':'+coords.y+':'+(pdfData[pdfData.length-1])+' -x "echo %{input} %{line}"');
		//child_process.exec('synctex edit -o '+coords.page+':'+coords.x+':'+coords.y+':'+pdf+' -x "'+__dirname+'/gotoLine.py /tmp/nvimREVERSE %{line}"', function(err,stdout, stderr){ 
		child_process.exec('synctex edit -o '+coords.page+':'+coords.x+':'+coords.y+':'+pdf+' -d '+path+'  -x "echo %{input} %{line}"', function(err,stdout, stderr){ 
			var result = stdout.split('\n');
			result = result[0].split(' ');
			var line = result[result.length-1];
			var file = result[0].replace('./','');
			console.log('File: '+file);
			
			const nvim = attach({socket: nvimSocket});
			console.log(line+' '+file);
			nvim.command(line);

//			var client = new neovim(nvimSocket, function() {
//				client.rpc.get_current_buffer(function (buffer) {
//					buffer.get_name(function (name) {
//						if(name == file)
//							client.rpc.command(':'+line, function() {});
//						else {
//							client.rpc.command(':e +'+line+' '+file, function() {});
//						}
//					});
				});


//				var buffers = client.rpc.get_current_buffer(
//						function (buffer) {
//							buffer.get_line_count(function (count) {
//								console.log('meh'+count);});
//						});
			//});
		//});


	});

});




		




//serv.listen(4000);

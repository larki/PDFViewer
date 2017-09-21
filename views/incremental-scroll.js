/*global PDFJS: false, $: false */
//have to tweak resolution!

var renderMode = 'sync';

var url = '/getPDF'; // example file
var paperFormat = {width: 8.267, height: 11.692}; //A4 in inch
var refDictionary = {};
var jumpHistory = [];
var locationInHistory = 0;
var annData = [];
var annotations =[];
var oldViewbox;
var cropped = false;
var pageMode = false;
var verticalCropPadding = 15;
var borderWidth = 5;

var windowWidth = $(window).width(); //work around for stupid iOS bug
var originalWindowWidth=windowWidth; 
var cancelRendering = false;

PDFJS.disableAutoFetch = false;
PDFJS.disableStream = false;
PDFJS.verbosity = PDFJS.VERBOSITY_LEVELS.errors;
PDFJS.disableWebGL = false;


PDFJS.getDocument(url).then(function (pdfDocument) { handlePDF(pdfDocument);});

function toSynctexCoords(x,y, width, height) {
	var xFactor = ((paperFormat.width)/width)*72;
//	console.log('toSyncTex:'+xFactor);
	var yFactor = ((paperFormat.height)/height)*72;
	return {'x': x*xFactor, 'y': y*yFactor};
}

function toRealCoords(x,y,width,height) {
	var xFactor = width/(paperFormat.width*72); //synctex outputs coordinates rel. to 72dpi
	var yFactor = height/(paperFormat.height*72);
	return {'x': x*xFactor, 'y':y*yFactor};
}


function recalculateLayout() {
	if($(window).width() != windowWidth){
		console.log('Resize!');
		var factor = $(window).width()/windowWidth;
		windowWidth = $(window).width();
		$(document.getElementsByTagName('svg:svg')).map( function() {
			var oldWidth= $(this).width();
			var oldHeight =$(this).height(); 
			$(this).attr('width',windowWidth);
			$(this).attr('height',windowWidth*oldHeight/oldWidth);
			$(this).parent().width(windowWidth);
		});
		//zoomToHeightOut();
		var sections = $('section');
		if(sections.length>0){
			var transform = sections.attr('data-transform').split(' ');
			transform[0] = transform[0]*factor;
			transform[3] = transform[3]*factor;
			sections.attr('data-transform', transform.join(' '));
			sections.remove();
			renderAnnotations();
			if(cropped){
				toggleCrop();
				toggleCrop();
			}
		}

	}
}


function getCropViewBox(svg) {
	var BBox = svg.children[0].getBoundingClientRect();
	var yNew = $(window).scrollTop()+$(svg).parent().scrollTop()+BBox.top-$(svg).offset().top-verticalCropPadding; 
	var heightNew = BBox.height+2*(borderWidth+verticalCropPadding);
	var aspectRatio = (svg.height.baseVal.value)/(svg.width.baseVal.value);
	var widthNew = heightNew/aspectRatio;
	var widthDiff = (BBox.width-widthNew);
	var xNew = BBox.left-borderWidth+widthDiff/2-svg.parentNode.offsetLeft;
	//console.log(BBox.left);
	//if(!$(this)[0].hasAttribute('data-viewBox-old'))
	//		$(this)[0].setAttribute('data-viewBox-old',$(this)[0].getAttribute('viewBox'));

	return xNew+' '+yNew+' '+widthNew+' '+heightNew;
}


function cropPage(page) {
	var div = $('div[data-pagenum='+page+']');
	var svg = div.children('svg')[0];
	cropSVG(svg);
}

function cropSVG(svg) {
	var page = $(svg).parent().attr('data-pagenum');
	if(!svg.hasAttribute('data-viewBox-noCrop'))
		svg.setAttribute('data-viewBox-noCrop',svg.getAttribute('viewBox'));
	svg.setAttribute('viewBox',svg.getAttribute('data-viewBox-crop'));


	//Annotation stuff
	//have to scale the crop box etc.
	var offset = $(svg).offset();
	var cropBox = svg.getAttribute('viewBox').split(' ');
	var noCropBox = svg.getAttribute('data-viewBox-noCrop').split(' ');
	var cropFactorY =noCropBox[3]/cropBox[3];//*($(window).width())/$(this).width();
	var cropFactorX =noCropBox[2]/cropBox[2]; 
	//		console.log(cropFactorX);
	//var currPage = $(svg).parent().attr('data-pagenum');
	////console.log(currPage);
	var annDiv = $('div[data-annotation='+page+']');
	annDiv.children('section').map(function() {
		var transform = $(this).attr('data-transform').split(' ');
		var transformOrig = $(this).attr('data-transform-orig').split(' ');
		//console.log("left "+(($(this).css('left')).split('p')[0]-cropBox[0]*(transform[0]/transformOrig[0])-offset.left)*cropFactorX+offset.left);
		$(this).css('left', (($(this).css('left')).split('p')[0]-cropBox[0]*(transform[0]/transformOrig[0])-offset.left)*cropFactorX+offset.left);
		$(this).css('top', (($(this).css('top')).split('p')[0]-cropBox[1]*(transform[3]/transformOrig[3])-offset.top)*cropFactorY+offset.top);
		$(this).css('width', (($(this).css('width')).split('p')[0])*cropFactorX);
		$(this).css('height', (($(this).css('height')).split('p')[0])*cropFactorY);
		//		//	$(this).css('top', 5+(($(this).css('top')).split('p')[0])*cropFactorY);
		//		//	$(this).css('left', (($(this).css('left')).split('p')[0])*cropFactorX);
	});
}


function toggleCrop() {
	console.log(cropped);

	if(!cropped) {
		//$('svg').map( function() { cropSVG(this);});
		$(document.getElementsByTagName('svg:svg')).map(function() {cropSVG(this);});
		
		/*
		$('svg').map( function() {
			//var BBox = $(this).children()[0].getBoundingClientRect();
			//var yNew = $(window).scrollTop()+BBox.top-$(this).offset().top-verticalCropPadding; 
			//var heightNew = BBox.height+2*(borderWidth+verticalCropPadding);
			//var aspectRatio = $(this).height()/$(this).width();
			//var widthNew = heightNew/aspectRatio;
			//var widthDiff = (BBox.width-widthNew);
			//var xNew = BBox.left-borderWidth+widthDiff/2;  
			if(!$(this)[0].hasAttribute('data-viewBox-noCrop'))
					$(this)[0].setAttribute('data-viewBox-noCrop',$(this)[0].getAttribute('viewBox'));


			$(this)[0].setAttribute('viewBox',$(this)[0].getAttribute('data-viewBox-crop'));

			//Annotation stuff
			//have to scale the crop box etc.
			var offset = $(this).offset();
			var cropBox = $(this)[0].getAttribute('viewBox').split(' ');
			var noCropBox = $(this)[0].getAttribute('data-viewBox-noCrop').split(' ');
			var cropFactorY =noCropBox[3]/cropBox[3];//*($(window).width())/$(this).width();
			var cropFactorX =noCropBox[2]/cropBox[2]; 
	//		console.log(cropFactorX);
			var currPage = $(this).parent().attr('data-pagenum');
			//console.log(currPage);
			var annDiv = $('div[data-annotation='+currPage+']');
			annDiv.children('section').map(function() {
				var transform = $(this).attr('data-transform').split(' ');
				var transformOrig = $(this).attr('data-transform-orig').split(' ');
				//console.log("left "+(($(this).css('left')).split('p')[0]-cropBox[0]*(transform[0]/transformOrig[0])-offset.left)*cropFactorX+offset.left);
				$(this).css('left', (($(this).css('left')).split('p')[0]-cropBox[0]*(transform[0]/transformOrig[0])-offset.left)*cropFactorX+offset.left);
				$(this).css('top', (($(this).css('top')).split('p')[0]-cropBox[1]*(transform[3]/transformOrig[3])-offset.top)*cropFactorY+offset.top);
				$(this).css('width', (($(this).css('width')).split('p')[0])*cropFactorX);
				$(this).css('height', (($(this).css('height')).split('p')[0])*cropFactorY);
	//		//	$(this).css('top', 5+(($(this).css('top')).split('p')[0])*cropFactorY);
	//		//	$(this).css('left', (($(this).css('left')).split('p')[0])*cropFactorX);
			});


		});
		*/
		cropped = true;
	}
	else {
		$(document.getElementsByTagName('svg:svg')).map(function() {
			console.log('NoCrop!');
			$(this)[0].setAttribute('viewBox',$(this)[0].getAttribute('data-viewBox-noCrop'));
		});


		//$('svg').map(function() {
		//	console.log('NoCrop!');
		//	$(this)[0].setAttribute('viewBox',$(this)[0].getAttribute('data-viewBox-noCrop'));
		//});
		$('section').remove();
		renderAnnotations();
			cropped = false;
	}
}

function zoomToHeightIn() {
	showStatusMessage('Zooming to page height');
	var wWidth = $(window).width();
	var wHeight = $(window).height();
	pageMode = true;
	var currentPage = getVisiblePage().getAttribute('data-pagenum');;

//	var svg1= ($('div[data-pagenum=1]').children('svg'));
//	var svg = $('svg');
//		var oldHeight= svg1.height();
//		var oldWidth= svg1.width();
//		if(oldHeight>wHeight) {
//			svg.attr('height',wHeight).attr('width',oldWidth*wHeight/oldHeight);
//
//			if(svg1.attr('width')<=wWidth){
//				console.log(svg.parent());
//				svg.parent().width(svg1.attr('width'));
//				svg.parent().css('display','inline-block');
//			}
//		}

	$(document.getElementsByTagName('svg:svg')).map( function () {
		var oldHeight= $(this).height();
		var oldWidth= $(this).width();
		if(oldHeight>wHeight) {
		$(this).attr('height',wHeight);
		$(this).attr('width',oldWidth*wHeight/oldHeight);
		if($(this).attr('width')<=wWidth){
			$(this).parent().width($(this).attr('width'));
			$(this).parent().css('display','inline-block');
		}
		var currPage = $(this).parent().attr('data-pagenum');
		var sections = $('div[data-annotation='+currPage+']').children('section');
		if(sections.length >0) {
			var factor = wHeight/oldHeight;
			var transform = sections.attr('data-transform').split(' ');;
			transform[0]=transform[0]*factor;
			transform[3]=transform[3]*factor;
			sections.attr('data-transform', transform.join(' '));
		}

		}
		renderAnnotations();
	});

	setTimeout(function(){ scrollToPage(currentPage,true)}, 100);
}

function zoomToHeightOut() {
	showStatusMessage('Zooming to page width');
	var wWidth = $(window).width();
	var wHeight = $(window).height();
	pageMode = false;

	var currentPage = getVisiblePage().getAttribute('data-pagenum');;
	var currentPage = getVisiblePage().getAttribute('data-pagenum');;

	$(document.getElementsByTagName('svg:svg')).map(function() {
		if(!$(this)[0].hasAttribute('data-viewBox-noCrop'))
			$(this)[0].setAttribute('data-viewBox-noCrop',$(this)[0].getAttribute('viewBox'));
		var box = $(this)[0].getAttribute('data-viewBox-noCrop').split(' ');
	
		var currentHeight = $(this).height();
		var currentWidth = $(this).width();
		$(this).attr('width',wWidth);
		$(this).attr('height',currentHeight*wWidth/currentWidth);
		$(this).parent().width($(window).width());

		var currPage = $(this).parent().attr('data-pagenum');
		var sections = $('div[data-annotation='+currPage+']').children('section');
		if(sections.length >0) {
			var origTransform = sections.attr('data-transform-orig')
			sections.attr('data-transform', origTransform);
		}

	});
	renderAnnotations();
	setTimeout(function(){ scrollToPage(currentPage,true)}, 100);
}

function toggleZoom() {
	if(pageMode)
		zoomToHeightOut();
	else
		zoomToHeightIn();
}

$('#crop').on('click', function(e) {
	toggleCrop();
	e.preventDefault();
});
var debouncedLayout = _.debounce(recalculateLayout,500);

$(window).on('resize', function()  {debouncedLayout(); });

var socket = io.connect();
socket.on('connect', function() { 
	socket.send(JSON.stringify(navigator.userAgent)); 
	showStatusMessage('Connected');
}); 
socket.on('recompiled', function(timestamp) {
	doRerender();

});

socket.on('pdfPathUpdated', function() {
	showStatusMessage('PDF path updated');
	location.reload();//improve once we can handle adding pages etc.
});

socket.on('disconnect', function() {
	showStatusMessage('disconnected');
});
socket.on('forwardSearch', function(coords) {
	showStatusMessage('Forward-Search invoked');
	goForward(coords);
});

socket.on('doScroll', function(body) {
	$('body, html').animate({scrollTop: $(window).scrollTop()+parseInt(body.amount)},'fast');
});
socket.on('scrollToTop', function(body) {
	scrollToPage(1);
});
socket.on('scrollToBottom', function(body) {
	var lastPage = $('div[data-pagenum]').length;
	scrollToPage(lastPage);
});
socket.on('scrollToPage', function(body) {
	if(scrollToPage(body)) {
		showStatusMessage('Scroll to page '+body);
	}
});
socket.on('nextPage', function() {
	scrollToPage(parseInt(getVisiblePage().getAttribute('data-pagenum'))+1);
});
socket.on('previousPage', function() {
	scrollToPage(parseInt(getVisiblePage().getAttribute('data-pagenum'))-1);
});

socket.on('toggleCrop', function(body) {
	toggleCrop();
});
socket.on('toggleZoom', function(body) {
	toggleZoom();
});

socket.on('doRerender', function() {
	doRerender();
});

function doRerender() {
	if(url) {
		showStatusMessage('Rerendering... ');
		PDFJS.getDocument(url).then(function (pdfDocument) { handlePDF(pdfDocument);});
	}
}

function goForward(coords) {
	coords.h = coords.h;
	console.log('synctex: '+JSON.stringify(coords));
	var div  =  $('div[data-pagenum="'+coords.p+'"]');
	
	//get viewBox to handle clicks in cropped mode
	var svg = $('div[data-pagenum="'+coords.p+'"] > svg');
	var viewBox = svg[0].getAttribute('viewBox').split(' ');
	if(!svg[0].hasAttribute('data-viewBox-noCrop'))
		svg[0].setAttribute('data-viewBox-noCrop',svg[0].getAttribute('viewBox'));
	var viewBoxNoCrop = svg[0].getAttribute('data-viewBox-noCrop').split(' ');

	//scaling introduced by cropping
	var xScale = viewBoxNoCrop[2]/viewBox[2];
	var yScale = viewBoxNoCrop[3]/viewBox[3];

	console.log('viewBox: '+viewBox);


	var realCoords = toRealCoords(coords.x, +(coords.y)+4, svg.width(), svg.height());
	coords.x = (realCoords.x-viewBox[0]*(svg.width()/viewBoxNoCrop[2]))*xScale;
	coords.y = (realCoords.y-viewBox[1]*(svg.height()/viewBoxNoCrop[3]))*yScale;
	var realCoords = toRealCoords(+(coords.w)+10, +(coords.h)+6, svg.width(), svg.height());
	coords.w = realCoords.x*xScale;
	coords.h = realCoords.y*yScale;

	console.log('real: '+JSON.stringify(coords));
	

	jumpHistory.push($(window).scrollTop());
	locationInHistory++;
	$('body, html').animate({scrollTop: div.offset().top+(coords.y)-$(window).height()/2}, 'fast');
	canvas = $('#animationCanvas');
	canvas.css('z-index','400');
	canvas.attr('width',svg.width());
	canvas.attr('height', svg.height());
	canvas.css('top',svg.offset().top);
	canvas.css('left',svg.offset().left);
	canvas.css('position', 'absolute');
	canvas.css('display', 'block');
	var myRectangle =  { 
		x: coords.x,
		y: coords.y,
		w: coords.w,
		h: -coords.h,
		border:2
	};
	

	console.log(myRectangle);
//	console.log(toSyncTexCoords(myRectangle.x,myRectangle.y,div.width(), div.height()));

	var ctx = canvas[0].getContext('2d');
	fadeOutRectangle(myRectangle, ctx , .3);

}

function handlePDF(pdfDocument) {
	pdfDocument.getDestinations().then(function (d) {
		for(key in d){
			pdfDocument.getPageIndex(d[key][0]).then((function(k,i) {refDictionary[k]=(i+1); }).bind(null, key));
		}
	}
	);
	//console.log(pdfDocument.transport);
	var numPages = pdfDocument.numPages;
	var container = $('#viewerContainer');
	var divs = container.children('div[data-pagenum]').length;
	showStatusMessage('PDF loading..., rendering '+numPages+' pages');
	var pageDelta = numPages - divs;
	if(pageDelta>0) {
		showStatusMessage('Have to add pages!');
		for(i=1; i<= pageDelta; i++) {
			$('<div data-pagenum="'+(i+divs)+'" class="whiteBorder">').appendTo(container);
			$('<div data-annotation="'+(i+divs)+'" class="annotationLayer">').appendTo(container);
		}
	}
	else if (pageDelta<0){
		container.children('div[data-pagenum]:gt('+(numPages-1)+')').remove();
		container.children('div[data-annotation]:gt('+(numPages-1)+')').remove();
		showStatusMessage('Have to remove pages!');
	}

	//$('svg').remove();
		renderAllPages();
	
		//renderVisiblePages();

//    function renderVisiblePages() {
//	    container.children('canvas').map(function () {
//	    var pagenum = +($(this).attr('data-pagenum')); // convert to integer
//	    var canvas = $(this)[0];
//	    if (isVisible($('img[data-pagenum="'+pagenum+'"]')[0])) {
//		if (render_cache[pagenum]) {
//		    //console.log("found visible page", pagenum, 'already rendered');
//		} else {
//		//	console.log("found visible page", pagenum, 'RENDERING');
//			renderPage(canvas, pagenum);
//			render_cache[pagenum] = true;
//		}
//		if (!render_cache[pagenum+1] && pagenum+1<=numPages) {
//		    var nextCanvas = $(this).next().next();
//			renderPage(nextCanvas[0], pagenum+1);
//			render_cache[pagenum+1] = true;
//		}
//			
//
//	    }
//	});
//    }

function renderAllPagesMixed() {
	var currPage = getVisiblePage();
	var currPageNum =  parseInt(currPage.getAttribute('data-pagenum'));

	//build up render order
	var pipeline = [];
	pipeline.push(currPageNum);
	for(var i = 1; (currPageNum-i>0 || currPageNum+i<=numPages); i++) {
		if(currPageNum+i<=numPages) {
			pipeline.push(currPageNum+i);
		}
		if(currPageNum-i>0)
			pipeline.push(currPageNum-i);
	}
	renderPagesSync(pipeline.slice(0,3), function(){showStatusMessage('Wait a moment...');renderPagesAsync(pipeline.slice(3))});

}
function renderAllPages() {
	var currPage = getVisiblePage();
	var currPageNum =  parseInt(currPage.getAttribute('data-pagenum'));

	//build up render order
	var pipeline = [];
	pipeline.push(currPageNum);
	for(var i = 1; (currPageNum-i>0 || currPageNum+i<=numPages); i++) {
		if(currPageNum+i<=numPages) {
			pipeline.push(currPageNum+i);
		}
		if(currPageNum-i>0)
			pipeline.push(currPageNum-i);
	}
	console.log(pipeline);

	if(renderMode=='sync')
		renderPagesSync(pipeline);
	else {
		renderPagesAsync(pipeline);
	}
}

function renderPagesAsync(pipeline) {
	//container.children('div').map(function() {
	var length = pipeline.length;
	var currPageNum=pipeline[0];
	for(var i = 0; i<length; i++) {
		renderPage(pipeline[i]);
	}
}



//@pipeline = array of integers
//renders pages in pipeline in order of pipeline
function renderPagesSync(pipeline, callback) {
	if(pipeline.length==0) {
		if(callback === undefined)
			return;
		else {
			callback();
			return;
		}
	}


	var 	pagenum = pipeline.shift();
		

	renderPage(pagenum, function() {renderPagesSync(pipeline, callback);});
}


  function storeAnnotations(page, viewport, canvas, pagenum, cropViewBox) {
	  return promise = page.getAnnotations().then(function (annotationsData) {
		  annData[pagenum] = annotationsData;
		  oldViewbox = viewport.viewBox;
		  var html = [];
		  for (var i = 0; i < annotationsData.length; i++) {
			  var data = annotationsData[i];
			  //console.log(data);
			    html[i]= PDFJS.AnnotationUtils.getHtmlElement(data, page.commonObjs);
		  }
		  annotations[pagenum]=html;
	  }
		  );
  }


  function setupAnnotationsOld(page, viewport, canvas, pagenum,cropViewBox) {
    var annotationLayerDiv = $('div[data-annotation='+pagenum+']'); 
    var div = $('div[data-pagenum='+pagenum+']');
    var canvasOffset = $(canvas).offset();
    var promise = page.getAnnotations().then(function (annotationsData) {
      viewport = viewport.clone({
        dontFlip: true});

      for (var i = 0; i < annotationsData.length; i++) {
        var data = annotationsData[i];
	console.log(data);
        var annotation = PDFJS.AnnotationUtils.getHtmlElement(data, page.commonObjs);
//        if (!annotation || !annotation.hasHtml) {
//          continue;
//        }

        var element = annotation;//.getHtmlElement(page.commonObjs);
        var rect = data.rect;
        var view = page.view;
	console.log('viewport'+viewport.viewBox);
	console.log('view '+view);
        rect =[
          rect[0]-view[0],
          view[3] - rect[1] + view[1],
          rect[2],
          view[3] - rect[3] + view[1]];
	console.log('rect:'+rect);
        rect = PDFJS.Util.normalizeRect(rect);
	console.log('normRect:'+rect);
        element.style.left = (canvasOffset.left + rect[0]) + 'px';
	console.log(canvasOffset.top + parseInt(rect[1]));
        element.style.top = (canvasOffset.top + parseInt(rect[1])) + 'px';
        element.style.position = 'absolute';
	element.setAttribute('data-dest', data.dest);
	$(element).off('click');
	$(element).click(function() {
		console.log($(this).attr('data-dest'));scrollToPage(refDictionary[$(this).attr('data-dest')]);});
	$(element).mouseover(function() {console.log($(this).attr('data-dest'));});

        var transform = viewport.transform;
        var transformStr = 'matrix(' + transform.join(',') + ')';
        CustomStyle.setProp('transform', element, transformStr);
	console.log(transformStr);
        var transformOriginStr = -rect[0] + 'px ' + -rect[1] + 'px';
        CustomStyle.setProp('transformOrigin', element, transformOriginStr);
	CustomStyle.setProp('border', element, '1px solid blue');

        annotationLayerDiv.append(element);
      }
    });
    return promise;
  }

function renderPage(pagenum, callback) {
	var div = $('div[data-pagenum='+pagenum+']');
	
	div.off('click');
	div.click( function (e) { 
		//console.log("Click!! "+e.pageX+" "+e.pageY);
		if(e.target.tagName.substring(0,3) == 'svg'){
			if ($('.confirmDialog').length>0) {
				$('.confirmDialog').remove();
			}
			else {
				confirmReverseSearch(e, div);
			}
		}
	});
	var cWidth = container.width();
	return pdfDocument.getPage(pagenum).then(function (page) {
		page.getOperatorList().then( function (opList) {
			var viewport = page.getViewport(cWidth/page.getViewport(1).width);
			var svgGFX = new PDFJS.SVGGraphics(page.commonObjs, page.objs);
			return svgGFX.getSVG(opList, viewport).then(function (svg) {
				var oldSVG = div.find('svg');
				//console.log(oldSVG);
				if(oldSVG.length >0) 
					oldSVG.replaceWith(svg);
				else
					div.append(svg);



				//div.append(svg);
				showStatusMessage('Page '+pagenum+' finished rendering');
				//div.removeClass('whiteBorder');
				div.addClass('page');
				//div.toggleClass('changed');
		//		setTimeout(function () {div.toggleClass('changed')}, 1000);
				var cropBox = getCropViewBox(svg);
				svg.setAttribute('data-viewBox-crop', cropBox);

				//console.log(viewport);


			//	if(pageMode)
			//		zoomToHeightIn();

				if(callback === undefined)
					callback = function () {};

				//setupAnnotationsOld(page, viewport, svg, pagenum,cropBox);
				storeAnnotations(page, viewport, svg, pagenum,cropBox).then(
						function () 
						{ 
							setupAnnotations($(svg));
							if(cropped){
								cropSVG(svg);
							}
						});
				if(!cancelRendering)
					callback();
				else
					cancelRendering = false;

			}); 
		});
	});
}






}
function confirmReverseSearch(e, div) {
	$('.confirmDialog').remove();
	var dialog =$('<div class="confirmDialog" style="top:'+(e.clientY+$(window).scrollTop()-50)+'px; left: '+e.clientX+'px;">Go to source?</div>').appendTo($('body')); //iOS not giving correct clientX values?!
	dialog.click(function() {
		reverseSearch(e,div);
		$(this).remove();
	});
}


function reverseSearch(e, div) {   

	var pagenum = div.attr('data-pagenum');
	var offset_t = div.offset().top - $(window).scrollTop();
	var offset_l = div.offset().left - $(window).scrollLeft();

	var left = Math.round( (e.clientX - (offset_l+borderWidth)) );
	var top = Math.round( (e.clientY - (offset_t+borderWidth)) );

	//get viewBox to handle clicks in cropped mode
	var div = $('div[data-pagenum="'+pagenum+'"]');
	var svg = div.children('svg');;
	var viewBox = svg[0].getAttribute('viewBox').split(' ');
	var viewBoxNoCrop;
	if(svg[0].hasAttribute("data-viewBox-noCrop"))
			 viewBoxNoCrop = svg[0].getAttribute('data-viewBox-noCrop').split(' ');
		else
			 viewBoxNoCrop = viewBox;

	console.log(viewBoxNoCrop);

	var xScale = (div.width()-2*borderWidth)/(viewBox[2]-2*borderWidth);
	var yScale = (div.height()-2*borderWidth)/(viewBox[3]-2*borderWidth);
	console.log('div width: '+div.width());
	console.log("left :"+(left/xScale+parseFloat(viewBox[0]))+" top: "+(top/yScale+parseFloat(viewBox[1])));


	//console.log(left/xScale+parseInt(viewBox[0]),top/yScale+parseInt(viewBox[1]),svg.width(), svg.height());
	var coords = toSynctexCoords(
			left/xScale+parseFloat(viewBox[0]),
			top/yScale+parseFloat(viewBox[1]),
			viewBoxNoCrop[2]-2*borderWidth, 
			viewBoxNoCrop[3]-2*borderWidth
			);
	console.log(coords);
	coords.page = pagenum;
	socket.emit('reverseSearch',JSON.stringify(coords));
	showStatusMessage('Reverse search completed');
}

//throttledRenderVisiblePages = _.throttle(renderVisiblePages,1000);


function  getPageDisplayDimensions(callback)  {
	pdfDocument.getPage(1).then( function(page) {
		var viewport = page.getViewport(container.width()/page.getViewport(1).width);
		callback({width: viewport.width, height: viewport.height});
	});
}

//
//    $('#zoomIn').off('click');
//    $('#zoomIn').on('click', function() {
//	    container.width(container.width()+100);
//	    recalculateLayout(true);
//	    
//    });
//    $('#zoomOut').off('click');
//    $('#zoomOut').on('click', function() {
//	    container.width(container.width()-100);
//	    recalculateLayout(true);
//	    
//    });
//    $('#zoomReset').off('click');
//    $('#zoomReset').on('click', function() {
//	    container.children('canvas').map( function() {
//		    $(this).attr("width",$(window).width()-200);
//		    container.css("width","100%");
//	    });
//	    recalculateLayout(true);
//	    
//    });



function isVisible(o) {
	var rec = o.getBoundingClientRect();
	if (($(window).height()-rec.top>0&&rec.top>0) || (rec.top <= 0 && rec.bottom >0)){
		if (rec.top <0)
			return Math.min(rec.bottom, $(window).height());
		if (rec.top>=0 && rec.bottom< $(window).height())
			return rec.bottom - rec.top;
		if (rec.top>=0 && rec.bottom>= $(window).height());
			return $(window).height() - rec.top;
	}
	return 0;
}


//returns first visible page!
function getVisiblePage(last) {
	var divs = $('div[data-pagenum]');
	var favorite = {p: divs[0], visibleAmount: 0};
	var part=0;
	var currentAmount;
	for(i=0;i<divs.length;i++) {
		currentAmount =  isVisible(divs[i]);
		//console.log('Page '+i+', visible amount '+currentAmount);
		if(currentAmount>10){
			//console.log(isVisible(divs[i]));
			if(last === undefined){
				if (currentAmount > favorite.visibleAmount)
					favorite = {p: divs[i], visibleAmount: currentAmount};
			}
			else{
				if (currentAmount >= favorite.visibleAmount)
					favorite = {p: divs[i], visibleAmount: currentAmount};
			}

		}
	}
	return favorite.p;
}

//function getOutputScale(ctx) {
//  var devicePixelRatio = window.devicePixelRatio || 1;
//  var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
//                          ctx.mozBackingStorePixelRatio ||
//                          ctx.msBackingStorePixelRatio ||
//                          ctx.oBackingStorePixelRatio ||
//                          ctx.backingStorePixelRatio || 1;
//  var pixelRatio = devicePixelRatio / backingStoreRatio;
////  return { scaled: false};
//  return {
//    sx: pixelRatio,
//    sy: pixelRatio,
//    scaled: pixelRatio !== 1
//  };
//}

function showStatusMessage(text) {
	$("#statusContainer").append("<div >"+text+"</div>");
	$("#statusContainer div:last").fadeIn().delay(2000).fadeOut();
}
function scrollToPage(i, doNotAnimate) {
	var scrollTop =$(window).scrollTop();
	if(scrollTop != jumpHistory[locationInHistory]){
		jumpHistory.push($(window).scrollTop());
		locationInHistory++;
	}
	console.log(locationInHistory+' in '+jumpHistory);
	if ($('div[data-pagenum='+i+']').length== 0) 
	return false;
	else  {
		if(doNotAnimate) {
			$('body,html').scrollTop($('div[data-pagenum='+i+']').offset().top);
		}
		else
			$('body,html').animate({scrollTop: $('div[data-pagenum='+i+']').offset().top}, 'fast');
	return true;
	}
}

function fadeOutRectangle(rectangle, context, alpha ) {
	if(alpha > 0)  {
		context.clearRect(0,0, context.canvas.width,context.canvas.height);
		drawRectangle(rectangle, context, "rgba(255,255,0,"+alpha+")", "rgba(255,0,0,"+alpha+")");
		window.webkitRequestAnimationFrame( function() { 
			fadeOutRectangle(rectangle, context, alpha-1/1000);});
				}
}

function drawRectangle(myRectangle, context,fillstyle, strokestyle) {
	context.beginPath();
	context.rect(myRectangle.x, myRectangle.y, myRectangle.w, myRectangle.h);
	context.fillStyle = fillstyle;
	context.fill();
	context.lineWidth = myRectangle.borderWidth;
	context.strokeStyle = strokestyle;
	context.stroke();
	context.closePath();
}

function toggleMenu(){
	var control = $('#controlContainer');
	if(control.css('left')=='0px')
		hideMenu();
	else 
		showMenu();
}

function toggleRenderMode() {
	if(renderMode == 'sync') {
		renderMode = 'async';
		$('#renderModeMenu').text('Render mode: async');
		return;
	}
	if(renderMode == 'async') {
		renderMode = 'sync';
		$('#renderModeMenu').text('Render mode: sync');
		return;
	}
}

$(window).on('scroll', hideMenu);
function showMenu(){
	var control = $('#controlContainer');
	if(control.css('left')!='0px')
		control.animate({left: '0px'},400);
}
function hideMenu(){
	var control = $('#controlContainer');
	var menuWidth = control[0].getBoundingClientRect().width;
	var buttonWidth = $('#menu')[0].getBoundingClientRect().width;

	if(control.css('left')=='0px')
		control.animate({left: (-menuWidth+buttonWidth)+'px'},400);
}

function forwardInHistory() {
	console.log(locationInHistory+' in '+jumpHistory);
	if(locationInHistory < jumpHistory.length-1){
		var jump =jumpHistory[++locationInHistory];
		$('body, html').animate({scrollTop: jump}, 'fast');
		showStatusMessage("Moved forward in jump history");
		}
	else
		showStatusMessage("Already at most recent jump position");
	console.log(locationInHistory+' in '+jumpHistory);
}

function backwardInHistory() {
	console.log(locationInHistory+' in '+jumpHistory);
	if(locationInHistory==(jumpHistory.length)){
		var scrollTop =  $(window).scrollTop();
		if(scrollTop != jumpHistory[jumpHistory.length-1]) 
			jumpHistory.push($(window).scrollTop());
	}
	if(locationInHistory >0){
		var jump =jumpHistory[--locationInHistory];
		$('body, html').animate({scrollTop: jump}, 'fast');
		showStatusMessage("Moved backwards in jump history");
		}
	else
		showStatusMessage("Already at earliest jump position");
	console.log(locationInHistory+' in '+jumpHistory);
}

function renderAnnotations() {
	$('section').remove();
	$(document.getElementsByTagName('svg:svg')).map(function() { setupAnnotations($(this));});
}
function setupAnnotations(svg) {
	var div = svg.parent();
	var pagenum =  div.attr('data-pagenum');
	var annotationLayerDiv = $('div[data-annotation='+pagenum+']'); 
	var canvasOffset = svg.offset();
	annotationLayerDiv.children().remove();


	//$('div[data-annotation='+pagenum+'] section').remove();
	for (var i = 0; i < annotations[pagenum].length; i++) {
		var data = annData[pagenum][i];
	var annotation = annotations[pagenum][i];
//        if (!annotation || !annotation.hasHtml) {
//          continue;
//        }

	//console.log(data);
        var element = annotation;//.getHtmlElement(page.commonObjs);
        var rect = data.rect;
	var view = oldViewbox;
	//console.log('view '+view);
	if(!element.hasAttribute('data-transform')){
		var transform = svg.children()[0].getAttribute('transform').split('(')[1];
		transform = transform.split(')')[0];
		transform = transform.split(' ');
		$(element).attr('data-transform', transform.join(' '));
		$(element).attr('data-transform-orig', transform.join(' '));
	}
	transform = $(element).attr('data-transform').split(' ');

        rect =[
          (rect[0]-view[0])*transform[0],
          (view[3] - rect[1] + view[1])*(-transform[3]), ///who knows why we have to put a - here?!
          rect[2]*(transform[0]),
          (view[3] - rect[3] + view[1])*(-transform[3])];

       rect = PDFJS.Util.normalizeRect(rect);
	//console.log('normrect:'+rect);
//	console.log('normRect:'+rect[1]);


	
        element.style.left = (canvasOffset.left + parseFloat(rect[0])) + 'px';
        element.style.top = (canvasOffset.top + parseFloat(rect[1])) + 'px';
	//element.style.width = parseFloat(element.style.width.split('p')[0])*transform[0]+'px';
	element.style.width = (parseFloat(rect[2])-parseFloat(rect[0]))+'px';
	element.style.height = parseFloat(rect[3]-rect[1])+'px';
        element.style.position = 'absolute';
	element.setAttribute('data-dest', data.dest);
	$(element).off('click');
	$(element).click(function() {
		console.log($(this).attr('data-dest'));scrollToPage(refDictionary[$(this).attr('data-dest')]);});
	$(element).mouseover(function() {console.log($(this).attr('data-dest'));});
//
        //var transformStr = 'matrix(' + transform.join(',') + ')';
		
	//transform[3]=-(transform[3]);
	//transform[5]=0;
	//transform = transform.join(',');
	//transform = transform+')';
	//console.log('trafo'+transform);
        var transformOriginStr = -rect[0] + 'px ' + -rect[1] + 'px';
        CustomStyle.setProp('transformOrigin', element, transformOriginStr);
	$(element).addClass('pdflink');
	//CustomStyle.setProp('border', element, '1px solid green');

        annotationLayerDiv.append(element);
      }
  }
//menu
//keybindings
Mousetrap.bind('shift+c', function() { cancelRendering=true; showStatusMessage("Canceled rendering.");});
Mousetrap.bind('j', function() { 
	locationInHistory = jumpHistory.length;
	scrollToPage(parseInt(getVisiblePage('last').getAttribute('data-pagenum'))+1);});
Mousetrap.bind('k', function() { 
	if(locationInHistory != jumpHistory.length)
		locationInHistory = jumpHistory.length;
	scrollToPage(parseInt(getVisiblePage().getAttribute('data-pagenum'))-1);}
		);
Mousetrap.bind('c', toggleCrop);
Mousetrap.bind('ctrl+o', forwardInHistory);
Mousetrap.bind('` `', backwardInHistory);
Mousetrap.bind('e', function() { $('body, html').animate({scrollTop: $(window).scrollTop()-300},'fast');});
Mousetrap.bind('y', function() { $('body, html').animate({scrollTop: $(window).scrollTop()+300},'fast');});
Mousetrap.bind('r', function() {doRerender();});
Mousetrap.bind('g g', function() {
	locationInHistory = jumpHistory.length;
	scrollToPage(1);});
Mousetrap.bind('G', function() {
	locationInHistory = jumpHistory.length;
	var lastPage=$('div[data-pagenum]').length; 
	scrollToPage(lastPage);});
Mousetrap.bind('z', toggleZoom);
for(i=0;i<99;i++) {
	for(j=0;j<=9;j++) {
//		console.log('bind '+(i==0?'':i+' ')+j+' g g');
		Mousetrap.bind((i==0?'':i+' ')+j+' g g', function(t,s) {
			var page = s.split("g")[0].replace(' ','');
		locationInHistory = jumpHistory.length;
		scrollToPage(page);});
	}
}

# PDFViewer

First things first: 
This is a hobby side project for my own entertainment and education; if you find it useful, feel free to let me know, and perhaps even improve it!


PDFViewer is a simple application based on PDF.js and NodeJS  made for use with Neovim with the LatexBox plugin  (or any other software which can communicate through RPC). Its purpose is to act as a viewer for writing LaTeX documents. Therefore it should be comparable in capabilities to, e.g., Skim, xpdf, etc..

It relies on the rendering engine of PDF.JS in a modern browser.  While this approach has performance disadvantages when compared with a stand alone application like Skim, it has the advantage of being portable. For example, it is easily possible to run the front end of this PDFViewer on a different device than the one where compilation of the latex document takes place, while retaining the full feature set. 

In particular, it can be run  on mobile devices, although there are limits with regards to document size, as the javascript engines of mobile browsers (even fast tablets) do not seem to be fast enough for PDF.JS and large documents; at least not yet.

### Features


* LaTeX authoring and viewing of compiled document can take place on separate devices.
* Forward and inverse search, even on separate devices
* Vim like keyboard bindings: j,k for scrolling, gg for go to top, etc.
* Viewer can be controlled from Neovim editor, even when run on separated devices.
* Cropping margins for larger display of pdfs.
* Supports hyperlinks in pdf documents.

PDFViewer consists of three parts: 

* A NodeJS web server,
* A javascript application, served by the NodeJS web server, utilizing PDF.JS to display a pdf
file and allow interactions like cropping margins, and reverse search.
* A small set of Neovim mappings allowing forward search, and control of the web app.

The NodeJS app facilitates the communication between the editor and the in-browser viewer.


## Setup

Environment: You need to have 
* LaTeX including Synctex (i.e.~via the MacTex distribution, or LaTeX Live). 
* Neovim including LaTeX-Box. Best installed via Vundle or something equivalent.
* NodeJS.

1. Download the sources or checkout the repository from Github.
2. In the pdfviewer main folder, execute `npm install`.
3. At the top of the file `pdfviewer.js`, you can optionally change the port on which the node server runs, and add username/password protection. The default port is 4000.
4. See the included file `example.vim` for the commands facilitating communication between Neovim and the node webserver. If you changed the default port in step 3, make sure to change the port in the Neovim commands as well.

## Usage

* Start the webserver: `node pdfviewer.js`.
* Start Neovim, and register it with the server: `:RegisterWithNode`.
* Open the LaTeX document you would like to edit; compile it to PDF using LaTeX Box plugin.
* Execute `:WatchPDFWithNode</span> in Neovim`.
* Open your browser and go to http://localhost:4000, or whichever address and port the web server is running on.
* The PDF should now be displayed.  From now on, whenever you recompile your document with the LaTexBox command `<leader>ll, the viewer will refresh the displayed pdf. 
* From Neovim, to do forward search, use the LatexBox command <leader>ls
* From the browser, to do reverse search, click on the point in the pdf, and confirm. (NB: The confirmation box is large, as to accomodate touch enabled devices. Feel free to change the css).
* In the browser, some functions are available from the dismissable menu in the top left corner, again to accomodate mobile devices.

But all functions can be accessed from the keyboard:
	- `j,k` move one page down, or up.
	- `gg,G` jump to the top, or end.
	- If `n` is a number between 1 and 99, `ngg` will jump to page `n`.
	- `` (two back ticks) goes backwards in the jump history
	- `CTRL+o` goes forward in the jump history .
	- `c` toggles cropped display.
	- `r` rerenders the pdf.
* These functions can also be bound to keys INSIDE Neovim. See the included configuration file `example.vim` for an example of how this can be implemented without overriding Neovim bindings.
			
## Acknowledgements
I learned most of what is in the code from sources on the web, most notably the PDF.JS examples, particularly the examples [1] and [2].



[1]: https://github.com/mozilla/pdf.js/tree/master/examples/svgviewer
[2]: https://github.com/sharelatex/angular-pdfjs-viewer/tree/master/example-pdfjs/content




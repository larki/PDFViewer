" This is how I use PDFViewer with Neovim and LaTexBox. 
"
"Load some useful plugins with vundle

call vundle#begin()
Plugin 'LaTeX-Box-Team/LaTeX-Box' "required!
Plugin 'vim-airline/vim-airline'
call vundle#end()            
filetype plugin indent on    

command! RegisterWithNode :silent !curl -d socket=$NVIM_LISTEN_ADDRESS http://localhost:4000/registerNeovim
command! WatchPDFWithNode :execute "call rpcnotify(0, 'watchPDF',split('"LatexBox_GetOutputFile()"'))"

let g:LatexBox_latexmk_options="-pv -pdf -e '$pdf_previewer=q/curl http:\\/\\/localhost:4000\\/doRerender/;'"
let g:LatexBox_viewer="curl http://localhost:4000/doRerender"

nnoremap <silent><Leader>ls :<C-u>silent !synctex view -i <C-R>=line('.')<CR>:<C-R>=col('.')<CR>:%:p  -o <C-R>=LatexBox_GetOutputFile()<CR> -d <C-R>=LatexBox_GetTexRoot()<CR> -x "curl -d  'p=\%{page+1}&x=\%{h}&y=\%{v}&w=\%{width}&h=\%{height}' http://localhost:4000/forward"<CR><C-l>

"Examples for mappings
nnoremap <silent> <leader>f :call rpcnotify(0,'doScroll', 500)<CR>
nnoremap <silent> <leader>b :call rpcnotify(0,'doScroll', -500)<CR>
nnoremap <silent> <leader>c :call rpcnotify(0,'toggleCrop')<CR>
nnoremap <leader>j :silent call rpcnotify(0,'nextPage')<CR>
nnoremap <leader>k :silent call rpcnotify(0,'previousPage')<CR>


"Example for a 'PDF Control Mode'. PDF Control mode is indicated by statusline
nnoremap <leader><leader> :call PDFControlMappings()<CR>
function! PDFControlMappings()
	let i = 1
	while i <= 150
		execute "nnoremap ". i."gg :silent call rpcnotify(0,'scrollToPage',".i.")<CR>"
		let i = i + 1
	endwhile   
	nnoremap gg :silent call rpcnotify(0,'scrollToTop')<CR>
	nnoremap G :silent call rpcnotify(0,'scrollToBottom')<CR>
	nnoremap j :silent call rpcnotify(0,'nextPage')<CR>
	nnoremap k :silent call rpcnotify(0,'previousPage')<CR>
	nnoremap  e :silent  call rpcnotify(0,'doScroll', 200)<CR>
	nnoremap  y :silent  call rpcnotify(0,'doScroll', -200)<CR>
	nnoremap  f :silent  call rpcnotify(0,'doScroll', 600)<CR>
	nnoremap  b :silent  call rpcnotify(0,'doScroll', -600)<CR>
	nnoremap  c :silent  call rpcnotify(0,'toggleCrop')<CR>
	nnoremap  r :silent  call rpcnotify(0,'doRerender')<CR>
	nnoremap <silent> <leader><leader> :call NoPDFControlMappings()<CR>
	execute 'AirlineToggle'
	set statusline=PDFCONTROL
endfunction
function! NoPDFControlMappings()
	let i=1
	while i <= 150
		execute 'unmap '.i.'gg'
		let i = i + 1
	endwhile   
	unmap e
	unmap y
	unmap f
	unmap b
	unmap j
	unmap k
	unmap c
	unmap G
	unmap gg
	unmap r
	nnoremap <silent> <leader><leader> :call PDFControlMappings()<CR>
	execute 'AirlineToggle'
endfunction

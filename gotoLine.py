#!/usr/bin/env python3
import sys
from neovim import attach
print(sys.argv[1]);
#nvim = attach('tcp', address='127.0.0.1', port=6666)
nvim = attach('socket', path=sys.argv[1])
nvim.command(':'+sys.argv[2])

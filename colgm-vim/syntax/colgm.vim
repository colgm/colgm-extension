" Vim syntax file
" Language: colgm
" Maintainer: You :)
" Description: Syntax highlighting for colgm language

if exists("b:current_syntax")
  finish
endif

" --- Keywords ---
syntax keyword colgmKeyword func pub var return struct enum union match use defer and or if else elsif for while foreach forindex impl break continue nil true false 

" --- Types ---
syntax keyword colgmType i8 i16 i32 i64 u8 u16 u32 u64 f32 f64 bool void self

" --- Built-in Constants ---
syntax keyword colgmConstant nil true false

" --- Function Definition (match function name) ---
syntax match colgmFunction /func\s\+\zs[a-zA-Z_][a-zA-Z0-9_]*/

" --- Function Call ---
syntax match colgmCall /\<[a-zA-Z_][a-zA-Z0-9_]*\>\s*(/ contained

" --- Numbers ---
syntax match colgmHexNumber /\v<0x[0-9a-fA-F]+>/
syntax match colgmOctNumber /\v<0o[0-7]+>/
syntax match colgmFloat /\v<\d+\.\d+>/
syntax match colgmInt /\v<\d+>/

" --- Strings & Characters ---
syntax region colgmString start=/"/ skip=/\\"/ end=/"/
syntax region colgmChar start=/'/ skip=/\\'/ end=/'/

" --- Attributes / Conditional Compilation ---
syntax match colgmAttribute /#\[[a-zA-Z0-9_="]*\]/

" --- Operators ---
syntax match colgmOperator /==\|!=\|<=\|>=\|<\|>\|=\|+\|-\|\*\|\/\|%\||\|\^\|&\|=>\|&&\|||/

" --- Comments ---
syntax region colgmComment start="//" end="$"

" --- Grouping ---
syntax match colgmDelimiter /[{}()\[\],.:;]/ 

" --- Highlighting ---
highlight def link colgmKeyword Keyword
highlight def link colgmType Type
highlight def link colgmConstant Constant
highlight def link colgmFunction Function
highlight def link colgmCall Identifier
highlight def link colgmHexNumber Number
highlight def link colgmOctNumber Number
highlight def link colgmFloat Number
highlight def link colgmInt Number
highlight def link colgmString String
highlight def link colgmChar Character
highlight def link colgmComment Comment
highlight def link colgmAttribute PreProc
highlight def link colgmOperator Operator
highlight def link colgmDelimiter Delimiter

let b:current_syntax = "colgm"

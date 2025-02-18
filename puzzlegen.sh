
# stream file and transform it into lines ending in a blunder

wget -O - https://database.lichess.org/standard/lichess_db_standard_rated_2019-09.pgn.bz2 | bzgrep -e '\[Site |\[%eval ' | egrep -a -B1 '\[%eval ' | sed 's/ {[^}]*}//g' | sed 's/?!//g' | sed 's/ [^ ]*\.\.\.//g' | grep -v '\-\-' | sed ':begin;$!N;/\]\n/s/\n/ /;tbegin;P;D' | grep -o '\[Site[^?]*??' > blunderlines

# uniq lines ignoring urls

cat blunderlines | sort -t']' -k2 -u | wc -l

# extract bertin lines to puzzle format

grep '1. e4 e5 2. f4 [^ ]* 3. Nf3 Be7 ' blunderlines | sort -t']' -k2 -u | sed 's/\[Site/{ url:/' | sed 's/\] /, moves: "/' | sed 's/??/??" },/' > html/js/bertin.js

# extract kg*

grep '1. e4 [^ ]* 2. f4 [^ ]* 3. Nf3 ' blunderlines | sort -t']' -k2 -u | sed 's/\[Site/{ url:/' | sed 's/\] /, moves: "/' | sed 's/??/??" },/'

# enrich lines with solutions

node analyse.js ../html/js/kg.js > kg_solutions.js

grep -o best.* kg_solutions.js | sort | uniq -c | sort -n

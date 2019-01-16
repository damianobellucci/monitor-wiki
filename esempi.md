Solo anteprima dell'export, risultati con tutte le pagine (anche quelle disallineate, flag -a ad indicare "all"):</br>
node --max-old-space-size=8192 path/monitor-wiki.js -m export -h en.wikipedia.org -q category:emerging technologies,computer science,chemistry -t 20180101,20180130 -n 200 -f 300 -a


Solo anteprima dell'export, risultati con le sole pagine disallineate (flag -a non presente):</br>
node --max-old-space-size=8192 path/monitor-wiki.js -m export -h en.wikipedia.org -q category:emerging technologies,computer science,chemistry -t 20180101,20180130 -n 200 -f 300



Anteprima ed export, risultati con tutte le pagine (anche quelle disallineate, flag -a ad indicare "all") e scelta indici reperiti con l'export (in base al flag -i, in questo caso prendo tutti e tre le informazioni per gli indici edit, views, comments):</br>
node --max-old-space-size=8192 path/monitor-wiki.js -m export -h en.wikipedia.org -q category:emerging technologies,computer science,chemistry -t 20180101,20180130 -n 200 -f 300 -e file.json -a -i edit,views,comments




Anteprima ed export, risultati con le sole pagine disallineate e scelta indici reperiti con l'export (in base al flag -i, in questo caso prendo solo i commenti, cioè le informazioni relative ai talks):</br>
node --max-old-space-size=8192 path/monitor-wiki.js -m export -h en.wikipedia.org -q category:emerging technologies,computer science,chemistry -t 20180101,20180130 -n 200 -f 300 -e file.json -a -i comments

step 2, prendendo come input uno dei file esportarti in uno dei due esempi precedenti:</br>
node --max-old-space-size=8192 monitor-wiki.js -m analyze -f file.json -t 20180110,20180120 -d analyzedFile.json


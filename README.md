# monitor-wiki

## Requisiti:
<ul><li>Node.js v11.6.0</li></ul>

## Lanciare lo script da terminale:

### sintassi per l'export (step1):
`node --max-old-space-size=8192 path/monitor-wiki.js -m [export|analyze] -h [MediaWikiInstallation] -q [Category:NameOfCategory,PageName,...] -t [startTimespan,endTimespan] -n [misalignmentEdit] -f [misalignmentEditFrequency] -e [exportFileName] -a [misalignmentFilterPages]  -i [edit,views,comments]`


node --max-old-space-size=8192 monitor-wiki.js -m export -h en.wikipedia.org -q Category:Emerging_technologies,Computer_science,Chemistry -t 20180101,20190101 -n 200 -f 300 -e file.json -i edit,views,comments


#### Parametri:
`[export]`: Parametro per indicare la modalità export.</br>
`[MediaWikiInstallation]`: Installazione di MediaWiki (es. en.wikipedia.org, it.wikipedia.org ecc...)
`[Category:NameOfCategory,PageName,...]`: Si possono aggiungere quante categorie e pagine si vogliono alla ricerca. Se le stringhe della forma Category:NameOfCategory oppure PageName contengono spazi, bisogna sostituire gli spazi con un _ (trattino basso, come nel primo esempio con la categoria Category:Emerging technologies, bisogna scrivere la stringa come Category:Emerging_technologies, oppure per la pagina Computer Science, bisogna scrivere la stringa Computer_science).</br>
`[startTimespan,endTimespan]`: Timespan di riferimento. startTimespan e endTimespan sono della forma YYYYMMDD.</br>
 `[misalignmentEdit]`: Parametro di disallineamento delle pagine. misalignmentEdit è relativo al numero di edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. Il parametro misalignmentEditFrequency è relativo alla frequenza degli edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. L'unità di misura della frequenza è in edit/year.</br>
 `[misalignmentEditFrequency]` : Parametro di disallineamento delle pagine. Il parametro misalignmentEditFrequency è relativo alla frequenza degli edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. L'unità di misura della frequenza è in edit/year.</br>
`[exportFileName]`: se presente, oltre alla preview dell'export si ottiene il download dell'export in formato JSON, con nome del file che è il valore del parametro `[exportFileName]`. Il file si troverà nella cartella utente.</br>
`[misalignmentFilterPages]`.Se presente (è necessario il flag -a,con valore stringa vuota del parametro `[misalignmentFilterPages]`), verranno incluse nell'export solo le pagine disallieate.</br>
`[edit,views,comments,all]`.Se presente il flag -i, si specificano gli indici che si vogliono reperire (uno o più) per ogni pagina per l'export, con la stringa 'all' si indica la volontà di reperirli tutti e tre.


#### Esempi:
Esempio per l'export (senza download, solo preview): `node --max-old-space-size=8192 path/monitor-wiki.js -m export -h en.wikipedia.org -q category:emerging technologies,computer science,chemistry -t 20180101,20180130 -n 200 -f 300`
In questo modo si ottiene una preview delle pagine disallieate (flag -a non presente) dell'istallazione di MediaWiki en.wikipedia.org appartenenti alla categoria Emerging technologies e delle pagine Computer Science e Chemistry, riguardante il periodo tra il l'1 Gennaio 2018 e il 30 Gennaio 2019, con parametri di disallineamento n. Edit e frequenza di Edit rispettivamente di 200 e 300.

Esempio per l'export (con preview e download): `node --max-old-space-size=8192 monitor-wiki.js -m export -h en.wikipedia.org -q category:emerging technologies,computer science,chemistry -t 20180101,20180130 -n 200 -f 300 -e file.json -a -i edit,views,comments`
In questo modo si ottiene il risultato dell'esempio precedente con download dell'export sotto il nome di exportedFile, includendo anche le pagine non disallieate (flag -a). Per ogni pagina si prendono edit, views, comments (-i edit,views, comments).

### sintassi per l'analisi (step2):
`node path/monitor-wiki.js
-m [analize] -f [exportFileName] -t [startTimespan,endTimespan] -d [analizeFileName]`

#### Parametri:
`[analyze]`: Parametro per indicare la modalità analisi.</br>
`[exportFileName]`: Nome del file (output della modalità export, step 1) contenente dati di una collezione di pagine da analizzare.</br>
`[startTimespan,endTimespan]`: Timespan (restrizione del timespan dello step 1) per l'analisi dei dati.
`[analizeFileName]`: si ottiene un file in formato JSON relativo all'analisi del file `[exportFileName]`, con nome del file ottenuto che è il valore del parametro `[analizeFileName]`. Il file si troverà nella cartella utente.

#### Esempio:
`node --max-old-space-size=8192 monitor-wiki.js -m analyze -f file.json -t 20180110,20180130 -d analyzedFile.json `
In questo modo si ottiene il file analyzedFile, che è il file relativo all'analisi del file exportedFile riguardante il periodo tra il 10 Ottobre 2018 e il 5 Dicembre 2018. 



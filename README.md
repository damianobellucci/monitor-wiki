# monitor-wiki

## Requisiti:
Node.js v11.6.0

## Lanciare lo script da terminale:

### sintassi per l'export (step1):
`node path/monitor-wiki.js
[export] [MediaWikiInstallation] [Category:NameOfCategory,PageName,...] [startTimespan,endTimespan] [misalignmentEdit,misalignmentEditFrequency] [exportFileName]`

#### Parametri:
`[export]`: Parametro per indicare la modalità export.</br>
`[MediaWikiInstallation]`: Installazione di MediaWiki (es. en.wikipedia.org, it.wikipedia.org ecc...)
`[Category:NameOfCategory,PageName,...]`: Si possono aggiungere quante categorie e pagine si vogliono alla ricerca. Se le stringhe della forma Category:NameOfCategory oppure PageName contengono spazi, bisogna sostituire gli spazi con un _ (trattino basso, come nel primo esempio con la categoria Category:Emerging technologies, bisogna scrivere la stringa come Category:Emerging_technologies, oppure per la pagina Computer Science, bisogna scrivere la stringa Computer_science).</br>
`[startTimespan,endTimespan]`: Timespan di riferimento. startTimespan e endTimespan sono della forma YYYYMMDD.</br>
 `[misalignmentEdit,misalignmentEditFrequency]`: Parametri di disallineamento delle pagine. misalignmentEdit è relativo al numero di edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. Il parametro misalignmentEditFrequency è relativo alla frequenza degli edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. L'unità di misura della frequenza è in edit/year.</br>
`[exportFileName]`: se presente, oltre alla preview dell'export si ottiene il download dell'export in formato JSON, con nome del file che è il valore del parametro `[exportFileName]`. Il file si troverà nella cartella utente.</br>


#### Esempi:
Esempio per l'export (senza download, solo preview): `node monitor-wiki.js export en.wikipedia.org Category:Emerging_technologies,Computer_science,Chemistry 20180801,20190101 200 300`
In questo modo si ottiene una preview di disallineamento delle pagine dell'istallazione di MediaWiki en.wikipedia.org appartenenti alla categoria Emerging technologies e delle pagine Computer Science e Chemistry, riguardante il periodo tra il l'1 Agosto 2018 e l'1 Gennaio 2019, con parametri di disallineamento n. Edit e frequenza di Edit rispettivamente di 200 e 300

Esempio per l'export (con preview e download): `node monitor-wiki.js export en.wikipedia.org Category:Emerging_technologies,Computer_science,Chemistry 20180801,20190101 200 300 exportedFile`
In questo modo si ottiene il risultato dell'esempio precedente con download dell'export sotto il nome di exportedFile

### sintassi per l'analisi (step2):
`node path/monitor-wiki.js
[analize] [exportFileName] [startTimespan,endTimespan] [analizeFileName]`

#### Parametri:
`[analyze]`: Parametro per indicare la modalità analisi.</br>
`[exportFileName]`: Nome del file (output della modalità export, step 1) contenente dati di una collezione di pagine da analizzare.</br>
`[startTimespan,endTimespan]`: Timespan (restrizione del timespan dello step 1) per l'analisi dei dati.
`[analizeFileName]`: si ottiene un file in formato JSON relativo all'analisi del file `[exportFileName]`, con nome del file ottenuto che è il valore del parametro `[analizeFileName]`. Il file si troverà nella cartella utente.

#### Esempio:
`node path/monitor-wiki.js analyze exportedFile 20181010,20181205 analyzedFile `
In questo modo si ottiene il file analyzedFile, che è il file relativo all'analisi del file exportedFile riguardante il periodo tra il 10 Ottobre 2018 e il 5 Dicembre 2018. 


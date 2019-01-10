# monitor-wiki

## Lanciare lo script da terminale:

### sintassi per l'export (step1):
`node path/monitor-wiki.js
[export] [Category:NameOfCategory,PageName,...] [startTimespan,endTimespan] [misalignmentEdit,misalignmentEditFrequency] [exportFileName]`

#### Parametri:
`[export]`: l'OR tra le due stringhe è esclusivo, è possibile fare o l'export o l'analisi dei dati.</br>
`[Category:NameOfCategory,PageName,...]`: Si possono aggiungere quante categorie e pagine si vogliono alla ricerca. Se le stringhe della forma Category:NameOfCategory oppure PageName contengono spazi, bisogna sostituire gli spazi con un _ (trattino basso, come nel primo esempio con la categoria Category:Emerging technologies, bisogna scrivere la stringa come Category:Emerging_technologies, oppure per la pagina Computer Science, bisogna scrivere la stringa Computer_science).</br>
`[startTimespan,endTimespan]`: Timespan di riferimento. startTimespan e endTimespan sono della forma YYYYMMDD.</br>
 `[misalignmentEdit,misalignmentEditFrequency]`: Parametri di disallineamento delle pagine. misalignmentEdit è relativo al numero di edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. Il parametro misalignmentEditFrequency è relativo alla frequenza degli edit di una pagina (nel dato timespan) sotto la quale la pagina risulta disallineata. L'unità di misura della frequenza è in edit/year.</br>
`[exportFileName]`: se presente, oltre alla preview dell'export si ottiene il download dell'export in formato JSON, con nome del file che è il valore del parametro `[exportFileName]`.</br>

esempio per l'export (senza download, solo preview): `node monitor-wiki.js export Category:Emerging_technologies,Computer_science,Chemistry 20180101,20190101 200 300`
In questo modo si ottiene una preview di disallineamento delle pagine appartenenti alla categoria Emerging technologies e delle pagine Computer Science e Chemistry, riguardante il periodo tra il l'1 Gennaio 2018 e l'1 Gennaio 2019, con parametri di disallineamento n. Edit e frequenza di Edit rispettivamente di 200 e 300

esempio per l'export (con preview e download): `node monitor-wiki.js export Category:Emerging_technologies,Computer science 20180101,20190101 200 300 exportedFile`
In questo modo si ottiene il risultato dell'esempio precedente con download dell'export sotto il nome di exportedFile

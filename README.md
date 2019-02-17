# monitor-wiki

# Definizione dell'API:

## Preview
input: soglia di disallineamento (n. Edit oppure frequency Edit), timespan</br>
output: elenco pagine classificate

## List
Come Preview, ma con salvataggio file

## Info
input: output della modalità List (lista pagine classificate), timespan, preferenze indici</br>
output: oggetto con informazioni sugli indici di ogni pagina 


## Aggregate Info
input: output della modalità List (lista pagine classificate), timespan, preferenze indici</br>
output: oggetto con informazioni sugli indici di ogni pagina aggregati


# Uso dell'API:

## Requisiti:
<ul><li>Node.js v11.6.0</li></ul>

## Preview
flags: -m (modalità) , -h (host), -q (query), -l (livello profondità ricerca articoli in categorie), -t (timespan), -n (n. Edit), -f (frequency Edit), -c (n. commenti), -v (n. views),  -a (comprendere tutti gli articoli). 

E' possibile settare uno o più flag tra -n, -f, -c, -v. </br>
Il flag -l viene ignorato se non ci sono categorie in -q.</br>
Il flag -a se presente nelle lista delle pagine verranno comprese anche le pagine misaligned false. Se non è presente, si avrà la lista delle sole pagine misaligned true.
</br>

esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m preview -h en.wikipedia.org -q category:emerging technologies -l 1 -t 20180101,20180130 -f 40`</br>


## List
flags: -m (modalità) , -h (host), -q (query), -l (livello profondità ricerca articoli in categorie), -t (timespan), -n (n. Edit), -f (frequency Edit), -c (n. commenti), -v (n. views) -e (file di output) -a (comprendere tutti gli articoli). 

E' possibile settare uno o più flag tra -n, -f, -c, -v. </br>
Il flag -l viene ignorato se non ci sono categorie in -q.</br>
Il flag -a se presente nelle lista delle pagine verranno comprese anche le pagine misaligned false. Se non è presente, si avrà la lista delle sole pagine misaligned true.</br>
Il file verrà salvato nella cartella del progetto "results".
</br>

esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m preview -h en.wikipedia.org -q category:emerging technologies -l 1 -t 20180101,20180130 -f 40 -e file.json`</br>

## Info
flags: -m (modalità) , -f (file di input) , -t (timespan) , -d (file di download) , -i (indici delle pagine da comprendere nel downlaoad, i valori possibili sono: edit, views, comments, nlinks, listlinks, 'all' (per comprenderli tutti).</br>

Il file verrà salvato nella cartella del progetto "results".

esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m info -f file.json -t 20180101,20180130 -d infoFile.json -i edit,views,comments`

## Aggregate Info
flags: -m (modalità) , -f (file di input) , -t (timespan) , -d (file di download) , -i (indici delle pagine da comprendere nel downlaoad, i valori possibili sono: edit, views, comments, nlinks, listlinks, 'all' per comprenderli tutti).</br>

Il file verrà salvato nella cartella del progetto "results".


esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m info -f file.json -t 20180101,20180130 -d aggregateInfo.json -i edit,views,comments`

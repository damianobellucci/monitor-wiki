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

Esempio: `node --max-old-space-size=8192 monitor-wiki.js preview -h en.wikipedia.org -q category:computer science -l 1 -t 20180101,20180130 -n 10,* -c 1,10 -v 1000,* -e list.json`</br>

Esempio test: `node --max-old-space-size=8192 monitor-wiki.js preview preview.txt`

## List
flags: -m (modalità) , -h (host), -q (query), -l (livello profondità ricerca articoli in categorie), -t (timespan), -n (n. Edit), -f (frequency Edit), -c (n. commenti), -v (n. views) -e (file di output) -a (comprendere tutti gli articoli). 

E' possibile settare uno o più flag tra -n, -f, -c, -v. </br>
Il flag -l viene ignorato se non ci sono categorie in -q.</br>
Il flag -a se presente nelle lista delle pagine verranno comprese anche le pagine misaligned false. Se non è presente, si avrà la lista delle sole pagine misaligned true.</br>
Il file verrà salvato nella cartella del progetto "results".
</br>

Esempio: `node --max-old-space-size=8192 monitor-wiki.js list -h en.wikipedia.org -q category:emerging technologies -l 1 -t 20180101,20180130 -f 40 -e file.json`</br>

Esempio test: `node --max-old-space-size=8192 monitor-wiki.js list list.txt`

## Info
flags: -m (modalità) , -f (file di input) , -t (timespan) , -d (file di download) , -i (indici delle pagine da comprendere nel downlaoad, i valori possibili sono: edit, views, comments, nlinks, listlinks, 'all' (per comprenderli tutti).</br>

Il file verrà salvato nella cartella del progetto "results".

Esempio: `node --max-old-space-size=8192 monitor-wiki.js info -h en.wikipedia.org -q category:computer science -l 1 -t 20180101,20180130 -n 10,* -c 1,10 -v 1000,* -e list.json`</br>

Esempio test: `node --max-old-space-size=8192 monitor-wiki.js info info.txt`


## Aggregate Info
flags: -m (modalità) , -f (file di input) , -t (timespan) , -d (file di download) , -i (indici delle pagine da comprendere nel downlaoad, i valori possibili sono: edit, views, comments, nlinks, 'all' per comprenderli tutti).</br>

Il file verrà salvato nella cartella del progetto "results".


Esempio: `node --max-old-space-size=8192 monitor-wiki.js aggregateInfo -f list.json -t 20180120,20180128 -t 20180105,20180115 -d aggregateInfo.json -i edit,views,comments`</br>

Esempio test: `node --max-old-space-size=8192 monitor-wiki.js aggregateInfo aggregateInfo.txt`

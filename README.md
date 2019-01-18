# monitor-wiki

## Requisiti:
<ul><li>Node.js v11.6.0</li></ul>

## Lanciare lo script da terminale:

### Preview
flags: -m (modalità) , -h (host), -q (query), -t (timespan), -n (n. Edit), -f (frequency Edit). E' possibile settare un solo flag tra -n ed -f.</br>

esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m preview -h en.wikipedia.org -q category:emerging technologies  -t 20180101,20180130 -f 40`</br>


### List
flags: -m (modalità) , -h (host), -q (query), -t (timespan), -n (n. Edit), -f (frequency Edit), -e (file di output). E' possibile settare un solo flag tra -n ed -f.</br>

esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m list -h en.wikipedia.org -t 20180101,20180130 -q category:emerging technologies -f 40 -e file.json`</br>

### Info
flags: -m (modalità) , -f (file di input) , -t (timespan) , -d (file di download) , -i (indici delle pagine da comprendere nel downlaoad, i valori possibili sono: edit, views, comments, links, listlinks, 'all' (per comprenderli tutti).</br>

esempio: `node --max-old-space-size=8192 path/monitor-wiki.js -m info -f file.json -t 20180101,20180130 -d infoFile.json -i all`
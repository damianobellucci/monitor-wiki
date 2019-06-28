var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');
const chalk = require('chalk');
var functions = require('./functions.js');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;


function parseRequest() {
    let stringArguments = [];
    let requestObject = {};

    for (let el of arguments) {
        stringArguments += el + ' ';
    }
    arguments = stringArguments.split('-');

    for (let el in arguments) {
        arguments[el] = arguments[el].slice(0, arguments[el].length - 1);
    }


    for (let el in arguments) {
        if (arguments[el] === '');
        else if (arguments[el] === 'a') requestObject[arguments[el]] = '';
        else {
            if (arguments[el].slice(0, 1) === 't') {
                if (requestObject[arguments[el].slice(0, 1)] !== undefined) {
                    requestObject[arguments[el].slice(0, 1)][Object.keys(requestObject[arguments[el].slice(0, 1)]).length] =
                        arguments[el].slice(2).replace(' ', '');
                } else {
                    requestObject[arguments[el].slice(0, 1)] = {};
                    requestObject[arguments[el].slice(0, 1)][0] = arguments[el].slice(2).replace(' ', '');

                }
            }
            else requestObject[arguments[el].slice(0, 1)] = arguments[el].slice(2);
        }
    }
    //requestObject.t = requestObject.t.replace(' ', '');
    console.log('\n', requestObject);
    return requestObject;
}

async function searchPages(parsedRequest) {
    return new Promise(async (resolve, reject) => {

        console.log('\nInizio ricerca pagine\n');

        let queryArray = parsedRequest.q.split(",");
        let allPagesQuery = [];
        let inferencedQuery = [];

        for (el of queryArray) {

            let params = { string: encodeURI(el), host: parsedRequest.h };
            //console.log(result);
            inferencedQuery = inferencedQuery.concat(wrapper.wrapperNameInference(params));
        }

        inferencedQuery = await Promise.all(inferencedQuery);
        let suggestionQueue = [];

        for (let el of inferencedQuery) {
            //console.log(el);

            if (el.includes('suggestion:')) suggestionQueue.push(el.replace('suggestion:', ''));
        }

        inferencedQuery = inferencedQuery.filter((el) => {
            return !el.includes('suggestion:');
        });

        let secondInferencedQuery = [];

        for (el of suggestionQueue) {
            let params = { string: encodeURI(el), host: parsedRequest.h };

            let result = await wrapper.wrapperNameInference(params);
            //console.log(result);
            secondInferencedQuery = secondInferencedQuery.concat(result.replace('suggestion:', ''));
        }

        inferencedQuery = inferencedQuery.concat(secondInferencedQuery);
        queryArray = inferencedQuery;

        //divido le pagine e le categorie. per sapere se una pagina è una categoria devo vedere se chiedendo la lista delle pagine mi da error. In quel caso è una pagina

        allPagesQuery = [];

        let params = {
            "action": "query",
            "format": "json",
            "prop": "info",
            "titles": queryArray.join('|'),
            "formatversion": "2"
        };
        let pagesInfo = await wrapper.wrapperGetPagesInfo(params);

        //finché ci saranno pagine con ns 14:

        let deepLevel = 0;

        parsedRequest.hasOwnProperty('l') ? deepLevel = parsedRequest.l : null;

        pagesInfo = await CategorySearchPages(pagesInfo, deepLevel);

        //console.log(pagesInfo.map(el => el.title).join('|'));

        console.log('\n\nTot pagine prima della cernita (doppioni): ', pagesInfo.filter(el => { return el.ns !== 14 }).map(el => el.pageid).length);

        resolve(_.uniq(pagesInfo.filter(el => { return el.ns !== 14 }).map(el => el.pageid)));


    });
}

function thereAreCategories(pagesInfo) {
    for (index in pagesInfo) {
        if (pagesInfo[index].ns === 14) return true;
    }
    return false;
}

function CategorySearchPages(pagesInfo, deepLevel) {
    let level = 0; let conteggio = 0; let stack = [];
    return new Promise(async (resolve, reject) => {
        while (thereAreCategories(pagesInfo) && level <= deepLevel) {

            var chunkList = [];

            for (let index in pagesInfo) {
                if (pagesInfo[index] !== 'n/a' && pagesInfo[index].ns === 14) {

                    if (!stack.find(el => { return el === pagesInfo[index].pageid })) {
                        //console.log('pageid processata:', pagesInfo[index].title);

                        pagesInfo = pagesInfo.concat((await Promise.resolve(wrapper.wrapperGetInfoCategory(
                            {
                                "action": "query",
                                "format": "json",
                                "generator": "categorymembers",
                                "formatversion": "2",
                                "gcmpageid": pagesInfo[index].pageid,
                                "gcmtype": "page|subcat",
                                "gcmlimit": "max"
                            }
                        ))));
                        //pagesinfo = pagesInfo.splice(index, 1);
                        //console.log('level:', conteggio, 'total pages:', pagesInfo.length, 'parsed category:', pagesInfo[index].title);
                        process.stdout.write('Level: ' + conteggio + ', total pages: ' + pagesInfo.length + ', parsed: ' + pagesInfo[index].title + "                                  " + "\r");

                        stack.push(pagesInfo[index].pageid);
                        pagesInfo.splice(index, 1);

                    } else {
                        //console.log('DUPLICATO:' + pagesInfo[index].title);
                        pagesInfo.splice(index, 1);
                    }
                }
            }
            //pagesinfo = pagesInfo.splice(index, 1);
            conteggio += 1;
            //console.log('iterate:', conteggio, 'pageInfo:', pagesInfo.length);
            level += 1;
        }
        resolve(pagesInfo);
    });
}

async function searchFirstRevision(timespanArray, allPagesQuery) {
    return new Promise(async (resolve, reject) => {
        console.log('\nInizio ricerca data creazione\n');

        let queueFirstRevisions = [];
        let resultQueue = [];

        allPagesQuery = allPagesQuery.filter(el => { return el !== undefined });

        do {
            resultQueue = [];
            for (let el of allPagesQuery) {
                let params = {
                    "action": "query",
                    "format": "json",
                    "prop": "revisions",
                    "pageids": el,
                    "rvprop": "timestamp",
                    "rvlimit": "max",
                    "rvdir": "newer"
                }
                resultQueue.push(wrapper.wrapperFirstRevision(params));
            }
            queueFirstRevisions = queueFirstRevisions.concat(await Promise.all(resultQueue));

            allPagesQuery = _.uniq(queueFirstRevisions.filter((el) => { return el.hasOwnProperty('error'); }).map(el => el.pageid));
            queueFirstRevisions = queueFirstRevisions.filter(el => { return !el.hasOwnProperty('error'); });

        } while (allPagesQuery.length > 0)

        console.log('\n\nFine ricerca data creazione');

        //se la pagina è stata creata dopo del timespan end della pagina, allora non la metto tra le pagine da processare   
        pagesCreatedInTimespan = queueFirstRevisions.filter((el) => {
            return new Date(el.firstRevision).getTime() <= new Date(timespanArray[1]).getTime();
        });

        pagesNotCreatedInTimespan = queueFirstRevisions.filter((el) => {
            return new Date(el.firstRevision).getTime() > new Date(timespanArray[1]).getTime();
        });

        objectFirstRevision = { pagesCreatedInTimespan: pagesCreatedInTimespan, pagesNotCreatedInTimespan: pagesNotCreatedInTimespan };

        resolve(objectFirstRevision);
    });
}

async function searchRevisions(timespanArray, allPagesQuery) {
    return new Promise(async (resolve, reject) => {
        let queue = [];

        console.log('\nInizio ricerca revisioni\n');

        let resultOfQuery = [];
        do {
            //console.log(allPagesQuery);
            for (el of allPagesQuery) {
                let params = {
                    action: 'query',
                    prop: 'revisions',
                    rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                    rvdir: 'newer', // order by timestamp asc
                    rvlimit: 'max',
                    titles: el,
                    rvstart: timespanArray[0],
                    rvend: timespanArray[1]
                }
                queue.push(wrapper.wrapperGetParametricRevisions(params));
            }

            resultOfQuery = resultOfQuery.concat(await Promise.all(queue));
            queue = [];
            //console.log(result);return;
            allPagesQuery = resultOfQuery.filter(el => { return el.hasOwnProperty('error') }).map(el => el.page);
            resultOfQuery = resultOfQuery.filter(el => { return !el.hasOwnProperty('error') });

        } while (allPagesQuery.length > 0)

        //
        //console.log(resultOfQuery)
        console.log('\n\nFine ricerca revisioni');
        resolve(resultOfQuery);
    });
}

async function getPageExport(result, indexPreferences, counterRevisions) {
    return new Promise(async (resolve, reject) => {
        let exportQueue = [];
        let resultExport = [];
        //input:result
        //do {
        //console.log(result);

        let stackRevisions = [];
        for (let page of result) {
            for (let rev of page.revisions.history) {
                stackRevisions.push(rev);
            }
        }

        do {
            for (rev of stackRevisions) {
                let params = {
                    query: {
                        action: "parse",
                        format: "json",
                        oldid: rev.revid,
                        prop: ((indexPreferences.nlinks || indexPreferences.listlinks) ? "links|externallinks" : "") + "|sections|revid|displaytitle"
                    },
                    indexPreferences: indexPreferences,
                    counterRevisions: counterRevisions,
                    revision: rev
                }
                exportQueue.push(wrapper.wrapperExport(params));
            }
            resultExport = resultExport.concat(await Promise.all(exportQueue));

            exportQueue = [];
            stackRevisions = [];
            stackRevisions = resultExport.filter(el => { return el.hasOwnProperty('error') });
            resultExport = resultExport.filter(el => { return !el.hasOwnProperty('error') });
            //console.log(stackRevisions.length);


        } while (stackRevisions.length > 0)

        console.log('\n\nFine ricerca informazioni revisioni');

        let newResultExport = [];
        //console.log(resultExport);

        for (el of resultExport) {
            try {
                newResultExport.push(el[0]);
            } catch (e) {
                //console.log(e, el);
            }
        }
        //console.log(newResultExport);
        var grouped = _.groupBy(newResultExport, function (revision) {
            return revision.pageid;
        });

        delete grouped.error;
        //console.log(grouped);

        for (el in grouped) {
            for (page in result) {
                if (el == result[page].pageid) {
                    for (elemento in result[page].revisions.history) {
                        //console.log(grouped[el].revid, result[page].revisions.history[elemento].revid);
                        for (revisione in grouped[el])
                            if (grouped[el][revisione].revid == result[page].revisions.history[elemento].revid) {
                                //console.log(grouped[el][revisione].revid, result[page].revisions.history[elemento].revid);
                                result[page].revisions.history[elemento].export = grouped[el][revisione];
                            }
                    }
                    //result[page].export = grouped[el];
                }

            }
        }
        resolve(result);
    });

}

function getIndexFlagPreferences(parsedRequest) {
    let indexPreferences = {};

    if (parsedRequest.hasOwnProperty('i')) {
        if (parsedRequest.i.includes('all')) {
            indexPreferences = { edit: true, views: true, talks: true, nlinks: true, listlinks: true };
        }
        else {
            if (parsedRequest.i.includes('edit')) indexPreferences.edit = true;
            if (parsedRequest.i.includes('views')) indexPreferences.views = true;
            if (parsedRequest.i.includes('comments')) indexPreferences.talks = true;
            if (parsedRequest.i.includes('nlinks')) indexPreferences.nlinks = true;
            if (parsedRequest.i.includes('listlinks')) indexPreferences.listlinks = true;

        }
    }
    return indexPreferences;
}

async function getPageViews(pagesInfo, timespanArray, parsedRequest) {
    return new Promise(async (resolve, reject) => {
        let queueViews = [];
        let resultViews = [];

        console.log('\nInizio ricerca views\n');

        do {
            if (pagesInfo.length > 500) {
                while (pagesInfo.length > 0) {
                    queueViews = [];
                    chunkedArrayOfPages = pagesInfo.slice(0, 25);
                    for (let page of chunkedArrayOfPages) {
                        let params = {
                            pageTitle: page.title,
                            pageid: page.pageid,
                            start: timespanArray[0],
                            end: timespanArray[1],
                            server: parsedRequest.h
                        };
                        queueViews.push(wrapper.wrapperViews(params));
                    }
                    pagesInfo = pagesInfo.slice(25, pagesInfo.length);
                    resultViews = resultViews.concat(await Promise.all(queueViews));
                }

            } else {

                for (let page of pagesInfo) {
                    queueViews.push(wrapper.wrapperViews({
                        pageTitle: page.title,
                        pageid: page.pageid,
                        start: timespanArray[0],
                        end: timespanArray[1],
                        server: parsedRequest.h
                    }));
                }
                resultViews = resultViews.concat(await Promise.all(queueViews));

            }
            queueViews = []
            pagesInfo = resultViews.filter(el => { return el.hasOwnProperty('error') });
            resultViews = resultViews.filter(el => { return !el.hasOwnProperty('error') });
            //console.log(pagesInfo);
        }
        while (pagesInfo.length > 0)

        console.log('\n\nFine ricerca views\n');

        resolve(resultViews);
    });
}

async function getPageTalks(pages, timespanArray) {
    return new Promise(async (resolve, reject) => {
        let queueTalks = [];
        let resultTalks = [];
        console.log('\nInizio ricerca talks\n');
        do {
            for (let page of pages) {

                queueTalks.push(wrapper.wrapperTalks(
                    {
                        action: 'query',
                        prop: 'revisions',
                        rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                        rvdir: 'newer', // order by timestamp ascz
                        rvlimit: 'max',
                        titles: 'Talk:' + page.title,
                        rvstart: timespanArray[0],
                        rvend: timespanArray[1]
                    }
                    ,
                    page
                ));
            }

            resultTalks = resultTalks.concat(await Promise.all(queueTalks));

            queueTalks = [];

            pages = resultTalks.filter(el => { return el.hasOwnProperty('error') });

            resultTalks = resultTalks.filter(el => { return !el.hasOwnProperty('error') });
            //console.log(pages.length);

        } while (pages.length > 0)

        console.log('\n\nFine ricerca talks');

        resolve(resultTalks);
    });
}

function sanityCheckPreview(parsedRequest) {
    return new Promise((resolve, reject) => {

        //gestione parametri invalidi
        for (key of Object.keys(parsedRequest)) {
            if (key !== 'l' && key !== 'a' && key !== 'h' && key !== 'q' && key !== 't' && key !== 'f' && key !== 'n' && key !== 'v' && key !== 'c') {
                console.log('\nError:', '-' + key, 'is not a valid parameter.');
                return;
            }
        }

        //controllo che si siano i parametri minimi per inoltrare la richiesta
        if (!parsedRequest.hasOwnProperty('h')) { console.log('\nError: ', 'missing -h parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('q')) { console.log('\nError: ', 'missing -q parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('t')) { console.log('\nError: ', 'missing -t parameter.'); return; };

        //controllo la validità dei valori parametri
        for (i in parsedRequest.t) {
            let timespanControl = parsedRequest.t[i].replace(' ', '').split(',');
            if (
                isNaN(timespanControl[0]) ||
                isNaN(timespanControl[1]) ||
                timespanControl[0].length != 8 ||
                timespanControl[1].length != 8
            ) {
                console.log('\nError: ', parsedRequest.t[i].replace(' ', ''), 'is an invalid parameter for -t');
            }
        }

        for (let key of Object.keys(parsedRequest)) {
            if (key !== 'l' && key !== 'h' && key !== 'q' && key !== 't') {
                if (parsedRequest.hasOwnProperty(key)) {
                    parsedRequest[key] = parsedRequest[key].replace(' ', '');
                    let control = parsedRequest[key].split(',');


                    if (control.length < 2 ||
                        isNaN(control[0]) ||
                        (isNaN(control[1]) && (control[1]) !== '*')
                    ) {
                        console.log('\nError: ', parsedRequest[key], 'is an invalid parameter for', key);
                        return;
                    }
                }
            }
        }
        if (parsedRequest.hasOwnProperty('l') && isNaN(parsedRequest.l)) {
            console.log('\nError: ', parsedRequest[key], 'is an invalid parameter for', key);
            return;
        }

        //qui controllo su livello
        resolve();
    });
}

function sanityCheckList(parsedRequest) {

    return new Promise((resolve, reject) => {

        //gestione parametri invalidi
        for (key of Object.keys(parsedRequest)) {
            if (key !== 'l' && key !== 'a' && key !== 'h' && key !== 'q' && key !== 't' && key !== 'f' && key !== 'n' && key !== 'v' && key !== 'c' && key !== 'e') {
                console.log('\nError:', '-' + key, 'is not a valid parameter.');
                return;
            }
        }

        //controllo che si siano i parametri minimi per inoltrare la richiesta
        if (!parsedRequest.hasOwnProperty('h')) { console.log('\nError: ', 'missing -h parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('q')) { console.log('\nError: ', 'missing -q parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('t')) { console.log('\nError: ', 'missing -t parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('e')) { console.log('\nError: ', 'missing -e parameter.'); return; };

        //if (!parsedRequest.hasOwnProperty('e')) { console.log('Error: ', 'missing -e parameter.'); return; };


        //controllo la validità dei valori parametri
        for (i in parsedRequest.t) {
            let timespanControl = parsedRequest.t[i].replace(' ', '').split(',');
            if (
                isNaN(timespanControl[0]) ||
                isNaN(timespanControl[1]) ||
                timespanControl[0].length != 8 ||
                timespanControl[1].length != 8
            ) {
                console.log('\nError: ', parsedRequest.t[i].replace(' ', ''), 'is an invalid parameter for -t');
                return;
            }
        }

        for (let key of Object.keys(parsedRequest)) {
            if (key !== 'l' && key !== 'a' && key !== 'h' && key !== 'q' && key !== 't' && key !== 'e') {
                if (parsedRequest.hasOwnProperty(key)) {
                    parsedRequest[key] = parsedRequest[key].replace(' ', '');
                    let control = parsedRequest[key].split(',');
                    if (
                        control.length < 2 ||
                        isNaN(control[0]) ||
                        (isNaN(control[1]) && (control[1]) !== '*')
                    ) {
                        console.log('\nError: ', parsedRequest[key], 'is an invalid parameter for -' + key);
                        return;
                    }
                }
            }
        }
        if (parsedRequest.hasOwnProperty('l') && isNaN(parsedRequest.l)) {
            console.log('\nError: ', parsedRequest[key], 'is an invalid parameter for', key);
            return;
        }

        resolve();
    });
}

function sanityCheckInfo(parsedRequest) {
    return new Promise((resolve, reject) => {

        //gestione parametri invalidi
        for (key of Object.keys(parsedRequest)) {
            if (key !== 'q' && key !== 't' && key !== 'f' && key !== 'n' && key !== 'v' && key !== 'c' && key !== 'i' && key !== 'd') {
                console.log('\nError:', '-' + key, 'is not a valid parameter.');
                return;
            }
        }

        //controllo che si siano i parametri minimi per inoltrare la richiesta
        if (!parsedRequest.hasOwnProperty('f')) { throw ('Error: ', 'missing -f parameter.'); };
        if (!parsedRequest.hasOwnProperty('t')) { throw ('Error: ', 'missing -t parameter.'); };
        if (!parsedRequest.hasOwnProperty('d')) { throw ('Error: ', 'missing -d parameter.'); };


        //controllo la validità dei valori parametri
        for (i in parsedRequest.t) {
            let timespanControl = parsedRequest.t[i].replace(' ', '').split(',');
            if (
                isNaN(timespanControl[0]) ||
                isNaN(timespanControl[1]) ||
                timespanControl[0].length != 8 ||
                timespanControl[1].length != 8
            ) {
                throw ('Error: ', parsedRequest.t[i].replace(' ', ''), 'is an invalid parameter for -t');
            }
        }

        for (el of parsedRequest.i.replace(' ', '').replace('\n', '').split(',')) {
            if (el !== 'edit' && el !== 'views' && el !== 'comments' && el !== 'nlinks' && el !== 'listlinks') {
                console.log('\nError: ', el, 'is an invalid value for -i');
                return;
            }
        }
        resolve();
    });
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, function read(err, data) {
            if (err) {
                throw err;
            }
            resolve(data);
        });
    });
}

function isMisaligned(page, parsedRequest) {
    //se il numero tag di disallineamento ===true sono uguali al numero di tag immessi, la pagina è disallineata

    if (
        (
            (
                parsedRequest.hasOwnProperty('n') ? 1 : 0
            )
            +
            (
                parsedRequest.hasOwnProperty('f') ? 1 : 0
            )
            +
            (
                parsedRequest.hasOwnProperty('v') ? 1 : 0
            )
            +
            (
                parsedRequest.hasOwnProperty('c') ? 1 : 0
            )
        )
        ==
        (
            (
                page.misalignment.hasOwnProperty('edits') && page.misalignment.edits ? 1 : 0
            )
            +
            (
                page.misalignment.hasOwnProperty('frequency') && page.misalignment.frequency ? 1 : 0
            )
            +
            (
                page.misalignment.hasOwnProperty('views') && page.misalignment.views ? 1 : 0
            )
            +
            (
                page.misalignment.hasOwnProperty('comments') && page.misalignment.comments ? 1 : 0
            )
        )
    ) return true;
    return false;
}

function RecombineResultPreview(infoPagesCreatedInTimespan, revisions, talksPagesInfo, viewsPagesInfo, parsedRequest) {
    let recombinedObject = {};
    for (let page of infoPagesCreatedInTimespan) {
        let object = { title: page.title, pageid: page.pageid };

        if (parsedRequest.hasOwnProperty('n') || parsedRequest.hasOwnProperty('f')) {
            object.edits = revisions.find((el) => { return el.pageid === page.pageid });
        }

        if (parsedRequest.hasOwnProperty('c')) {
            object.comments = talksPagesInfo.find((el) => { return el.pageid === page.pageid });
        }

        if (parsedRequest.hasOwnProperty('v')) {
            object.views = viewsPagesInfo.find((el) => { return el.pageid === page.pageid });
        }

        recombinedObject[page.pageid] = object;
    }
    return recombinedObject;
}

function AggregateResultPreview(recombinedObject, parsedRequest) {
    let aggregatedObject = {};
    for (let page in recombinedObject) {
        let object = { title: recombinedObject[page].title, pageid: page };

        if (parsedRequest.hasOwnProperty('n')) {
            object.edits = recombinedObject[page].edits.revisions.history.length;
        }

        timespanArray = functions.ConvertYYYYMMDDtoISO(parsedRequest.t);

        if (parsedRequest.hasOwnProperty('f')) {
            object.frequency = Math.round(recombinedObject[page].edits.revisions.history.length * 1000 * 60 * 60 * 24 * 365 / (new Date(timespanArray[1]).getTime() - new Date(timespanArray[0]).getTime()), 2);
        }

        if (parsedRequest.hasOwnProperty('c')) {

            if (recombinedObject[page].comments.history === 'n/a') {
                //console.log(recombinedObject[page]);
                object.comments = 'n/a';
            }
            else object.comments = recombinedObject[page].comments.history.length;
        }

        if (parsedRequest.hasOwnProperty('v')) {
            recombinedObject[page].views.dailyViews === 'Not Available' ?
                object.views = 'n/a' : object.views = recombinedObject[page].views.dailyViews.map(el => el.views).reduce((a, b) => a + b, 0);
        }
        aggregatedObject[page] = object;
    }
    return aggregatedObject;
}

function TagArticlesPreview(aggregatedObject, parsedRequest) {
    for (let page in aggregatedObject) {
        aggregatedObject[page].misalignment = {};

        if (parsedRequest.hasOwnProperty('n')) {

            if (parsedRequest.n.split(',')[1] === '*')
                (aggregatedObject[page].edits >= parsedRequest.n.split(',')[0]) ?
                    aggregatedObject[page].misalignment.edits = true : aggregatedObject[page].misalignment.edits = false
            else
                (aggregatedObject[page].edits >= parsedRequest.n.split(',')[0] && aggregatedObject[page].edits <= parsedRequest.n.split(',')[1]) ?
                    aggregatedObject[page].misalignment.edits = true : aggregatedObject[page].misalignment.edits = false;

        }

        if (parsedRequest.hasOwnProperty('f')) {

            if (parsedRequest.f.split(',')[1] === '*')
                (aggregatedObject[page].frequency >= parsedRequest.f.split(',')[0]) ?
                    aggregatedObject[page].misalignment.frequency = true : aggregatedObject[page].misalignment.frequency = false
            else
                (aggregatedObject[page].frequency >= parsedRequest.f.split(',')[0] && aggregatedObject[page].frequency <= parsedRequest.f.split(',')[1]) ?
                    aggregatedObject[page].misalignment.frequency = true : aggregatedObject[page].misalignment.frequency = false;

        }

        if (parsedRequest.hasOwnProperty('c')) {

            if (parsedRequest.c.split(',')[1] === '*')
                (aggregatedObject[page].comments >= parsedRequest.c.split(',')[0]) ?
                    aggregatedObject[page].misalignment.comments = true : aggregatedObject[page].misalignment.comments = false
            else
                (aggregatedObject[page].comments >= parsedRequest.c.split(',')[0] && aggregatedObject[page].comments <= parsedRequest.c.split(',')[1]) ?
                    aggregatedObject[page].misalignment.comments = true : aggregatedObject[page].misalignment.comments = false;

        }

        if (parsedRequest.hasOwnProperty('v')) {

            if (aggregatedObject[page].views === 'n/a') aggregatedObject[page].misalignment.views = 'n/a'; //mettendo come valore di misalignment.views n/a, in isMisaligned la pagina risulterà disallineata
            else {
                if (parsedRequest.v.split(',')[1] === '*')
                    (aggregatedObject[page].views >= parsedRequest.v.split(',')[0]) ?
                        aggregatedObject[page].misalignment.views = true : aggregatedObject[page].misalignment.views = false
                else
                    (aggregatedObject[page].views >= parsedRequest.v.split(',')[0] && aggregatedObject[page].views <= parsedRequest.v.split(',')[1]) ?
                        aggregatedObject[page].misalignment.views = true : aggregatedObject[page].misalignment.views = false;
            }

        }
    }

    ///
    for (let page in aggregatedObject) {
        aggregatedObject[page].misalignment = { isMisaligned: isMisaligned(aggregatedObject[page], parsedRequest), misalignmentForFilter: aggregatedObject[page].misalignment };
    }
    return aggregatedObject;
}

function PrintResultPreview(aggregatedObject, start, nPagesCreatedInTimespan) {
    for (let page in aggregatedObject) {
        !aggregatedObject[page].misalignment.isMisaligned ?
            (
                console.log(
                    'Title: ' + chalk.green(aggregatedObject[page].title), '|',
                    'misalignment:', 'false', '|',
                    aggregatedObject[page].hasOwnProperty('edits') ? 'edits: ' + aggregatedObject[page].edits : '',
                    aggregatedObject[page].hasOwnProperty('frequency') ? 'frequency: ~ ' + aggregatedObject[page].frequency : '',
                    aggregatedObject[page].hasOwnProperty('comments') ? 'comments: ' + aggregatedObject[page].comments : '',
                    aggregatedObject[page].hasOwnProperty('views') ? 'views: ' + aggregatedObject[page].views : ''
                )
            ) : (
                console.log(
                    'Title: ' + chalk.green(aggregatedObject[page].title) + ' |',
                    'misalignment:', chalk.red('true'), '|',
                    aggregatedObject[page].hasOwnProperty('edits') ? 'edits: ' + aggregatedObject[page].edits : '',
                    aggregatedObject[page].hasOwnProperty('frequency') ? 'frequency: ~ ' + aggregatedObject[page].frequency : '',
                    aggregatedObject[page].hasOwnProperty('comments') ? 'comments: ' + aggregatedObject[page].comments : '',
                    aggregatedObject[page].hasOwnProperty('views') ? 'views: ' + aggregatedObject[page].views : ''

                )
            );
    }

    let counterMisalignedPages = 0;
    for (el in aggregatedObject) {
        //if(aggregatedObject[el].misalignment.isMisaligned)console.log(aggregatedObject[el]);
        counterMisalignedPages += aggregatedObject[el].misalignment.isMisaligned;
    }

    console.log(
        '\nTime elapsed:', Math.round((new Date().getTime() - start) / 1000) + 's', ',',
        counterMisalignedPages, 'misaligned pages', '/', nPagesCreatedInTimespan, 'total pages', '\n'
    );
}

function ConvertYYYYMMDDtoISO(timespanYYYYMMMDD) {
    timespanYYYYMMMDD = timespanYYYYMMMDD.split(',');
    timespanYYYYMMMDD[0] = timespanYYYYMMMDD[0].substr(0, 4) + '-' + timespanYYYYMMMDD[0].substr(4, 2) + '-' + timespanYYYYMMMDD[0].substr(6, 2) + 'T00:00:00.000Z';
    timespanYYYYMMMDD[1] = timespanYYYYMMMDD[1].substr(0, 4) + '-' + timespanYYYYMMMDD[1].substr(4, 2) + '-' + timespanYYYYMMMDD[1].substr(6, 2) + 'T23:59:59.999Z';
    return timespanYYYYMMMDD;
}

function CalculateDaysOfAgeInfo(queueFirstRevisions, finalExport, timespanArray) {
    for (el of queueFirstRevisions) {
        //if (finalExport.pages[el.pageid] !== undefined) finalExport.pages[el.pageid].creationTimestamp = el;
        pageDaysOfAge = Math.round((new Date(timespanArray[1]).getTime() - new Date(el.firstRevision).getTime()) / 1000 / 60 / 60 / 24);
        if (finalExport.pages[el.pageid] !== undefined) {
            finalExport.pages[el.pageid].daysOfAge = pageDaysOfAge;
            //console.log(finalExport.pages[el.pageid].daysOfAge);
            finalExport.pages[el.pageid].firstRevision = el.firstRevision;
            //console.log(finalExport.pages[el.pageid]);
        }
    }
    return finalExport;
}

function InsertNotYetCreatedPagesInfo(objectFirstRevision, finalExport) {
    for (let el of objectFirstRevision.pagesNotCreatedInTimespan) {
        el.notYetCreated = '';
        finalExport.pages[el.pageid] = el;
    }
    return finalExport;
}

function ManageAggregateInfo(parsedRequest, finalExport) {
    let aggregatedExport = { query: parsedRequest, result: {} };

    Object.keys(finalExport.result).forEach((resultPage) => {
        aggregatedResultPage = { timespan: parsedRequest.t[resultPage], pages: {} };
        Object.keys(finalExport.result[resultPage].pages).forEach((page) => { //qui aggrego
            let aggregatedPage = {
                pageid: finalExport.result[resultPage].pages[page].pageid,
                title: finalExport.result[resultPage].pages[page].title,
                daysOfAge: finalExport.result[resultPage].pages[page].daysOfAge,
                firstRevision: finalExport.result[resultPage].pages[page].firstRevision,
                annotatedHistory: finalExport.result[resultPage].pages[page].annotatedHistory
            };

            if (finalExport.result[resultPage].pages[page].hasOwnProperty('notYetCreated')) {
                aggregatedPage.notYetCreated = '';
                delete (aggregatedPage.daysOfAge);
                //console.log(aggregatedPage);
            }

            //aggrego il numero di revisioni (utenti,minor edits)


            if (finalExport.result[resultPage].pages[page].hasOwnProperty('revisions')) {

                if (parsedRequest.i.includes('edit')) {
                    aggregatedPage.edits = finalExport.result[resultPage].pages[page].revisions.history.length;
                    aggregatedPage.minorEdits = finalExport.result[resultPage].pages[page].revisions.history.filter(el => { return el.hasOwnProperty('minor') }).length;
                    aggregatedPage.authors = Array.from(new Set(finalExport.result[resultPage].pages[page].revisions.history.map(el => el.user))).length;
                
                }

                Object.keys(finalExport.result[resultPage].pages[page].revisions.history).forEach((revisionId) => {
                    try {
                        if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('links')) {
                            if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links === 'deleted revision')
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links = 'n/a'
                            /*else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links =
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links.list.length;*/
                            else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links =
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.links.count;

                        }
                        if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('externallinks')) {
                            if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks === 'deleted revision')
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks = 'n/a'
                            /*else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks =
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks.list.length;*/
                            else finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks =
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.externallinks.count;
                        }
                        if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.hasOwnProperty('sections')) {
                            if (finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.sections === 'deleted revision')
                                finalExport.result[resultPage].pages[page].revisions.history[revisionId].export.sections = 'n/a'
                        }

                    } catch (e) { /*console.log(finalExport.result[resultPage].pages[page].revisions.history[revisionId].export) */ }
                });

                if (parsedRequest.i.includes('nlinks') || parsedRequest.i.includes('listlinks')) {
                    aggregatedPage.revisions = {};
                    aggregatedPage.revisions.history = finalExport.result[resultPage].pages[page].revisions.history;
                }
                //aggrego risultati di export
            }
            //aggrego numero di commenti
            finalExport.result[resultPage].pages[page].hasOwnProperty('talks') ?
                aggregatedPage.comments = finalExport.result[resultPage].pages[page].talks.history.length : null;

            //aggrego views

            if (finalExport.result[resultPage].pages[page].hasOwnProperty('views')) {
                finalExport.result[resultPage].pages[page].views === 'Not Available' ?
                    aggregatedPage.views = 'n/a' : aggregatedPage.views = finalExport.result[resultPage].pages[page].views.map(el => el.views).reduce((a, b) => a + b, 0);
            }

            aggregatedResultPage.pages[aggregatedPage.pageid] = aggregatedPage;

        });
        aggregatedExport.result[resultPage] = aggregatedResultPage;
    });
    return aggregatedExport;
}

function RescaleTimespanForViews(date, shift) {
    date = date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2) + 'T00:00:00.000Z';
    shift == 'right' ? date = new Date(date).getTime() + 1000 * 60 * 60 * 24 : date = new Date(date).getTime() - 1000 * 60 * 60 * 24;
    date = new Date(date);
    date = date.toISOString().substring(0, 10);
    date = date.substr(0, 4) + date.substr(5, 2) + date.substr(8, 2);
    return date;
}


async function getAnnotatedHistories(pagesInfo, parsedRequest) {
    return new Promise(async (resolve, reject) => {
    		console.log("Inizio Annotated Histories");
    		
    		let queueDiffs = [];
        let resultDiffs = [];

        for (let page of pagesInfo) {
        	
        			//console.log(page);
        					
        			var frev = page.revisions.history[0].revid;
                var trev = page.revisions.history[page.revisions.count - 1].revid;
                    		
                //console.log(frev, trev);
                    		
        			queueDiffs.push(wrapper.wrapperDiffs({
        				  pageid: page.pageid,
                      fromrev: page.revisions.history[0].revid,
                      torev: page.revisions.history[page.revisions.count - 1].revid,
                      server: parsedRequest.h
                }));
               
        }
        
        
        resultDiffs = resultDiffs.concat(await Promise.all(queueDiffs));

        queueDiffs = []
        resultDiffs = resultDiffs.filter(el => { return !el.hasOwnProperty('error') });
        
		console.log("Fine Annotated Histories");
		
        resolve(resultDiffs);
        
    });
}


function buildAnnotatedHistoryFromDiffTableToJSON(diffTable){
	
	console.log(diffTable);
	
	const frag = JSDOM.fragment(diffTable);
	 
	var tds = frag.querySelectorAll("td.diff-addedline");
	
	var addedText = "";
	for (var i = 0, len = tds.length; i < len; i++)
		addedText += tds[i].textContent;
	
	tds = frag.querySelectorAll("td.diff-deletedline");
	var deletedText = "";
	for (var i = 0, len = tds.length; i < len; i++)
		deletedText += tds[i].textContent;
	
    return {
			addedchars: addedText.length, 
			deletedchars: deletedText.length
		}
    
}



module.exports.getAnnotatedHistories = getAnnotatedHistories;
module.exports.buildAnnotatedHistoryFromDiffTableToJSON = buildAnnotatedHistoryFromDiffTableToJSON;


module.exports.parseRequest = parseRequest;
module.exports.searchPages = searchPages;
module.exports.searchFirstRevision = searchFirstRevision;
module.exports.searchRevisions = searchRevisions;
module.exports.getIndexFlagPreferences = getIndexFlagPreferences;
module.exports.getPageExport = getPageExport;
module.exports.getPageViews = getPageViews;
module.exports.getPageTalks = getPageTalks;
module.exports.sanityCheckPreview = sanityCheckPreview;
module.exports.sanityCheckList = sanityCheckList;
module.exports.sanityCheckInfo = sanityCheckInfo;
module.exports.readFile = readFile;
module.exports.isMisaligned = isMisaligned;
module.exports.RecombineResultPreview = RecombineResultPreview;
module.exports.AggregateResultPreview = AggregateResultPreview;
module.exports.TagArticlesPreview = TagArticlesPreview;
module.exports.PrintResultPreview = PrintResultPreview;
module.exports.ConvertYYYYMMDDtoISO = ConvertYYYYMMDDtoISO;
module.exports.CalculateDaysOfAgeInfo = CalculateDaysOfAgeInfo;
module.exports.InsertNotYetCreatedPagesInfo = InsertNotYetCreatedPagesInfo;
module.exports.ManageAggregateInfo = ManageAggregateInfo;
module.exports.RescaleTimespanForViews = RescaleTimespanForViews;


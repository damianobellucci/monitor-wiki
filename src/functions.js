var wrapper = require('./wrappers.js');
var _ = require('underscore');
var fs = require('fs');

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
    console.log(requestObject);
    return requestObject;
}

async function searchPages(parsedRequest) {
    return new Promise(async (resolve, reject) => {

        console.log('\nInizio ricerca pagine');

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
            console.log(el);

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

        let stackParsedCategories = [];
        var conteggio = 0;

        function thereAreCategories(pagesInfo) {
            for (index in pagesInfo) {
                if (pagesInfo[index].ns === 14) return true;
            }
            return false;
        }

        let stack = [];
        let level = 0;

        while (thereAreCategories(pagesInfo) && level < 3) {

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
                        process.stdout.write('level: ' + conteggio + ', total pages: ' + pagesInfo.length + ', parsed: ' + pagesInfo[index].title + "                                  " + "\r");

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
        //console.log(pagesInfo.map(el => el.title).join('|'));

        console.log('\nTot pagine prima della cernita (doppioni): ', pagesInfo.filter(el => { return el.ns !== 14 }).map(el => el.pageid).length);

        resolve(_.uniq(pagesInfo.filter(el => { return el.ns !== 14 }).map(el => el.pageid)));


    });
}

async function searchFirstRevision(parsedRequest, timespanArray, allPagesQuery) {
    return new Promise(async (resolve, reject) => {
        console.log('\nInizio ricerca data creazione');

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

        console.log('\nFine ricerca data creazione');

        //se la pagina è stata creata dopo del timespan end della pagina, allora non la metto tra le pagine da processare   
        queueFirstRevisions = queueFirstRevisions.filter((el) => {
            return new Date(el.firstRevision).getTime() <= new Date(timespanArray[1]).getTime();
        });

        resolve(queueFirstRevisions);
    });
}

async function searchRevisions(parsedRequest, timespanArray, allPagesQuery) {
    return new Promise(async (resolve, reject) => {
        let queue = [];

        console.log('\nInizio ricerca revisioni');

        let resultOfQuery = [];
        do {
            //console.log(allPagesQuery);
            for (el of allPagesQuery) {
                let params = {
                    query: {
                        action: 'query',
                        prop: 'revisions',
                        rvprop: ['ids', 'timestamp', 'size', 'flags', 'comment', 'user'].join('|'),
                        rvdir: 'newer', // order by timestamp asc
                        rvlimit: 'max',
                        titles: el,
                        rvstart: timespanArray[0],
                        rvend: timespanArray[1]
                    },
                    parsedRequest: parsedRequest
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
        console.log('\nFine ricerca revisioni');
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

        console.log('\nFine download informazioni revisioni');

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

        console.log('\nInizio ricerca views');

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

        console.log('\nFine ricerca views');

        resolve(resultViews);
    });
}

async function getPageTalks(pages, timespanArray) {
    return new Promise(async (resolve, reject) => {
        let queueTalks = [];
        let resultTalks = [];
        console.log('\nInizio ricerca talks delle pagine');
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

        console.log('\nFine ricerca talks');

        resolve(resultTalks);
    });
}

function sanityCheckPreview(parsedRequest) {
    return new Promise((resolve, reject) => {

        //gestione parametri invalidi
        for (key of Object.keys(parsedRequest)) {
            if (key !== 'a' && key !== 'h' && key !== 'q' && key !== 't' && key !== 'f' && key !== 'n' && key !== 'v' && key !== 'c') {
                console.log('Error:', '-' + key, 'is not a valid parameter.');
                return;
            }
        }

        //controllo che si siano i parametri minimi per inoltrare la richiesta
        if (!parsedRequest.hasOwnProperty('h')) { console.log('Error: ', 'missing -h parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('q')) { console.log('Error: ', 'missing -q parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('t')) { console.log('Error: ', 'missing -t parameter.'); return; };

        //controllo la validità dei valori parametri
        for (i in parsedRequest.t) {
            let timespanControl = parsedRequest.t[i].replace(' ', '').split(',');
            if (
                isNaN(timespanControl[0]) ||
                isNaN(timespanControl[1]) ||
                timespanControl[0].length != 8 ||
                timespanControl[1].length != 8
            ) {
                console.log('Error: ', parsedRequest.t[i].replace(' ', ''), 'is an invalid parameter for -t');
            }
        }

        for (let key of Object.keys(parsedRequest)) {
            if (key !== 'h' && key !== 'q' && key !== 't') {
                if (parsedRequest.hasOwnProperty(key)) {
                    parsedRequest[key] = parsedRequest[key].replace(' ', '');
                    let control = parsedRequest[key].split(',');


                    if (control.length < 2 ||
                        isNaN(control[0]) ||
                        (isNaN(control[1]) && (control[1]) !== '*')
                    ) {
                        console.log('Error: ', parsedRequest[key], 'is an invalid parameter for', key);
                        return;
                    }
                }
            }
        }
        resolve();
    });
}

function sanityCheckList(parsedRequest) {

    return new Promise((resolve, reject) => {

        //gestione parametri invalidi
        for (key of Object.keys(parsedRequest)) {
            if (key !== 'a' && key !== 'h' && key !== 'q' && key !== 't' && key !== 'f' && key !== 'n' && key !== 'v' && key !== 'c' && key !== 'e') {
                console.log('Error:', '-' + key, 'is not a valid parameter.');
                return;
            }
        }

        //controllo che si siano i parametri minimi per inoltrare la richiesta
        if (!parsedRequest.hasOwnProperty('h')) { console.log('Error: ', 'missing -h parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('q')) { console.log('Error: ', 'missing -q parameter.'); return; };
        if (!parsedRequest.hasOwnProperty('t')) { console.log('Error: ', 'missing -t parameter.'); return; };
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
                console.log('Error: ', parsedRequest.t[i].replace(' ', ''), 'is an invalid parameter for -t');
                return;
            }
        }

        for (let key of Object.keys(parsedRequest)) {
            if (key !== 'a' && key !== 'h' && key !== 'q' && key !== 't' && key !== 'e') {
                if (parsedRequest.hasOwnProperty(key)) {
                    parsedRequest[key] = parsedRequest[key].replace(' ', '');
                    let control = parsedRequest[key].split(',');
                    if (
                        control.length < 2 ||
                        isNaN(control[0]) ||
                        (isNaN(control[1]) && (control[1]) !== '*')
                    ) {
                        console.log('Error: ', parsedRequest[key], 'is an invalid parameter for -' + key);
                        return;
                    }
                }
            }
        }
        resolve();
    });
}

function sanityCheckInfo(parsedRequest) {
    return new Promise((resolve, reject) => {

        //gestione parametri invalidi
        for (key of Object.keys(parsedRequest)) {
            if (key !== 'q' && key !== 't' && key !== 'f' && key !== 'n' && key !== 'v' && key !== 'c' && key !== 'i' && key !== 'd') {
                console.log('Error:', '-' + key, 'is not a valid parameter.');
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

        for (el of parsedRequest.i.replace(' ', '').split(',')) {
            if (el !== 'edit' && el !== 'views' && el !== 'comments' && el !== 'nlinks' && el !== 'listlinks') {
                console.log('Error: ', el, 'is an invalid value for -i');
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

    /*console.log((
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
    +
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
    ));*/

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
